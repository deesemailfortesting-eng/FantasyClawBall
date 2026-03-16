import { describe, it, expect, vi } from 'vitest';
import { weeklyEscrowJob } from '../src/jobs/weeklyEscrowJob.js';

describe('double-run job protection', () => {
  it('returns summary and tolerates repeated escrow lock attempts', async () => {
    const db: any = {
      matchup: { findMany: vi.fn().mockResolvedValue([{ id: 'm1' }]) },
      $transaction: (fn: any) => fn({
        matchup: { findUnique: vi.fn().mockResolvedValue({ id: 'm1', status: 'escrow_funded', escrow: { id: 'e1', status: 'funded' } }) },
      }),
    };
    const result = await weeklyEscrowJob(db, 'l1', 1);
    expect(result.attempted).toBe(1);
    expect(result.succeeded).toBe(1);
  });
});
