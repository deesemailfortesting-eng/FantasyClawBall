import type { PrismaClient } from '@prisma/client';
import { ProviderFactory } from '../providers/factory.js';
import { MessageService } from '../services/messageService.js';
import { weeklyEscrowJob } from '../jobs/weeklyEscrowJob.js';
import { weeklyFinalizeJob } from '../jobs/weeklyFinalizeJob.js';
import { weeklySettlementJob } from '../jobs/weeklySettlementJob.js';
import { env } from '../config/env.js';

function deterministicScore(seed: number, week: number, index: number, offset = 0) {
  const base = (seed * 31 + week * 17 + index * 13 + offset * 7) % 40;
  return 70 + base;
}

export class Simulator {
  constructor(private db: PrismaClient) {}

  async runWeek(leagueId: string, weekNumber: number, deterministic = true) {
    await weeklyEscrowJob(this.db, leagueId, weekNumber);

    if (deterministic) {
      const matchups = await this.db.matchup.findMany({ where: { leagueId, weekNumber, status: 'escrow_funded' } });
      for (let i = 0; i < matchups.length; i += 1) {
        await this.db.matchup.update({
          where: { id: matchups[i].id },
          data: {
            agentAScore: deterministicScore(env.simulationSeed, weekNumber, i, 1),
            agentBScore: deterministicScore(env.simulationSeed, weekNumber, i, 2),
            winnerAgentId: deterministicScore(env.simulationSeed, weekNumber, i, 1) >= deterministicScore(env.simulationSeed, weekNumber, i, 2) ? matchups[i].agentAId : matchups[i].agentBId,
            status: 'finalized',
            resultSource: 'deterministic_simulation',
          },
        });
      }
    } else {
      await weeklyFinalizeJob(this.db, leagueId, weekNumber);
    }

    await weeklySettlementJob(this.db, leagueId, weekNumber);

    const messageService = new MessageService(this.db);
    const agents = await this.db.agent.findMany({ where: { leagueId } });
    for (const agent of agents) {
      const provider = ProviderFactory.create(agent.providerType);
      const action = await provider.decideAction({ agent, weekNumber, leagueSummary: `Week ${weekNumber}`, recentMessages: [] });
      if (action === 'idle') continue;
      const content = await provider.generateMessage({ agent, weekNumber, leagueSummary: `Week ${weekNumber}`, recentMessages: ['rival chatter rising'] });
      await messageService.postMessage({
        leagueId,
        agentId: agent.id,
        channelName: 'league-public',
        messageType: 'trash_talk',
        content,
        visibility: 'public',
        weekNumber,
      }).catch(() => undefined);
    }
  }

  async runSeason(leagueId: string, seasonWeeks: number, deterministic = true) {
    for (let week = 1; week <= seasonWeeks; week += 1) await this.runWeek(leagueId, week, deterministic);
  }
}
