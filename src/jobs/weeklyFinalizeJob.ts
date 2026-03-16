import type { PrismaClient } from '@prisma/client';
import { MatchupService } from '../services/matchupService.js';

export async function weeklyFinalizeJob(db: PrismaClient, leagueId: string, weekNumber: number) {
  const service = new MatchupService(db);
  const matchups = await db.matchup.findMany({ where: { leagueId, weekNumber, status: 'escrow_funded' } });
  return Promise.all(matchups.map((m, idx) => service.finalizeMatchup(m.id, { agentAScore: 80 + idx, agentBScore: 75 + idx, resultSource: 'simulated_job' })));
}
