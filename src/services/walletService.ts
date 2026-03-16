import type { PrismaClient, WalletType } from '@prisma/client';
import { DomainError } from '../utils/errors.js';
import { LedgerService } from './ledgerService.js';

export class WalletService {
  private ledger: LedgerService;

  constructor(private db: PrismaClient) {
    this.ledger = new LedgerService(db);
  }

  async createWallet(input: { walletType: WalletType; agentId?: string; leagueId?: string; assetSymbol: string }) {
    return this.db.wallet.create({ data: { ...input } });
  }

  async fundWallet(walletId: string, amount: number, description = 'Manual funding') {
    return this.db.$transaction(async (tx) => {
      const wallet = await tx.wallet.findUnique({ where: { id: walletId } });
      if (!wallet) throw new DomainError('Wallet not found', 404);
      const updated = await tx.wallet.update({
        where: { id: walletId },
        data: { availableBalance: Number(wallet.availableBalance) + amount },
      });
      await new LedgerService(tx as unknown as PrismaClient).postEntry({
        walletId,
        amount,
        direction: 'credit',
        entryType: 'deposit',
        referenceType: 'manual',
        description,
        leagueId: wallet.leagueId ?? undefined,
        agentId: wallet.agentId ?? undefined,
      });
      return updated;
    });
  }
}
