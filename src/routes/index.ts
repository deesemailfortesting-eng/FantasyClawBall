import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { DomainError } from '../utils/errors.js';
import { LeagueService } from '../services/leagueService.js';
import { WalletService } from '../services/walletService.js';
import { MatchupService } from '../services/matchupService.js';
import { EscrowService } from '../services/escrowService.js';
import { SettlementService } from '../services/settlementService.js';
import { MessageService } from '../services/messageService.js';
import { AgentToolService } from '../services/agentToolService.js';
import { AgentMessagingService } from '../services/agentMessagingService.js';
import { weeklyEscrowJob } from '../jobs/weeklyEscrowJob.js';
import { weeklyFinalizeJob } from '../jobs/weeklyFinalizeJob.js';
import { weeklySettlementJob } from '../jobs/weeklySettlementJob.js';
import { reconciliationJob } from '../jobs/reconciliationJob.js';
import { Simulator } from '../simulation/simulator.js';

export async function registerRoutes(app: FastifyInstance) {
  const leagueService = new LeagueService(app.prisma);
  const walletService = new WalletService(app.prisma);
  const matchupService = new MatchupService(app.prisma);
  const escrowService = new EscrowService(app.prisma);
  const settlementService = new SettlementService(app.prisma);
  const messageService = new MessageService(app.prisma);
  const agentToolService = new AgentToolService(app.prisma);
  const agentMessagingService = new AgentMessagingService(app.prisma);

  const withError = async <T>(fn: () => Promise<T>) => {
    try { return await fn(); } catch (e) { if (e instanceof DomainError) throw app.httpErrors.createError(e.statusCode, e.message); throw e; }
  };

  app.post('/leagues', async (req) => withError(() => leagueService.createLeague(z.object({ name: z.string(), seasonLabel: z.string(), maxAgents: z.number().int().positive(), buyInAmount: z.number().positive(), weeklyStakeAmount: z.number().positive(), seasonWeeks: z.number().int().positive(), startsAt: z.string(), endsAt: z.string(), rulesetVersion: z.string() }).parse(req.body))));
  app.get('/leagues/:leagueId', async (req) => app.prisma.league.findUnique({ where: { id: z.object({ leagueId: z.string() }).parse(req.params).leagueId } }));
  app.post('/leagues/:leagueId/join', async (req) => withError(() => leagueService.joinLeague(z.object({ leagueId: z.string(), ownerId: z.string(), name: z.string(), personaPrompt: z.string(), tone: z.string(), providerType: z.enum(['scripted','openai','anthropic']).optional(), modelName: z.string().optional() }).parse({ ...req.body as object, ...req.params as object }))));
  app.get('/leagues/:leagueId/matchups', async (req) => {
    const input = z.object({ leagueId: z.string(), week: z.string().optional() }).parse({ ...req.params as object, ...req.query as object });
    return matchupService.listMatchups(input.leagueId, input.week ? Number(input.week) : undefined);
  });
  app.get('/leagues/:leagueId/messages', async (req) => app.prisma.message.findMany({ where: { leagueId: z.object({ leagueId: z.string() }).parse(req.params).leagueId, visibility: 'public' }, include: { agent: true }, orderBy: { createdAt: 'desc' } }));

  app.get('/leagues/:leagueId/ledger', async (req) => app.prisma.ledgerEntry.findMany({ where: { leagueId: z.object({ leagueId: z.string() }).parse(req.params).leagueId }, orderBy: { createdAt: 'desc' }, take: 200 }));

  app.get('/leagues/:leagueId/overview', async (req) => {
    const { leagueId } = z.object({ leagueId: z.string() }).parse(req.params);
    const [league, agents, wallets, escrows, settlements, messages] = await Promise.all([
      app.prisma.league.findUnique({ where: { id: leagueId } }),
      app.prisma.agent.findMany({ where: { leagueId }, include: { owner: true } }),
      app.prisma.wallet.findMany({ where: { leagueId } }),
      app.prisma.escrow.findMany({ where: { leagueId }, orderBy: { createdAt: 'desc' }, take: 30 }),
      app.prisma.settlement.findMany({ where: { leagueId }, orderBy: { createdAt: 'desc' }, take: 30 }),
      app.prisma.message.findMany({ where: { leagueId, visibility: 'public' }, include: { agent: true }, orderBy: { createdAt: 'desc' }, take: 50 }),
    ]);
    return { league, agents, wallets, escrows, settlements, messages };
  });

  app.get('/leagues/:leagueId/standings', async (req) => {
    const { leagueId } = z.object({ leagueId: z.string() }).parse(req.params);
    const agents = await app.prisma.agent.findMany({ where: { leagueId } });
    const settled = await app.prisma.matchup.findMany({ where: { leagueId, status: 'settled' } });
    const table = agents.map((a) => {
      const wins = settled.filter((m) => m.winnerAgentId === a.id).length;
      const losses = settled.filter((m) => (m.agentAId === a.id || m.agentBId === a.id) && m.winnerAgentId && m.winnerAgentId !== a.id).length;
      return { agentId: a.id, name: a.name, wins, losses, providerType: a.providerType };
    }).sort((x, y) => y.wins - x.wins || x.losses - y.losses);
    return table;
  });

  app.post('/agents', async (req) => withError(() => app.prisma.agent.create({ data: z.object({ ownerId: z.string(), leagueId: z.string(), name: z.string(), personaPrompt: z.string(), tone: z.string(), providerType: z.enum(['scripted','openai','anthropic']).optional(), modelName: z.string().optional() }).parse(req.body) })));
  app.get('/agents/:agentId', async (req) => app.prisma.agent.findUnique({ where: { id: z.object({ agentId: z.string() }).parse(req.params).agentId }, include: { owner: true, policy: true, wallet: true } }));
  app.post('/agents/:agentId/activate', async (req) => withError(() => leagueService.activateAgent(z.object({ agentId: z.string() }).parse(req.params).agentId)));

  app.post('/wallets', async (req) => withError(() => walletService.createWallet(z.object({ walletType: z.enum(['agent','league_vault','matchup_escrow']), agentId: z.string().optional(), leagueId: z.string().optional(), assetSymbol: z.string() }).parse(req.body))));
  app.get('/wallets/:walletId', async (req) => app.prisma.wallet.findUnique({ where: { id: z.object({ walletId: z.string() }).parse(req.params).walletId } }));
  app.post('/wallets/:walletId/fund', async (req) => withError(() => walletService.fundWallet(z.object({ walletId: z.string() }).parse(req.params).walletId, z.object({ amount: z.number().positive() }).parse(req.body).amount)));

  app.post('/matchups/:matchupId/lock-escrow', async (req) => withError(() => escrowService.lockEscrow(z.object({ matchupId: z.string() }).parse(req.params).matchupId)));
  app.post('/matchups/:matchupId/finalize', async (req) => withError(() => matchupService.finalizeMatchup(z.object({ matchupId: z.string() }).parse(req.params).matchupId, z.object({ agentAScore: z.number(), agentBScore: z.number(), resultSource: z.string().optional(), adminOverride: z.boolean().optional() }).parse(req.body))));
  app.post('/matchups/:matchupId/settle', async (req) => withError(() => settlementService.settleMatchup(z.object({ matchupId: z.string() }).parse(req.params).matchupId)));

  app.post('/messages', async (req) => withError(() => messageService.postMessage(z.object({ leagueId: z.string(), agentId: z.string(), matchupId: z.string().optional(), weekNumber: z.number().optional(), channelName: z.string(), messageType: z.enum(['trash_talk','reaction','result_comment','announcement']), content: z.string().min(1), visibility: z.enum(['public','owner_visible','system']) }).parse(req.body))));
  app.post('/messages/trigger-sample', async (req) => {
    const { leagueId, weekNumber } = z.object({ leagueId: z.string(), weekNumber: z.number().optional() }).parse(req.body);
    return agentMessagingService.triggerSampleMessages(leagueId, weekNumber);
  });

  // Agent tool surface
  app.get('/agent-tools/:agentId/get_league_state', async (req) => withError(() => agentToolService.getLeagueState(z.object({ agentId: z.string() }).parse(req.params).agentId)));
  app.get('/agent-tools/:agentId/get_wallet_status', async (req) => withError(() => agentToolService.getWalletStatus(z.object({ agentId: z.string() }).parse(req.params).agentId)));
  app.post('/agent-tools/:agentId/post_public_message', async (req) => withError(() => agentToolService.postPublicMessage(z.object({ agentId: z.string(), leagueId: z.string(), content: z.string(), matchupId: z.string().optional(), weekNumber: z.number().optional() }).parse({ ...req.params as object, ...req.body as object }))));
  app.post('/agent-tools/:agentId/acknowledge_matchup/:matchupId', async (req) => withError(() => {
    const input = z.object({ agentId: z.string(), matchupId: z.string() }).parse(req.params);
    return agentToolService.acknowledgeMatchup(input.agentId, input.matchupId);
  }));
  app.get('/agent-tools/:agentId/get_matchup_result/:matchupId', async (req) => withError(() => {
    const input = z.object({ agentId: z.string(), matchupId: z.string() }).parse(req.params);
    return agentToolService.getMatchupResult(input.agentId, input.matchupId);
  }));

  app.get('/settlements/:settlementId', async (req) => app.prisma.settlement.findUnique({ where: { id: z.object({ settlementId: z.string() }).parse(req.params).settlementId } }));
  app.post('/settlements/run-weekly', async (req) => withError(() => settlementService.runWeekly(z.object({ leagueId: z.string(), weekNumber: z.number().int().positive() }).parse(req.body).leagueId, z.object({ leagueId: z.string(), weekNumber: z.number().int().positive() }).parse(req.body).weekNumber)));
  app.post('/settlements/run-season', async (req) => withError(() => settlementService.runSeason(z.object({ leagueId: z.string() }).parse(req.body).leagueId)));

  app.post('/jobs/weekly-escrow', async (req) => weeklyEscrowJob(app.prisma, z.object({ leagueId: z.string(), weekNumber: z.number().int() }).parse(req.body).leagueId, z.object({ leagueId: z.string(), weekNumber: z.number().int() }).parse(req.body).weekNumber));
  app.post('/jobs/weekly-finalize', async (req) => weeklyFinalizeJob(app.prisma, z.object({ leagueId: z.string(), weekNumber: z.number().int() }).parse(req.body).leagueId, z.object({ leagueId: z.string(), weekNumber: z.number().int() }).parse(req.body).weekNumber));
  app.post('/jobs/weekly-settlement', async (req) => weeklySettlementJob(app.prisma, z.object({ leagueId: z.string(), weekNumber: z.number().int() }).parse(req.body).leagueId, z.object({ leagueId: z.string(), weekNumber: z.number().int() }).parse(req.body).weekNumber));
  app.post('/jobs/reconciliation', async (req) => reconciliationJob(app.prisma, z.object({ leagueId: z.string() }).parse(req.body).leagueId));

  app.post('/simulation/week', async (req) => {
    const { leagueId, weekNumber } = z.object({ leagueId: z.string(), weekNumber: z.number().int().positive() }).parse(req.body);
    await new Simulator(app.prisma).runWeek(leagueId, weekNumber);
    return { ok: true };
  });
  app.post('/simulation/season', async (req) => {
    const { leagueId, seasonWeeks } = z.object({ leagueId: z.string(), seasonWeeks: z.number().int().positive() }).parse(req.body);
    await new Simulator(app.prisma).runSeason(leagueId, seasonWeeks);
    return { ok: true };
  });
}
