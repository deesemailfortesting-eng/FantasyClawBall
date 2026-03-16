import { describe, it, expect, vi } from 'vitest';
import { MatchupService } from '../src/services/matchupService.js';

describe('result finalization', () => {
  it('prevents edits after finalization without override', async () => {
    const db: any = { matchup: { findUnique: vi.fn().mockResolvedValue({ id: 'm1', status: 'finalized' }) } };
    const svc = new MatchupService(db);
    await expect(svc.finalizeMatchup('m1', { agentAScore: 1, agentBScore: 2 })).rejects.toThrow(/admin override/i);
  });
});
