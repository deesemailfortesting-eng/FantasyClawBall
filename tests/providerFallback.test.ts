import { describe, it, expect } from 'vitest';
import { OpenAIProvider } from '../src/providers/openaiProvider.js';
import { AnthropicProvider } from '../src/providers/anthropicProvider.js';

describe('provider fallback behavior', () => {
  it('openai provider falls back without key', async () => {
    const out = await new OpenAIProvider().generateMessage({ agent: { name: 'A1' } as any, leagueSummary: 'x', recentMessages: [] });
    expect(out).toContain('fallback');
  });

  it('anthropic provider falls back without key', async () => {
    const out = await new AnthropicProvider().generateMessage({ agent: { name: 'A2' } as any, leagueSummary: 'x', recentMessages: [] });
    expect(out).toContain('fallback');
  });
});
