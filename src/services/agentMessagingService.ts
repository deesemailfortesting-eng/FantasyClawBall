import type { MessageType, PrismaClient, Agent } from '@prisma/client';
import { ProviderFactory } from '../providers/factory.js';
import { MessageService } from './messageService.js';

const messageTypeByTemplate: Record<'pre_match'|'post_result'|'rivalry_banter'|'announcement', MessageType> = {
  pre_match: 'trash_talk',
  post_result: 'reaction',
  rivalry_banter: 'trash_talk',
  announcement: 'announcement',
};

export class AgentMessagingService {
  private messageService: MessageService;

  constructor(private db: PrismaClient) {
    this.messageService = new MessageService(db);
  }

  private buildPrompt(template: 'pre_match'|'post_result'|'rivalry_banter'|'announcement', agent: Agent, context: {
    weekNumber?: number;
    matchupSummary?: string;
    recentEvents: string[];
  }) {
    const base = `You are ${agent.name}. Persona: ${agent.personaPrompt}. Tone: ${agent.tone}. Rivalry notes: ${agent.rivalryNotes ?? 'none'}.`;
    const constraints = 'Write one short playful message. Keep it clean: no slurs, hate, threats, sexual content, doxxing, spam, or violence.';
    const events = `Recent league events: ${context.recentEvents.join(' | ') || 'none'}.`;

    switch (template) {
      case 'pre_match':
        return `${base} Pre-match trash talk for week ${context.weekNumber ?? '?'} against ${context.matchupSummary ?? 'your opponent'}. ${events} ${constraints}`;
      case 'post_result':
        return `${base} Post-result reaction for week ${context.weekNumber ?? '?'}, matchup: ${context.matchupSummary ?? 'n/a'}. ${events} ${constraints}`;
      case 'rivalry_banter':
        return `${base} Rivalry banter for ${context.matchupSummary ?? 'a rival agent'}. ${events} ${constraints}`;
      case 'announcement':
        return `${base} Commissioner-style system announcement for week ${context.weekNumber ?? '?'}. ${events} ${constraints}`;
      default:
        return `${base} ${events} ${constraints}`;
    }
  }

  async generateAndPost(input: {
    agentId: string;
    leagueId: string;
    template: 'pre_match'|'post_result'|'rivalry_banter'|'announcement';
    weekNumber?: number;
    matchupId?: string;
    matchupSummary?: string;
    recentEvents?: string[];
  }) {
    const agent = await this.db.agent.findUnique({ where: { id: input.agentId } });
    if (!agent) throw new Error('Agent not found');
    const provider = ProviderFactory.create(agent.providerType);
    const prompt = this.buildPrompt(input.template, agent, {
      weekNumber: input.weekNumber,
      matchupSummary: input.matchupSummary,
      recentEvents: input.recentEvents ?? [],
    });

    const content = await provider.generateMessage({
      agent,
      weekNumber: input.weekNumber,
      leagueSummary: prompt,
      recentMessages: input.recentEvents ?? [],
    });

    return this.messageService.postMessage({
      leagueId: input.leagueId,
      agentId: input.agentId,
      matchupId: input.matchupId,
      weekNumber: input.weekNumber,
      channelName: 'league-public',
      messageType: messageTypeByTemplate[input.template],
      content,
      visibility: 'public',
    });
  }

  async triggerSampleMessages(leagueId: string, weekNumber?: number) {
    const matchups = await this.db.matchup.findMany({ where: { leagueId, ...(weekNumber ? { weekNumber } : {}) }, include: { agentA: true, agentB: true } });
    const recentEvents = ['Escrow checks complete', 'Rivalries heating up', 'Commissioner reminder: keep it playful'];
    const results = [];
    for (const matchup of matchups.slice(0, 6)) {
      results.push(await this.generateAndPost({
        leagueId,
        agentId: matchup.agentAId,
        template: 'pre_match',
        weekNumber: matchup.weekNumber,
        matchupId: matchup.id,
        matchupSummary: `${matchup.agentA.name} vs ${matchup.agentB.name}`,
        recentEvents,
      }).catch(() => null));
      results.push(await this.generateAndPost({
        leagueId,
        agentId: matchup.agentBId,
        template: 'rivalry_banter',
        weekNumber: matchup.weekNumber,
        matchupId: matchup.id,
        matchupSummary: `${matchup.agentB.name} vs ${matchup.agentA.name}`,
        recentEvents,
      }).catch(() => null));
    }
    return results.filter(Boolean);
  }
}
