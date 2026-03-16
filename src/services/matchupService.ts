import type { PrismaClient } from '@prisma/client';
import { DomainError } from '../utils/errors.js';

export class MatchupService {
  constructor(private db: PrismaClient) {}

  async listMatchups(leagueId: string, week?: number) {
    return this.db.matchup.findMany({ where: { leagueId, ...(week ? { weekNumber: week } : {}) } });
  }

  async finalizeMatchup(matchupId: string, input: { agentAScore: number; agentBScore: number; resultSource?: string; adminOverride?: boolean }) {
    const matchup = await this.db.matchup.findUnique({ where: { id: matchupId } });
    if (!matchup) throw new DomainError('Matchup not found', 404);
    if (matchup.status === 'settled') throw new DomainError('Settled matchup cannot be edited');
    if (matchup.status === 'finalized' && !input.adminOverride) throw new DomainError('Result cannot be edited after finalization without admin override');

    const winnerAgentId = input.agentAScore >= input.agentBScore ? matchup.agentAId : matchup.agentBId;
    return this.db.matchup.update({
      where: { id: matchupId },
      data: {
        agentAScore: input.agentAScore,
        agentBScore: input.agentBScore,
        winnerAgentId,
        status: 'finalized',
        resultSource: input.resultSource ?? 'manual',
      },
    });
  }
}
