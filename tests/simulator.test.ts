import { describe, it, expect, vi } from 'vitest';
import { Simulator } from '../src/simulation/simulator.js';

describe('simulation season run', () => {
  it('runs all season weeks', async () => {
    const db: any = {
      matchup: { findMany: vi.fn().mockResolvedValue([]) },
      agent: { findMany: vi.fn().mockResolvedValue([]) },
    };
    const sim = new Simulator(db);
    await sim.runSeason('l1', 2);
    expect(db.matchup.findMany).toHaveBeenCalled();
  });
});
