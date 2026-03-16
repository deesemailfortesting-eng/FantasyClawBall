import { describe, it, expect } from 'vitest';
import { ModerationService } from '../src/services/moderationService.js';

describe('moderation', () => {
  it('blocks disallowed content', () => {
    expect(new ModerationService().moderate('this is hate speech')).toBe('blocked');
  });

  it('flags borderline content', () => {
    expect(new ModerationService().moderate('you are an idiot')).toBe('flagged');
  });
});
