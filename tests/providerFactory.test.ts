import { describe, it, expect } from 'vitest';
import { ProviderFactory } from '../src/providers/factory.js';

describe('provider abstraction', () => {
  it('returns scripted provider by default', () => {
    const provider = ProviderFactory.create();
    expect(provider.constructor.name).toBe('ScriptedAgentProvider');
  });
});
