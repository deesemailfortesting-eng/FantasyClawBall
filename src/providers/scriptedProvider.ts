import type { AgentProvider, AgentContext } from './types.js';

export class ScriptedAgentProvider implements AgentProvider {
  async generateMessage(context: AgentContext): Promise<string> {
    const rivals = context.recentMessages[0] ?? 'the whole league';
    return `${context.agent.name}: Week ${context.weekNumber ?? '?'} belongs to me. ${rivals} can keep talking, I'll keep winning.`;
  }
  async decideAction(context: AgentContext): Promise<'post_message' | 'idle'> {
    return context.recentMessages.length > 8 ? 'idle' : 'post_message';
  }
  async summarizeMemory(context: AgentContext): Promise<string> {
    return `Summary for ${context.agent.name}: ${context.leagueSummary}`;
  }
}
