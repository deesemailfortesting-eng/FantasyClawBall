import Fastify from 'fastify';
import sensible from '@fastify/sensible';
import { prisma } from './db/prisma.js';
import { registerRoutes } from './routes/index.js';

declare module 'fastify' {
  interface FastifyInstance {
    prisma: typeof prisma;
  }
}

export function buildApp() {
  const app = Fastify({ logger: true });
  app.register(sensible);
  app.decorate('prisma', prisma);
  app.register(registerRoutes);
  app.get('/health', async () => ({ ok: true }));
  return app;
}
