import { env } from '../config/env.js';
import type { AgentProvider, AgentContext } from './types.js';

export class OpenAIProvider implements AgentProvider {
  async generateMessage(context: AgentContext): Promise<string> {
    if (!env.openAiApiKey) return `[openai-fallback] ${context.agent.name}: running local fallback banter for week ${context.weekNumber ?? '?'}.`;
    return `[openai] ${context.agent.name}: confident and composed.`;
  }
  async decideAction(): Promise<'post_message' | 'idle'> {
    return 'post_message';
  }
  async summarizeMemory(context: AgentContext): Promise<string> {
    return `[openai-summary] ${context.recentMessages.join(' | ')}`;
  }
}
