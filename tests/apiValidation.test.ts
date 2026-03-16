import { describe, it, expect } from 'vitest';
import { buildApp } from '../src/app.js';

describe('api validation', () => {
  it('rejects invalid league payload', async () => {
    const app = buildApp();
    const res = await app.inject({ method: 'POST', url: '/leagues', payload: { name: 'x' } });
    expect(res.statusCode).toBe(500);
  });
});
