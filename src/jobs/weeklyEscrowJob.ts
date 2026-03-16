import type { PrismaClient } from '@prisma/client';
import { EscrowService } from '../services/escrowService.js';

export async function weeklyEscrowJob(db: PrismaClient, leagueId: string, weekNumber: number) {
  const service = new EscrowService(db);
  const matchups = await db.matchup.findMany({ where: { leagueId, weekNumber, status: { in: ['scheduled', 'escrow_pending', 'escrow_funded'] } } });
  const results = await Promise.all(matchups.map((m) => service.lockEscrow(m.id).then(() => ({ matchupId: m.id, status: 'ok' })).catch((e) => ({ matchupId: m.id, status: 'error', message: e.message }))));
  return {
    leagueId,
    weekNumber,
    attempted: matchups.length,
    succeeded: results.filter((r) => r.status === 'ok').length,
    results,
  };
}
