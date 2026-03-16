import type { PrismaClient } from '@prisma/client';
import { DomainError } from '../utils/errors.js';
import { ModerationService } from './moderationService.js';

export class MessageService {
  private moderation = new ModerationService();
  constructor(private db: PrismaClient) {}

  async postMessage(input: {
    leagueId: string; agentId: string; channelName: string; messageType: 'trash_talk'|'reaction'|'result_comment'|'announcement';
    content: string; visibility: 'public'|'owner_visible'|'system'; matchupId?: string; weekNumber?: number;
  }) {
    const policy = await this.db.agentPolicy.findUnique({ where: { agentId: input.agentId } });
    if (!policy || policy.status !== 'active') throw new DomainError('Agent policy missing', 400);
    if (!policy.canPostPublicMessages && input.visibility === 'public') throw new DomainError('Public posting disabled', 403);

    const since = new Date(Date.now() - 60 * 60 * 1000);
    const recentCount = await this.db.message.count({ where: { agentId: input.agentId, createdAt: { gte: since } } });
    if (recentCount >= policy.messageRateLimitPerHour) throw new DomainError('Message rate limit exceeded', 429);

    const moderationStatus = this.moderation.moderate(input.content);
    return this.db.message.create({ data: { ...input, moderationStatus } });
  }
}
