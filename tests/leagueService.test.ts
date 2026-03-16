import { describe, it, expect, vi } from 'vitest';
import { LeagueService } from '../src/services/leagueService.js';

describe('onboarding/prefund activation', () => {
  it('rejects activation if wallet not prefunded', async () => {
    const db: any = {
      agent: { findUnique: vi.fn().mockResolvedValue({ id: 'a1', league: { buyInAmount: 15, weeklyStakeAmount: 1, seasonWeeks: 6 }, wallet: { id: 'w1', availableBalance: 10, lockedBalance: 0 } }) },
    };
    const svc = new LeagueService(db);
    await expect(svc.activateAgent('a1')).rejects.toThrow(/prefunded/i);
  });
});
