import type { PrismaClient } from '@prisma/client';
import { DomainError } from '../utils/errors.js';

export class SettlementService {
  constructor(private db: PrismaClient) {}

  async settleMatchup(matchupId: string, triggerSource = 'manual') {
    return this.db.$transaction(async (tx) => {
      const matchup = await tx.matchup.findUnique({ where: { id: matchupId }, include: { escrow: true, winner: { include: { wallet: true } }, settlement: true } });
      if (!matchup) throw new DomainError('Matchup not found', 404);
      if (matchup.settlement?.status === 'confirmed' || matchup.status === 'settled') return matchup.settlement;
      if (matchup.status === 'forfeit') throw new DomainError('Forfeit matchup cannot be settled as escrow payout');
      if (matchup.status !== 'finalized') throw new DomainError('Matchup must be finalized before settlement');
      if (!matchup.escrow || matchup.escrow.status !== 'funded') throw new DomainError('Escrow must be funded before settlement');
      if (!matchup.winner?.wallet) throw new DomainError('Winner wallet missing');

      const idempotencyKey = `weekly:${matchup.id}`;
      const existing = await tx.settlement.findUnique({ where: { idempotencyKey } });
      if (existing?.status === 'confirmed') return existing;

      const settlement = existing ?? await tx.settlement.create({
        data: {
          leagueId: matchup.leagueId,
          matchupId: matchup.id,
          settlementType: 'weekly_matchup',
          winnerAgentId: matchup.winnerAgentId,
          fromWalletId: matchup.escrow.escrowWalletId,
          toWalletId: matchup.winner.wallet.id,
          amount: Number(matchup.escrow.totalLockedAmount),
          status: 'submitted',
          idempotencyKey,
          triggerSource,
        },
      });

      await tx.wallet.update({
        where: { id: matchup.winner.wallet.id },
        data: { availableBalance: Number(matchup.winner.wallet.availableBalance) + Number(matchup.escrow.totalLockedAmount) },
      });
      await tx.wallet.update({ where: { id: matchup.escrow.escrowWalletId }, data: { lockedBalance: 0, availableBalance: 0 } });
      await tx.escrow.update({ where: { matchupId: matchup.id }, data: { status: 'released', releasedAt: new Date() } });

      await tx.ledgerEntry.createMany({
        data: [
          {
            walletId: matchup.winner.wallet.id,
            leagueId: matchup.leagueId,
            agentId: matchup.winnerAgentId!,
            amount: Number(matchup.escrow.totalLockedAmount),
            direction: 'credit',
            entryType: 'escrow_release',
            referenceType: 'settlement',
            referenceId: settlement.id,
            description: 'Weekly matchup escrow release (winner credit)',
          },
          {
            walletId: matchup.escrow.escrowWalletId,
            leagueId: matchup.leagueId,
            amount: Number(matchup.escrow.totalLockedAmount),
            direction: 'debit',
            entryType: 'escrow_release',
            referenceType: 'settlement',
            referenceId: settlement.id,
            description: 'Weekly matchup escrow release (escrow debit)',
          },
        ],
      });

      await tx.settlement.update({ where: { id: settlement.id }, data: { status: 'confirmed' } });
      await tx.matchup.update({ where: { id: matchup.id }, data: { status: 'settled', settlementId: settlement.id } });
      return settlement;
    });
  }

  async runWeekly(leagueId: string, weekNumber: number) {
    const matchups = await this.db.matchup.findMany({ where: { leagueId, weekNumber } });
    return Promise.all(matchups.map((m) => this.settleMatchup(m.id, 'weekly_job').catch(() => null)));
  }

  async runSeason(leagueId: string) {
    const league = await this.db.league.findUnique({ where: { id: leagueId } });
    if (!league) throw new DomainError('League not found', 404);

    const wins = await this.db.matchup.groupBy({ by: ['winnerAgentId'], where: { leagueId, status: { in: ['settled', 'forfeit'] } }, _count: true });
    const top = wins.filter((w) => w.winnerAgentId).sort((a, b) => b._count - a._count || String(a.winnerAgentId).localeCompare(String(b.winnerAgentId)))[0];
    if (!top?.winnerAgentId) throw new DomainError('No season winner determined yet');

    const idempotencyKey = `season:${leagueId}:prize`;
    const existing = await this.db.settlement.findUnique({ where: { idempotencyKey } });
    if (existing?.status === 'confirmed') return existing;

    const winnerWallet = await this.db.wallet.findUnique({ where: { agentId: top.winnerAgentId } });
    if (!winnerWallet) throw new DomainError('Winner wallet missing');

    const prizePool = Number(league.buyInAmount) * Number(league.maxAgents);
    const leagueVault = await this.db.wallet.upsert({
      where: { id: `league_vault_${leagueId}` },
      update: {},
      create: {
        id: `league_vault_${leagueId}`,
        walletType: 'league_vault',
        leagueId,
        assetSymbol: winnerWallet.assetSymbol,
        availableBalance: prizePool,
        lockedBalance: 0,
      },
    });

    return this.db.$transaction(async (tx) => {
      const settlement = existing ?? await tx.settlement.create({
        data: {
          leagueId,
          settlementType: 'season_prize',
          winnerAgentId: top.winnerAgentId!,
          fromWalletId: leagueVault.id,
          toWalletId: winnerWallet.id,
          amount: prizePool,
          status: 'submitted',
          idempotencyKey,
          triggerSource: 'season_job',
        },
      });

      await tx.wallet.update({ where: { id: leagueVault.id }, data: { availableBalance: Math.max(0, Number(leagueVault.availableBalance) - prizePool) } });
      await tx.wallet.update({ where: { id: winnerWallet.id }, data: { availableBalance: Number(winnerWallet.availableBalance) + prizePool } });

      await tx.ledgerEntry.createMany({
        data: [
          { walletId: leagueVault.id, leagueId, amount: prizePool, direction: 'debit', entryType: 'prize_payout', referenceType: 'settlement', referenceId: settlement.id, description: 'Season prize vault debit' },
          { walletId: winnerWallet.id, leagueId, agentId: top.winnerAgentId!, amount: prizePool, direction: 'credit', entryType: 'prize_payout', referenceType: 'settlement', referenceId: settlement.id, description: 'Season prize winner credit' },
        ],
      });

      await tx.settlement.update({ where: { id: settlement.id }, data: { status: 'confirmed' } });
      await tx.league.update({ where: { id: leagueId }, data: { status: 'completed' } });
      return settlement;
    });
  }
}
