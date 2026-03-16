import type { PrismaClient } from '@prisma/client';
import { DomainError } from '../utils/errors.js';

export class EscrowService {
  constructor(private db: PrismaClient) {}

  async lockEscrow(matchupId: string) {
    return this.db.$transaction(async (tx) => {
      const matchup = await tx.matchup.findUnique({ where: { id: matchupId }, include: { league: true, agentA: { include: { wallet: true } }, agentB: { include: { wallet: true } }, escrow: true } });
      if (!matchup) throw new DomainError('Matchup not found', 404);

      if (matchup.status === 'forfeit') throw new DomainError('Matchup already forfeited');
      if (matchup.escrow?.status === 'funded') return matchup.escrow;
      if (matchup.status === 'escrow_funded' && matchup.escrow) return matchup.escrow;

      const aWallet = matchup.agentA.wallet;
      const bWallet = matchup.agentB.wallet;
      if (!aWallet || !bWallet) throw new DomainError('Missing agent wallet');
      const stake = Number(matchup.league.weeklyStakeAmount);

      const aInsufficient = Number(aWallet.lockedBalance) < stake;
      const bInsufficient = Number(bWallet.lockedBalance) < stake;
      if (aInsufficient || bInsufficient) {
        let winnerAgentId = matchup.agentAId;
        if (aInsufficient && !bInsufficient) winnerAgentId = matchup.agentBId;
        if (aInsufficient && bInsufficient) winnerAgentId = matchup.agentAId < matchup.agentBId ? matchup.agentAId : matchup.agentBId;

        await tx.matchup.update({ where: { id: matchupId }, data: { status: 'forfeit', winnerAgentId } });
        await tx.message.create({
          data: {
            leagueId: matchup.leagueId,
            agentId: winnerAgentId,
            channelName: 'league-public',
            messageType: 'announcement',
            content: `Forfeit: reserve deficiency detected for matchup ${matchupId}. Winner by rule: ${winnerAgentId}.`,
            visibility: 'system',
            moderationStatus: 'approved',
          },
        });
        throw new DomainError('Insufficient reserve, matchup forfeited');
      }

      const escrowWallet = await tx.wallet.create({
        data: {
          walletType: 'matchup_escrow',
          leagueId: matchup.leagueId,
          assetSymbol: aWallet.assetSymbol,
          availableBalance: 0,
          lockedBalance: stake * 2,
        },
      });

      await tx.wallet.update({ where: { id: aWallet.id }, data: { lockedBalance: Number(aWallet.lockedBalance) - stake } });
      await tx.wallet.update({ where: { id: bWallet.id }, data: { lockedBalance: Number(bWallet.lockedBalance) - stake } });

      const escrow = await tx.escrow.upsert({
        where: { matchupId },
        update: {
          status: 'funded',
          totalLockedAmount: stake * 2,
          lockedAt: new Date(),
          escrowWalletId: escrowWallet.id,
          agentAWalletId: aWallet.id,
          agentBWalletId: bWallet.id,
        },
        create: {
          leagueId: matchup.leagueId,
          matchupId,
          escrowWalletId: escrowWallet.id,
          agentAWalletId: aWallet.id,
          agentBWalletId: bWallet.id,
          stakeAmountPerSide: stake,
          totalLockedAmount: stake * 2,
          status: 'funded',
          lockedAt: new Date(),
        },
      });

      await tx.ledgerEntry.createMany({
        data: [
          { walletId: aWallet.id, leagueId: matchup.leagueId, agentId: matchup.agentAId, amount: stake, direction: 'debit', entryType: 'weekly_lock', referenceType: 'escrow', referenceId: escrow.id, description: 'Weekly stake escrow lock A' },
          { walletId: bWallet.id, leagueId: matchup.leagueId, agentId: matchup.agentBId, amount: stake, direction: 'debit', entryType: 'weekly_lock', referenceType: 'escrow', referenceId: escrow.id, description: 'Weekly stake escrow lock B' },
          { walletId: escrowWallet.id, leagueId: matchup.leagueId, amount: stake * 2, direction: 'credit', entryType: 'weekly_lock', referenceType: 'escrow', referenceId: escrow.id, description: 'Escrow wallet funded from weekly reserves' },
        ],
      });

      await tx.matchup.update({ where: { id: matchupId }, data: { status: 'escrow_funded', escrowId: escrow.id } });
      return escrow;
    });
  }
}
