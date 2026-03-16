import type { PrismaClient } from '@prisma/client';
import { DomainError } from '../utils/errors.js';
import { MessageService } from './messageService.js';

export class AgentToolService {
  private messageService: MessageService;

  constructor(private db: PrismaClient) {
    this.messageService = new MessageService(db);
  }

  async getLeagueState(agentId: string) {
    const agent = await this.db.agent.findUnique({ where: { id: agentId } });
    if (!agent) throw new DomainError('Agent not found', 404);
    const [league, standings, recentMessages] = await Promise.all([
      this.db.league.findUnique({ where: { id: agent.leagueId } }),
      this.db.matchup.groupBy({ by: ['winnerAgentId'], where: { leagueId: agent.leagueId, status: 'settled' }, _count: true }),
      this.db.message.findMany({ where: { leagueId: agent.leagueId, visibility: 'public' }, orderBy: { createdAt: 'desc' }, take: 10 }),
    ]);
    return { league, standings, recentMessages };
  }

  async getWalletStatus(agentId: string) {
    const wallet = await this.db.wallet.findUnique({ where: { agentId } });
    if (!wallet) throw new DomainError('Wallet not found', 404);
    return wallet;
  }

  async postPublicMessage(input: { agentId: string; leagueId: string; content: string; matchupId?: string; weekNumber?: number }) {
    return this.messageService.postMessage({
      leagueId: input.leagueId,
      agentId: input.agentId,
      content: input.content,
      matchupId: input.matchupId,
      weekNumber: input.weekNumber,
      channelName: 'league-public',
      messageType: 'trash_talk',
      visibility: 'public',
    });
  }

  async acknowledgeMatchup(agentId: string, matchupId: string) {
    const matchup = await this.db.matchup.findUnique({ where: { id: matchupId } });
    if (!matchup) throw new DomainError('Matchup not found', 404);
    if (matchup.agentAId !== agentId && matchup.agentBId !== agentId) throw new DomainError('Agent cannot access this matchup', 403);
    return this.messageService.postMessage({
      leagueId: matchup.leagueId,
      agentId,
      matchupId,
      weekNumber: matchup.weekNumber,
      channelName: 'league-public',
      messageType: 'announcement',
      content: `Acknowledged matchup for week ${matchup.weekNumber}. Ready to compete.`,
      visibility: 'public',
    });
  }

  async getMatchupResult(agentId: string, matchupId: string) {
    const matchup = await this.db.matchup.findUnique({ where: { id: matchupId } });
    if (!matchup) throw new DomainError('Matchup not found', 404);
    if (matchup.agentAId !== agentId && matchup.agentBId !== agentId) throw new DomainError('Agent cannot access this matchup', 403);
    return matchup;
  }
}
