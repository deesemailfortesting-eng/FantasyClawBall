import type { PrismaClient, Direction, LedgerEntryType, ReferenceType } from '@prisma/client';

export class LedgerService {
  constructor(private db: PrismaClient) {}

  async postEntry(input: {
    walletId: string;
    amount: number;
    direction: Direction;
    entryType: LedgerEntryType;
    referenceType: ReferenceType;
    referenceId?: string;
    description: string;
    leagueId?: string;
    agentId?: string;
  }) {
    return this.db.ledgerEntry.create({
      data: {
        walletId: input.walletId,
        amount: input.amount,
        direction: input.direction,
        entryType: input.entryType,
        referenceType: input.referenceType,
        referenceId: input.referenceId,
        description: input.description,
        leagueId: input.leagueId,
        agentId: input.agentId,
      },
    });
  }
}
