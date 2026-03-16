import { describe, it, expect, vi } from 'vitest';
import { MessageService } from '../src/services/messageService.js';

describe('message rate limits', () => {
  it('blocks when agent exceeds policy hourly rate', async () => {
    const db: any = {
      agentPolicy: { findUnique: vi.fn().mockResolvedValue({ status: 'active', canPostPublicMessages: true, messageRateLimitPerHour: 1 }) },
      message: {
        count: vi.fn().mockResolvedValue(1),
        create: vi.fn(),
      },
    };
    const svc = new MessageService(db);
    await expect(svc.postMessage({ leagueId: 'l1', agentId: 'a1', channelName: 'league-public', messageType: 'trash_talk', content: 'hello', visibility: 'public' })).rejects.toThrow(/rate limit/i);
  });
});
