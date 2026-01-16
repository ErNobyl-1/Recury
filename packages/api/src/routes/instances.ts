import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { prisma } from '../lib/db.js';
import { getDashboardData, getInstancesForRange, generateInstancesForRange, processFailedInstances } from '../lib/instance-generator.js';
import { getToday, toUTC, toZoned, formatDateKey } from '../lib/scheduler.js';
import { startOfDay, parseISO, addDays } from 'date-fns';

export async function instanceRoutes(fastify: FastifyInstance) {
  // Get dashboard data (heute/morgen)
  fastify.get('/dashboard', async (request: FastifyRequest, reply: FastifyReply) => {
    const data = await getDashboardData();
    return data;
  });

  // Get instances for date range
  fastify.get('/instances', async (request: FastifyRequest, reply: FastifyReply) => {
    const { from, to } = request.query as { from?: string; to?: string };

    if (!from || !to) {
      return reply.status(400).send({ error: 'from and to query parameters are required (YYYY-MM-DD)' });
    }

    let startDate: Date;
    let endDate: Date;

    try {
      startDate = startOfDay(parseISO(from));
      endDate = startOfDay(parseISO(to));
    } catch {
      return reply.status(400).send({ error: 'Invalid date format. Use YYYY-MM-DD' });
    }

    const instances = await getInstancesForRange(startDate, endDate);
    return instances;
  });

  // Complete an instance
  fastify.post('/instances/:id/complete', async (request: FastifyRequest, reply: FastifyReply) => {
    const { id } = request.params as { id: string };

    const instance = await prisma.taskInstance.findUnique({
      where: { id },
      include: { template: true },
    });

    if (!instance) {
      return reply.status(404).send({ error: 'Instance not found' });
    }

    if (instance.status === 'DONE') {
      return reply.status(400).send({ error: 'Instance is already completed' });
    }

    if (instance.status === 'FAILED') {
      return reply.status(400).send({ error: 'Cannot complete a failed instance' });
    }

    const updated = await prisma.taskInstance.update({
      where: { id },
      data: {
        status: 'DONE',
        completedAt: new Date(),
      },
      include: { template: true },
    });

    return {
      id: updated.id,
      templateId: updated.templateId,
      date: formatDateKey(toZoned(updated.date)),
      status: updated.status,
      completedAt: updated.completedAt?.toISOString() ?? null,
      template: {
        id: updated.template.id,
        title: updated.template.title,
      },
    };
  });

  // Uncomplete an instance (reopen)
  fastify.post('/instances/:id/uncomplete', async (request: FastifyRequest, reply: FastifyReply) => {
    const { id } = request.params as { id: string };

    const instance = await prisma.taskInstance.findUnique({
      where: { id },
    });

    if (!instance) {
      return reply.status(404).send({ error: 'Instance not found' });
    }

    if (instance.status !== 'DONE') {
      return reply.status(400).send({ error: 'Instance is not completed' });
    }

    const updated = await prisma.taskInstance.update({
      where: { id },
      data: {
        status: 'OPEN',
        completedAt: null,
      },
      include: { template: true },
    });

    return {
      id: updated.id,
      templateId: updated.templateId,
      date: formatDateKey(toZoned(updated.date)),
      status: updated.status,
      completedAt: null,
      template: {
        id: updated.template.id,
        title: updated.template.title,
      },
    };
  });

  // Snooze an instance (reschedule to another date - only for ONCE or manual override)
  fastify.post('/instances/:id/snooze', async (request: FastifyRequest, reply: FastifyReply) => {
    const { id } = request.params as { id: string };
    const { toDate } = request.body as { toDate?: string };

    const instance = await prisma.taskInstance.findUnique({
      where: { id },
      include: { template: true },
    });

    if (!instance) {
      return reply.status(404).send({ error: 'Instance not found' });
    }

    if (instance.status !== 'OPEN') {
      return reply.status(400).send({ error: 'Can only snooze open instances' });
    }

    // Determine new date
    let newDate: Date;
    if (toDate) {
      try {
        newDate = startOfDay(parseISO(toDate));
      } catch {
        return reply.status(400).send({ error: 'Invalid date format. Use YYYY-MM-DD' });
      }
    } else {
      // Default: snooze to tomorrow
      newDate = addDays(getToday(), 1);
    }

    // newDate is already a local start-of-day, convert directly to UTC
    const newDateUTC = toUTC(newDate);

    // Check if an instance already exists for that date
    const existing = await prisma.taskInstance.findUnique({
      where: {
        templateId_date: {
          templateId: instance.templateId,
          date: newDateUTC,
        },
      },
    });

    if (existing && existing.id !== id) {
      return reply.status(400).send({
        error: 'An instance already exists for this date. Complete or delete it first.',
      });
    }

    // Update the instance date
    const updated = await prisma.taskInstance.update({
      where: { id },
      data: {
        date: newDateUTC,
      },
      include: { template: true },
    });

    return {
      id: updated.id,
      templateId: updated.templateId,
      date: formatDateKey(toZoned(updated.date)),
      status: updated.status,
      template: {
        id: updated.template.id,
        title: updated.template.title,
      },
    };
  });

  // Update a single instance (edit this occurrence only)
  fastify.patch('/instances/:id', async (request: FastifyRequest, reply: FastifyReply) => {
    const { id } = request.params as { id: string };
    const { customTitle, customNotes, date } = request.body as {
      customTitle?: string | null;
      customNotes?: string | null;
      date?: string;
    };

    const instance = await prisma.taskInstance.findUnique({
      where: { id },
      include: { template: true },
    });

    if (!instance) {
      return reply.status(404).send({ error: 'Instance not found' });
    }

    if (instance.status === 'DELETED') {
      return reply.status(400).send({ error: 'Cannot edit a deleted instance' });
    }

    const updateData: {
      customTitle?: string | null;
      customNotes?: string | null;
      date?: Date;
    } = {};

    // Handle customTitle - empty string means clear override (use template)
    if (customTitle !== undefined) {
      updateData.customTitle = customTitle === '' ? null : customTitle;
    }

    // Handle customNotes - empty string means clear override (use template)
    if (customNotes !== undefined) {
      updateData.customNotes = customNotes === '' ? null : customNotes;
    }

    // Handle date change (reschedule)
    if (date) {
      try {
        const newDate = startOfDay(parseISO(date));
        const newDateUTC = toUTC(newDate);

        // Check if an instance already exists for that date
        const existing = await prisma.taskInstance.findUnique({
          where: {
            templateId_date: {
              templateId: instance.templateId,
              date: newDateUTC,
            },
          },
        });

        if (existing && existing.id !== id) {
          return reply.status(400).send({
            error: 'An instance already exists for this date.',
          });
        }

        updateData.date = newDateUTC;
      } catch {
        return reply.status(400).send({ error: 'Invalid date format. Use YYYY-MM-DD' });
      }
    }

    const updated = await prisma.taskInstance.update({
      where: { id },
      data: updateData,
      include: { template: true },
    });

    return {
      id: updated.id,
      templateId: updated.templateId,
      date: formatDateKey(toZoned(updated.date)),
      status: updated.status,
      completedAt: updated.completedAt?.toISOString() ?? null,
      customTitle: updated.customTitle,
      customNotes: updated.customNotes,
      template: {
        id: updated.template.id,
        title: updated.template.title,
        notes: updated.template.notes,
      },
    };
  });

  // Delete a single instance (soft delete - marks as DELETED)
  fastify.delete('/instances/:id', async (request: FastifyRequest, reply: FastifyReply) => {
    const { id } = request.params as { id: string };

    const instance = await prisma.taskInstance.findUnique({
      where: { id },
    });

    if (!instance) {
      return reply.status(404).send({ error: 'Instance not found' });
    }

    if (instance.status === 'DELETED') {
      return reply.status(400).send({ error: 'Instance is already deleted' });
    }

    await prisma.taskInstance.update({
      where: { id },
      data: {
        status: 'DELETED',
      },
    });

    return { success: true };
  });

  // Admin: Rebuild instances for a date range
  fastify.post('/rebuild-instances', async (request: FastifyRequest, reply: FastifyReply) => {
    const { from, to } = request.query as { from?: string; to?: string };

    if (!from || !to) {
      return reply.status(400).send({ error: 'from and to query parameters are required (YYYY-MM-DD)' });
    }

    let startDate: Date;
    let endDate: Date;

    try {
      startDate = startOfDay(parseISO(from));
      endDate = startOfDay(parseISO(to));
    } catch {
      return reply.status(400).send({ error: 'Invalid date format. Use YYYY-MM-DD' });
    }

    const generated = await generateInstancesForRange(startDate, endDate);
    const failed = await processFailedInstances();

    return {
      message: 'Instances rebuilt successfully',
      generatedCount: generated.length,
      failedCount: failed,
    };
  });
}
