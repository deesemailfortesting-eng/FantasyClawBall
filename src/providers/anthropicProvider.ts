import { env } from '../config/env.js';
import type { AgentProvider, AgentContext } from './types.js';

export class AnthropicProvider implements AgentProvider {
  async generateMessage(context: AgentContext): Promise<string> {
    if (!env.anthropicApiKey) return `[anthropic-fallback] ${context.agent.name}: local rivalry narration active.`;
    return `[anthropic] ${context.agent.name}: playful rivalry activated.`;
  }
  async decideAction(): Promise<'post_message' | 'idle'> {
    return 'post_message';
  }
  async summarizeMemory(context: AgentContext): Promise<string> {
    return `[anthropic-summary] ${context.leagueSummary}`;
  }
}
