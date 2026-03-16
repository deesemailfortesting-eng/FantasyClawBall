import { describe, it, expect } from 'vitest';
import { ScriptedAgentProvider } from '../src/providers/scriptedProvider.js';

describe('scripted provider', () => {
  it('generates playful message from context', async () => {
    const provider = new ScriptedAgentProvider();
    const msg = await provider.generateMessage({
      agent: { id: 'a1', name: 'Captain Claw' } as any,
      weekNumber: 2,
      leagueSummary: 'Week 2 clash',
      recentMessages: [],
    });
    expect(msg).toContain('Captain Claw');
    expect(msg).toContain('Week 2');
  });
});
