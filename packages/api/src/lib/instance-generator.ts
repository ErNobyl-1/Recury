import { prisma } from './db.js';
import { getOccurrencesInRange, getToday, toUTC, toZoned, formatDateKey } from './scheduler.js';
import { addDays, isBefore } from 'date-fns';
import type { TaskTemplate, TaskInstance } from '@prisma/client';

export async function generateInstancesForRange(
  startDate: Date,
  endDate: Date
): Promise<TaskInstance[]> {
  const templates = await prisma.taskTemplate.findMany({
    where: { isActive: true },
  });

  const generatedInstances: TaskInstance[] = [];

  for (const template of templates) {
    const instances = await generateInstancesForTemplate(template, startDate, endDate);
    generatedInstances.push(...instances);
  }

  return generatedInstances;
}

export async function generateInstancesForTemplate(
  template: TaskTemplate,
  startDate: Date,
  endDate: Date
): Promise<TaskInstance[]> {
  const occurrences = getOccurrencesInRange(template, startDate, endDate);
  const generatedInstances: TaskInstance[] = [];

  for (const occurrence of occurrences) {
    // occurrence is already a local start-of-day from getOccurrencesInRange
    // Convert directly to UTC without re-truncating to avoid shifting back a day
    const dateUTC = toUTC(occurrence);

    // Check if instance already exists
    const existingInstance = await prisma.taskInstance.findUnique({
      where: {
        templateId_date: {
          templateId: template.id,
          date: dateUTC,
        },
      },
    });

    if (!existingInstance) {
      const instance = await prisma.taskInstance.create({
        data: {
          templateId: template.id,
          date: dateUTC,
          status: 'OPEN',
        },
      });
      generatedInstances.push(instance);
    }
  }

  return generatedInstances;
}

export async function processFailedInstances(): Promise<number> {
  const today = getToday();

  // Find all OPEN instances from templates with FAIL_ON_MISS policy
  // where the date is before today
  const failedInstances = await prisma.taskInstance.updateMany({
    where: {
      status: 'OPEN',
      date: {
        lt: toUTC(today),
      },
      template: {
        carryPolicy: 'FAIL_ON_MISS',
      },
    },
    data: {
      status: 'FAILED',
    },
  });

  return failedInstances.count;
}

export async function getDashboardData() {
  const today = getToday();
  const tomorrow = addDays(today, 1);
  const endOfTomorrow = addDays(tomorrow, 1);

  // Generate instances for today and tomorrow
  await generateInstancesForRange(today, tomorrow);

  // Process failed instances
  await processFailedInstances();

  // Get today's instances (including overdue CARRY_OVER_STACK)
  const todayInstances = await prisma.taskInstance.findMany({
    where: {
      OR: [
        // Today's instances
        {
          date: {
            gte: toUTC(today),
            lt: toUTC(tomorrow),
          },
        },
        // Overdue instances (CARRY_OVER_STACK only)
        {
          date: {
            lt: toUTC(today),
          },
          status: 'OPEN',
          template: {
            carryPolicy: 'CARRY_OVER_STACK',
          },
        },
      ],
    },
    include: {
      template: true,
    },
    orderBy: [
      { status: 'asc' }, // OPEN first
      { date: 'asc' },
    ],
  });

  // Get tomorrow's instances
  const tomorrowInstances = await prisma.taskInstance.findMany({
    where: {
      date: {
        gte: toUTC(tomorrow),
        lt: toUTC(endOfTomorrow),
      },
    },
    include: {
      template: true,
    },
    orderBy: [
      { status: 'asc' },
      { date: 'asc' },
    ],
  });

  // Separate into categories
  const todayOpen = todayInstances.filter(i => i.status === 'OPEN');
  const todayDone = todayInstances.filter(i => i.status === 'DONE');
  const todayFailed = todayInstances.filter(i => i.status === 'FAILED');

  // Identify overdue
  const overdue = todayOpen.filter(i =>
    isBefore(toZoned(i.date), today)
  );
  const dueToday = todayOpen.filter(i =>
    !isBefore(toZoned(i.date), today)
  );

  return {
    today: {
      overdue: overdue.map(formatInstance),
      open: dueToday.map(formatInstance),
      done: todayDone.map(formatInstance),
      failed: todayFailed.map(formatInstance),
    },
    tomorrow: {
      open: tomorrowInstances.filter(i => i.status === 'OPEN').map(formatInstance),
      done: tomorrowInstances.filter(i => i.status === 'DONE').map(formatInstance),
    },
  };
}

function formatInstance(instance: TaskInstance & { template: TaskTemplate }) {
  return {
    id: instance.id,
    templateId: instance.templateId,
    date: formatDateKey(toZoned(instance.date)),
    status: instance.status,
    completedAt: instance.completedAt?.toISOString() ?? null,
    createdAt: instance.createdAt.toISOString(),
    template: {
      id: instance.template.id,
      title: instance.template.title,
      notes: instance.template.notes,
      carryPolicy: instance.template.carryPolicy,
      scheduleType: instance.template.scheduleType,
      dueTime: instance.template.dueTime,
      tags: instance.template.tags,
    },
  };
}

export async function getInstancesForRange(startDate: Date, endDate: Date) {
  // Generate instances first
  await generateInstancesForRange(startDate, endDate);

  // Process failed instances
  await processFailedInstances();

  const instances = await prisma.taskInstance.findMany({
    where: {
      date: {
        gte: toUTC(startDate),
        lte: toUTC(endDate),
      },
    },
    include: {
      template: true,
    },
    orderBy: [
      { date: 'asc' },
      { status: 'asc' },
    ],
  });

  return instances.map(formatInstance);
}
