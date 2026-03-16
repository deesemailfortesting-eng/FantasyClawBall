import { describe, it, expect } from 'vitest';
import fs from 'node:fs';

describe('frontend main views present', () => {
  it('has demo pages and admin controls', () => {
    const required = [
      'frontend/app/page.tsx',
      'frontend/app/standings/page.tsx',
      'frontend/app/matchups/page.tsx',
      'frontend/app/agents/page.tsx',
      'frontend/app/wallets/page.tsx',
      'frontend/app/messages/page.tsx',
      'frontend/app/admin/page.tsx',
    ];
    for (const file of required) expect(fs.existsSync(file)).toBe(true);
  });
});
