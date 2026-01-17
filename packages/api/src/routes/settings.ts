import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { prisma } from '../lib/db.js';
import { z } from 'zod';

const UpdateSettingsSchema = z.object({
  locale: z.enum(['en', 'de']).optional(),
});

export async function settingsRoutes(fastify: FastifyInstance) {
  // Get app settings (public - needed before login for locale)
  fastify.get('/settings', async (request: FastifyRequest, reply: FastifyReply) => {
    const settings = await prisma.appSettings.findUnique({
      where: { id: 'app' },
      select: { locale: true },
    });

    return {
      locale: settings?.locale || 'en',
    };
  });

  // Update app settings (requires authentication)
  fastify.put('/settings', async (request: FastifyRequest, reply: FastifyReply) => {
    const authenticated = (request.session as any).authenticated === true;
    if (!authenticated) {
      return reply.status(401).send({ error: 'Not authenticated' });
    }

    const parseResult = UpdateSettingsSchema.safeParse(request.body);

    if (!parseResult.success) {
      return reply.status(400).send({
        error: 'Validation failed',
        details: parseResult.error.errors,
      });
    }

    const { locale } = parseResult.data;

    const updated = await prisma.appSettings.update({
      where: { id: 'app' },
      data: {
        ...(locale && { locale }),
      },
      select: { locale: true },
    });

    return {
      locale: updated.locale,
    };
  });
}
