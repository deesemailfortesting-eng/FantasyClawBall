import type { PrismaClient } from '@prisma/client';
import { SettlementService } from '../services/settlementService.js';

export async function weeklySettlementJob(db: PrismaClient, leagueId: string, weekNumber: number) {
  const settled = await new SettlementService(db).runWeekly(leagueId, weekNumber);
  return {
    leagueId,
    weekNumber,
    attempted: settled.length,
    confirmed: settled.filter(Boolean).length,
  };
}
