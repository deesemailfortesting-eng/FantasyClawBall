import type { ProviderType } from '@prisma/client';
import { AnthropicProvider } from './anthropicProvider.js';
import { OpenAIProvider } from './openaiProvider.js';
import { ScriptedAgentProvider } from './scriptedProvider.js';
import type { AgentProvider } from './types.js';

export class ProviderFactory {
  static create(providerType?: ProviderType | null): AgentProvider {
    switch (providerType) {
      case 'openai':
        return new OpenAIProvider();
      case 'anthropic':
        return new AnthropicProvider();
      case 'scripted':
      default:
        return new ScriptedAgentProvider();
    }
  }
}
