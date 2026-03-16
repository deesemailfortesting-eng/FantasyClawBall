import { describe, it, expect } from 'vitest';
import { buildApp } from '../src/app.js';

describe('core API route presence', () => {
  it('registers demo-critical endpoints', async () => {
    const app = buildApp();
    const checks = [
      { method: 'GET', url: '/leagues/demo/overview' },
      { method: 'GET', url: '/leagues/demo/standings' },
      { method: 'GET', url: '/leagues/demo/ledger' },
      { method: 'POST', url: '/messages/trigger-sample', payload: { leagueId: 'demo' } },
      { method: 'GET', url: '/agent-tools/a1/get_wallet_status' },
    ] as const;

    for (const c of checks) {
      const res = await app.inject(c as any);
      expect(res.statusCode).not.toBe(404);
    }
  });
});
