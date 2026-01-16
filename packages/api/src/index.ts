import Fastify from 'fastify';
import cors from '@fastify/cors';
import cookie from '@fastify/cookie';
import session from '@fastify/session';
import fastifyStatic from '@fastify/static';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { existsSync } from 'fs';

import { ensureDatabase, prisma } from './lib/db.js';
import { initializeAuth } from './lib/auth.js';
import { templateRoutes } from './routes/templates.js';
import { instanceRoutes } from './routes/instances.js';
import { authRoutes } from './routes/auth.js';
import { processFailedInstances, generateInstancesForRange } from './lib/instance-generator.js';
import { getToday, getTomorrow } from './lib/scheduler.js';
import { addMonths } from 'date-fns';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const PORT = parseInt(process.env.APP_PORT || '3000', 10);
const SESSION_SECRET = process.env.SESSION_SECRET || 'change-me-in-production-please-32-chars';

async function buildServer() {
  const fastify = Fastify({
    logger: {
      level: process.env.NODE_ENV === 'production' ? 'info' : 'debug',
    },
  });

  // CORS
  await fastify.register(cors, {
    origin: true,
    credentials: true,
  });

  // Cookie & Session
  await fastify.register(cookie);
  await fastify.register(session, {
    secret: SESSION_SECRET.padEnd(32, '0').slice(0, 32),
    cookie: {
      secure: process.env.NODE_ENV === 'production' && process.env.HTTPS === 'true',
      httpOnly: true,
      maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
    },
    saveUninitialized: false,
  });

  // Auth middleware for API routes (except auth routes)
  fastify.addHook('preHandler', async (request, reply) => {
    const url = request.url;

    // Skip auth for these routes
    if (
      url.startsWith('/api/auth/') ||
      url === '/api/health' ||
      !url.startsWith('/api/')
    ) {
      return;
    }

    const authenticated = (request.session as any).authenticated === true;
    if (!authenticated) {
      return reply.status(401).send({ error: 'Not authenticated' });
    }
  });

  // Health check
  fastify.get('/api/health', async () => {
    return { status: 'ok', timestamp: new Date().toISOString() };
  });

  // API Routes
  await fastify.register(async (api) => {
    await api.register(authRoutes);
    await api.register(templateRoutes);
    await api.register(instanceRoutes);
  }, { prefix: '/api' });

  // Serve static frontend files in production
  const webDistPath = join(__dirname, '../../web/dist');
  if (existsSync(webDistPath)) {
    await fastify.register(fastifyStatic, {
      root: webDistPath,
      prefix: '/',
    });

    // SPA fallback
    fastify.setNotFoundHandler((request, reply) => {
      if (request.url.startsWith('/api/')) {
        return reply.status(404).send({ error: 'Not found' });
      }
      return reply.sendFile('index.html');
    });
  }

  return fastify;
}

async function runDailyJob() {
  console.log('Running daily job: Processing failed instances and generating new ones...');
  try {
    const failedCount = await processFailedInstances();
    console.log(`Marked ${failedCount} instances as failed`);

    const today = getToday();
    const endDate = addMonths(today, 2);
    const generated = await generateInstancesForRange(today, endDate);
    console.log(`Generated ${generated.length} new instances`);
  } catch (error) {
    console.error('Daily job failed:', error);
  }
}

async function main() {
  try {
    // Initialize database
    await ensureDatabase();

    // Initialize auth (create default password if not exists)
    await initializeAuth();

    // Build and start server
    const fastify = await buildServer();

    // Run initial job
    await runDailyJob();

    // Schedule daily job (every day at 00:05)
    const scheduleNextRun = () => {
      const now = new Date();
      const next = new Date(now);
      next.setDate(next.getDate() + 1);
      next.setHours(0, 5, 0, 0);

      const msUntilNext = next.getTime() - now.getTime();
      console.log(`Next daily job scheduled in ${Math.round(msUntilNext / 1000 / 60)} minutes`);

      setTimeout(async () => {
        await runDailyJob();
        scheduleNextRun();
      }, msUntilNext);
    };

    scheduleNextRun();

    // Start server
    await fastify.listen({ port: PORT, host: '0.0.0.0' });
    console.log(`Recury API running on http://0.0.0.0:${PORT}`);

  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('Received SIGTERM, shutting down...');
  await prisma.$disconnect();
  process.exit(0);
});

process.on('SIGINT', async () => {
  console.log('Received SIGINT, shutting down...');
  await prisma.$disconnect();
  process.exit(0);
});

main();
