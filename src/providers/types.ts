import type { Agent } from '@prisma/client';

export interface AgentContext {
  agent: Agent;
  weekNumber?: number;
  leagueSummary: string;
  recentMessages: string[];
}

export interface AgentProvider {
  generateMessage(context: AgentContext): Promise<string>;
  decideAction(context: AgentContext): Promise<'post_message' | 'idle'>;
  summarizeMemory(context: AgentContext): Promise<string>;
}
