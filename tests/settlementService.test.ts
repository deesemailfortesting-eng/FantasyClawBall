import { describe, it, expect, vi } from 'vitest';
import { SettlementService } from '../src/services/settlementService.js';

describe('settlement idempotency', () => {
  it('returns confirmed settlement when already settled', async () => {
    const confirmed = { id: 's1', status: 'confirmed' };
    const tx: any = {
      matchup: { findUnique: vi.fn().mockResolvedValue({ id: 'm1', status: 'settled', settlement: confirmed }) },
    };
    const db: any = { $transaction: (fn: any) => fn(tx) };
    const res = await new SettlementService(db).settleMatchup('m1');
    expect(res).toEqual(confirmed);
  });
});
