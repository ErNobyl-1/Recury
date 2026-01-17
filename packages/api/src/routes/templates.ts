import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { prisma } from '../lib/db.js';
import { CreateTemplateSchema, UpdateTemplateSchema, DuplicateTemplateSchema } from '../schemas/template.js';
import { generateInstancesForTemplate } from '../lib/instance-generator.js';
import { getToday, getTomorrow } from '../lib/scheduler.js';
import { addMonths } from 'date-fns';

export async function templateRoutes(fastify: FastifyInstance) {
  // Get all templates
  fastify.get('/templates', async (request: FastifyRequest, reply: FastifyReply) => {
    const { status, type, search } = request.query as {
      status?: 'active' | 'archived' | 'all';
      type?: string;
      search?: string;
    };

    const where: any = {};

    if (status === 'active') {
      where.isActive = true;
    } else if (status === 'archived') {
      where.isActive = false;
    }
    // 'all' or undefined = no filter

    if (type) {
      where.scheduleType = type.toUpperCase();
    }

    if (search) {
      where.OR = [
        { title: { contains: search } },
        { notes: { contains: search } },
        { tags: { contains: search } },
      ];
    }

    const templates = await prisma.taskTemplate.findMany({
      where,
      orderBy: [
        { sortOrder: 'asc' },
        { createdAt: 'desc' },
      ],
    });

    return templates;
  });

  // Get single template
  fastify.get('/templates/:id', async (request: FastifyRequest, reply: FastifyReply) => {
    const { id } = request.params as { id: string };

    const template = await prisma.taskTemplate.findUnique({
      where: { id },
      include: {
        instances: {
          orderBy: { date: 'desc' },
          take: 50,
        },
      },
    });

    if (!template) {
      return reply.status(404).send({ error: 'Template not found' });
    }

    return template;
  });

  // Create template
  fastify.post('/templates', async (request: FastifyRequest, reply: FastifyReply) => {
    const parseResult = CreateTemplateSchema.safeParse(request.body);

    if (!parseResult.success) {
      return reply.status(400).send({
        error: 'Validation failed',
        details: parseResult.error.errors,
      });
    }

    const data = parseResult.data;

    const template = await prisma.taskTemplate.create({
      data: {
        title: data.title,
        notes: data.notes ?? null,
        carryPolicy: data.carryPolicy,
        scheduleType: data.scheduleType,
        startDate: data.startDate ? new Date(data.startDate) : null,
        anchorDate: data.anchorDate ? new Date(data.anchorDate) : null,
        intervalUnit: data.intervalUnit ?? null,
        intervalValue: data.intervalValue ?? null,
        weeklyDays: data.weeklyDays ?? null,
        monthlyDay: data.monthlyDay ?? null,
        monthlyMode: data.monthlyMode ?? null,
        yearlyMonth: data.yearlyMonth ?? null,
        yearlyDay: data.yearlyDay ?? null,
        dueTime: data.dueTime ?? null,
        tags: data.tags ?? null,
        color: data.color ?? null,
        sortOrder: data.sortOrder,
      },
    });

    // Generate initial instances for today and next month
    const today = getToday();
    const endDate = addMonths(today, 1);
    await generateInstancesForTemplate(template, today, endDate);

    return reply.status(201).send(template);
  });

  // Update template
  fastify.put('/templates/:id', async (request: FastifyRequest, reply: FastifyReply) => {
    const { id } = request.params as { id: string };

    const parseResult = UpdateTemplateSchema.safeParse(request.body);

    if (!parseResult.success) {
      return reply.status(400).send({
        error: 'Validation failed',
        details: parseResult.error.errors,
      });
    }

    const data = parseResult.data;

    const existing = await prisma.taskTemplate.findUnique({ where: { id } });
    if (!existing) {
      return reply.status(404).send({ error: 'Template not found' });
    }

    const updateData: any = {};

    if (data.title !== undefined) updateData.title = data.title;
    if (data.notes !== undefined) updateData.notes = data.notes;
    if (data.carryPolicy !== undefined) updateData.carryPolicy = data.carryPolicy;
    if (data.scheduleType !== undefined) updateData.scheduleType = data.scheduleType;
    if (data.startDate !== undefined) updateData.startDate = data.startDate ? new Date(data.startDate) : null;
    if (data.anchorDate !== undefined) updateData.anchorDate = data.anchorDate ? new Date(data.anchorDate) : null;
    if (data.intervalUnit !== undefined) updateData.intervalUnit = data.intervalUnit;
    if (data.intervalValue !== undefined) updateData.intervalValue = data.intervalValue;
    if (data.weeklyDays !== undefined) updateData.weeklyDays = data.weeklyDays;
    if (data.monthlyDay !== undefined) updateData.monthlyDay = data.monthlyDay;
    if (data.monthlyMode !== undefined) updateData.monthlyMode = data.monthlyMode;
    if (data.yearlyMonth !== undefined) updateData.yearlyMonth = data.yearlyMonth;
    if (data.yearlyDay !== undefined) updateData.yearlyDay = data.yearlyDay;
    if (data.dueTime !== undefined) updateData.dueTime = data.dueTime;
    if (data.tags !== undefined) updateData.tags = data.tags;
    if (data.color !== undefined) updateData.color = data.color;
    if (data.sortOrder !== undefined) updateData.sortOrder = data.sortOrder;
    if (data.isActive !== undefined) updateData.isActive = data.isActive;

    // Check if schedule-relevant fields actually changed (compare against existing values)
    const scheduleFieldsChanged =
      (data.scheduleType !== undefined && data.scheduleType !== existing.scheduleType) ||
      (data.startDate !== undefined && data.startDate !== (existing.startDate?.toISOString().split('T')[0] ?? null)) ||
      (data.anchorDate !== undefined && data.anchorDate !== (existing.anchorDate?.toISOString().split('T')[0] ?? null)) ||
      (data.intervalUnit !== undefined && data.intervalUnit !== existing.intervalUnit) ||
      (data.intervalValue !== undefined && data.intervalValue !== existing.intervalValue) ||
      (data.weeklyDays !== undefined && data.weeklyDays !== existing.weeklyDays) ||
      (data.monthlyDay !== undefined && data.monthlyDay !== existing.monthlyDay) ||
      (data.monthlyMode !== undefined && data.monthlyMode !== existing.monthlyMode) ||
      (data.yearlyMonth !== undefined && data.yearlyMonth !== existing.yearlyMonth) ||
      (data.yearlyDay !== undefined && data.yearlyDay !== existing.yearlyDay);

    const template = await prisma.taskTemplate.update({
      where: { id },
      data: updateData,
    });

    // If schedule changed, delete future OPEN instances and regenerate
    if (scheduleFieldsChanged) {
      const today = getToday();

      // Delete all future OPEN instances (keep DONE and FAILED as history)
      await prisma.taskInstance.deleteMany({
        where: {
          templateId: id,
          date: { gte: today },
          status: 'OPEN',
        },
      });

      // Regenerate instances for today and next month
      const endDate = addMonths(today, 1);
      await generateInstancesForTemplate(template, today, endDate);
    }

    return template;
  });

  // Duplicate template
  fastify.post('/templates/:id/duplicate', async (request: FastifyRequest, reply: FastifyReply) => {
    const { id } = request.params as { id: string };

    const parseResult = DuplicateTemplateSchema.safeParse(request.body || {});

    if (!parseResult.success) {
      return reply.status(400).send({
        error: 'Validation failed',
        details: parseResult.error.errors,
      });
    }

    const { includeSchedule, newTitle } = parseResult.data;

    const original = await prisma.taskTemplate.findUnique({ where: { id } });
    if (!original) {
      return reply.status(404).send({ error: 'Template not found' });
    }

    const duplicateData: any = {
      title: newTitle || `${original.title} (Kopie)`,
      notes: original.notes,
      carryPolicy: original.carryPolicy,
      dueTime: original.dueTime,
      tags: original.tags,
      color: original.color,
      sortOrder: original.sortOrder,
    };

    if (includeSchedule) {
      duplicateData.scheduleType = original.scheduleType;
      duplicateData.startDate = original.startDate;
      duplicateData.anchorDate = original.anchorDate;
      duplicateData.intervalUnit = original.intervalUnit;
      duplicateData.intervalValue = original.intervalValue;
      duplicateData.weeklyDays = original.weeklyDays;
      duplicateData.monthlyDay = original.monthlyDay;
      duplicateData.monthlyMode = original.monthlyMode;
      duplicateData.yearlyMonth = original.yearlyMonth;
      duplicateData.yearlyDay = original.yearlyDay;
    } else {
      // Create as ONCE task without date (needs to be set)
      duplicateData.scheduleType = 'ONCE';
      duplicateData.anchorDate = null;
    }

    const duplicate = await prisma.taskTemplate.create({
      data: duplicateData,
    });

    // Generate instances if schedule is included
    if (includeSchedule) {
      const today = getToday();
      const endDate = addMonths(today, 1);
      await generateInstancesForTemplate(duplicate, today, endDate);
    }

    return reply.status(201).send(duplicate);
  });

  // Delete (archive) template
  fastify.delete('/templates/:id', async (request: FastifyRequest, reply: FastifyReply) => {
    const { id } = request.params as { id: string };
    const { hard } = request.query as { hard?: string };

    const existing = await prisma.taskTemplate.findUnique({ where: { id } });
    if (!existing) {
      return reply.status(404).send({ error: 'Template not found' });
    }

    if (hard === 'true') {
      // Hard delete - also deletes instances due to cascade
      await prisma.taskTemplate.delete({ where: { id } });
      return reply.status(204).send();
    } else {
      // Soft delete - just archive
      await prisma.taskTemplate.update({
        where: { id },
        data: { isActive: false },
      });
      return reply.status(204).send();
    }
  });
}
