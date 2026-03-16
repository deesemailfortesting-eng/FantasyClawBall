import type { PrismaClient } from '@prisma/client';

export async function reconciliationJob(db: PrismaClient, leagueId: string) {
  const wallets = await db.wallet.findMany({ where: { leagueId } });
  const report = [] as Array<{ walletId: string; cachedTotal: number; ledgerNet: number; delta: number; ok: boolean }>;

  for (const wallet of wallets) {
    const entries = await db.ledgerEntry.findMany({ where: { walletId: wallet.id } });
    const ledgerNet = entries.reduce((acc, e) => acc + (e.direction === 'credit' ? Number(e.amount) : -Number(e.amount)), 0);
    const cachedTotal = Number(wallet.availableBalance) + Number(wallet.lockedBalance);
    const delta = Number((cachedTotal - ledgerNet).toFixed(2));
    report.push({ walletId: wallet.id, cachedTotal, ledgerNet, delta, ok: Math.abs(delta) < 0.0001 });
  }

  return {
    leagueId,
    checkedAt: new Date().toISOString(),
    walletCount: report.length,
    mismatches: report.filter((r) => !r.ok).length,
    wallets: report,
  };
}
