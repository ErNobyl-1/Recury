import { z } from 'zod';

export const CarryPolicySchema = z.enum(['FAIL_ON_MISS', 'CARRY_OVER_STACK']);
export const ScheduleTypeSchema = z.enum(['ONCE', 'DAILY', 'WEEKLY', 'MONTHLY', 'YEARLY', 'INTERVAL']);
export const IntervalUnitSchema = z.enum(['DAY', 'WEEK', 'MONTH', 'YEAR']);
export const MonthlyModeSchema = z.enum(['FIRST_DAY', 'LAST_DAY', 'SPECIFIC_DAY']);

const BaseTemplateSchema = z.object({
  title: z.string().min(1).max(255),
  notes: z.string().max(2000).optional().nullable(),
  carryPolicy: CarryPolicySchema.default('CARRY_OVER_STACK'),
  scheduleType: ScheduleTypeSchema,
  startDate: z.string().datetime().optional().nullable(), // Ab wann gilt die Aufgabe (default: heute)
  anchorDate: z.string().datetime().optional().nullable(), // ISO string für INTERVAL
  intervalUnit: IntervalUnitSchema.optional().nullable(),
  intervalValue: z.number().int().min(1).max(365).optional().nullable(),
  weeklyDays: z.string().regex(/^[0-6](,[0-6])*$/).optional().nullable(), // "0,1,2" format
  monthlyDay: z.number().int().min(1).max(31).optional().nullable(),
  monthlyMode: MonthlyModeSchema.optional().nullable(),
  yearlyMonth: z.number().int().min(1).max(12).optional().nullable(),
  yearlyDay: z.number().int().min(1).max(31).optional().nullable(),
  dueTime: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/).optional().nullable(), // HH:mm format
  tags: z.string().max(500).optional().nullable(),
  sortOrder: z.number().int().default(0),
});

export const CreateTemplateSchema = BaseTemplateSchema.refine((data) => {
  // Validate based on scheduleType
  switch (data.scheduleType) {
    case 'ONCE':
      return !!data.anchorDate;
    case 'WEEKLY':
      return !!data.weeklyDays;
    case 'MONTHLY':
      return !!data.monthlyDay || !!data.monthlyMode;
    case 'YEARLY':
      return !!data.yearlyMonth && !!data.yearlyDay;
    case 'INTERVAL':
      return !!data.anchorDate && !!data.intervalUnit && !!data.intervalValue;
    default:
      return true;
  }
}, {
  message: 'Invalid schedule configuration for the selected schedule type',
});

export const UpdateTemplateSchema = BaseTemplateSchema.partial().extend({
  isActive: z.boolean().optional(),
});

export const DuplicateTemplateSchema = z.object({
  includeSchedule: z.boolean().default(true),
  newTitle: z.string().min(1).max(255).optional(),
});

export type CreateTemplateInput = z.infer<typeof CreateTemplateSchema>;
export type UpdateTemplateInput = z.infer<typeof UpdateTemplateSchema>;
export type DuplicateTemplateInput = z.infer<typeof DuplicateTemplateSchema>;
