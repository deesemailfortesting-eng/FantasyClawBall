import { describe, it, expect, vi } from 'vitest';
import { EscrowService } from '../src/services/escrowService.js';

describe('escrow lock idempotency + forfeit', () => {
  it('returns existing funded escrow without double funding', async () => {
    const tx: any = {
      matchup: { findUnique: vi.fn().mockResolvedValue({ id: 'm1', status: 'escrow_funded', escrow: { id: 'e1', status: 'funded' } }) },
    };
    const db: any = { $transaction: (fn: any) => fn(tx) };
    const res = await new EscrowService(db).lockEscrow('m1');
    expect(res.id).toBe('e1');
  });

  it('marks forfeit on reserve deficiency', async () => {
    const tx: any = {
      matchup: {
        findUnique: vi.fn().mockResolvedValue({
          id: 'm2', leagueId: 'l1', status: 'scheduled',
          agentAId: 'a1', agentBId: 'a2',
          league: { weeklyStakeAmount: 1 },
          agentA: { wallet: { id: 'w1', lockedBalance: 0, assetSymbol: 'USDC' } },
          agentB: { wallet: { id: 'w2', lockedBalance: 1, assetSymbol: 'USDC' } },
          escrow: null,
        }),
        update: vi.fn().mockResolvedValue({}),
      },
      message: { create: vi.fn().mockResolvedValue({}) },
    };
    const db: any = { $transaction: (fn: any) => fn(tx) };
    await expect(new EscrowService(db).lockEscrow('m2')).rejects.toThrow(/forfeited/i);
    expect(tx.matchup.update).toHaveBeenCalled();
  });
});
