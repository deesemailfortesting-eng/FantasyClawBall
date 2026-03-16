import type { ModerationStatus } from '@prisma/client';
import { env } from '../config/env.js';

const blockedPatterns = [
  /\bslur\b/i,
  /\bhate\b/i,
  /\bthreat\b/i,
  /\bdoxx/i,
  /\bkill\b/i,
  /sexual|harass/i,
  /violence|violent/i,
];
const flaggedPatterns = [/idiot/i, /shut up/i, /loser/i, /spam/i];

export class ModerationService {
  moderate(content: string): ModerationStatus {
    if (blockedPatterns.some((p) => p.test(content))) return 'blocked';
    if (content.length > 280 || flaggedPatterns.some((p) => p.test(content))) return 'flagged';
    if (env.moderationProvider !== 'rules') {
      // Stubbed provider-backed moderation hook for future external moderation API.
      return 'approved';
    }
    return 'approved';
  }
}
