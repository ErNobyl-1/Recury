import {
  addDays,
  addWeeks,
  addMonths,
  addYears,
  startOfDay,
  endOfDay,
  isBefore,
  isAfter,
  isEqual,
  getDay,
  getDate,
  getMonth,
  lastDayOfMonth,
  setDate,
  eachDayOfInterval,
  format,
} from 'date-fns';
import { toZonedTime, fromZonedTime } from 'date-fns-tz';
import type { TaskTemplate } from '@prisma/client';

// Type definitions (previously Prisma enums, now strings)
export type ScheduleType = 'ONCE' | 'DAILY' | 'WEEKLY' | 'MONTHLY' | 'YEARLY' | 'INTERVAL';
export type IntervalUnit = 'DAY' | 'WEEK' | 'MONTH' | 'YEAR';
export type MonthlyMode = 'FIRST_DAY' | 'LAST_DAY' | 'SPECIFIC_DAY';
export type CarryPolicy = 'FAIL_ON_MISS' | 'CARRY_OVER_STACK';
export type InstanceStatus = 'OPEN' | 'DONE' | 'FAILED';

const TIMEZONE = 'Europe/Berlin';

export function getNow(): Date {
  return toZonedTime(new Date(), TIMEZONE);
}

export function getToday(): Date {
  return startOfDay(getNow());
}

export function getTomorrow(): Date {
  return addDays(getToday(), 1);
}

export function toUTC(zonedDate: Date): Date {
  return fromZonedTime(zonedDate, TIMEZONE);
}

export function toZoned(utcDate: Date): Date {
  return toZonedTime(utcDate, TIMEZONE);
}

export function formatDateKey(date: Date): string {
  return format(date, 'yyyy-MM-dd');
}

export function parseWeeklyDays(weeklyDays: string | null): number[] {
  if (!weeklyDays) return [];
  return weeklyDays.split(',').map(d => parseInt(d, 10)).filter(d => !isNaN(d));
}

export function shouldOccurOnDate(template: TaskTemplate, date: Date): boolean {
  const dateOnly = startOfDay(date);

  // Check startDate - if set, no occurrences before this date
  if (template.startDate) {
    const startDateOnly = startOfDay(toZoned(template.startDate));
    if (isBefore(dateOnly, startDateOnly)) {
      return false;
    }
  }

  // Check anchor date for ONCE
  if (template.scheduleType === 'ONCE') {
    if (!template.anchorDate) return false;
    const anchorOnly = startOfDay(toZoned(template.anchorDate));
    return isEqual(dateOnly, anchorOnly);
  }

  // DAILY: every day
  if (template.scheduleType === 'DAILY') {
    return true;
  }

  // WEEKLY: specific days of week
  if (template.scheduleType === 'WEEKLY') {
    const dayOfWeek = getDay(dateOnly); // 0=Sun, 1=Mon, etc.
    const days = parseWeeklyDays(template.weeklyDays);
    return days.includes(dayOfWeek);
  }

  // MONTHLY: specific day of month
  if (template.scheduleType === 'MONTHLY') {
    const dayOfMonth = getDate(dateOnly);
    const lastDay = getDate(lastDayOfMonth(dateOnly));

    if (template.monthlyMode === 'LAST_DAY') {
      return dayOfMonth === lastDay;
    }
    if (template.monthlyMode === 'FIRST_DAY') {
      return dayOfMonth === 1;
    }
    // SPECIFIC_DAY or default
    if (template.monthlyDay) {
      // Handle months with fewer days
      const targetDay = Math.min(template.monthlyDay, lastDay);
      return dayOfMonth === targetDay;
    }
    return false;
  }

  // YEARLY: specific month and day
  if (template.scheduleType === 'YEARLY') {
    if (!template.yearlyMonth || !template.yearlyDay) return false;
    const month = getMonth(dateOnly) + 1; // getMonth is 0-indexed
    const day = getDate(dateOnly);
    const lastDay = getDate(lastDayOfMonth(dateOnly));
    const targetDay = Math.min(template.yearlyDay, lastDay);
    return month === template.yearlyMonth && day === targetDay;
  }

  // INTERVAL: every X days/weeks/months/years from anchor
  if (template.scheduleType === 'INTERVAL') {
    if (!template.anchorDate || !template.intervalUnit || !template.intervalValue) {
      return false;
    }

    const anchorOnly = startOfDay(toZoned(template.anchorDate));

    // If date is before anchor, it doesn't occur
    if (isBefore(dateOnly, anchorOnly)) {
      return false;
    }

    // Check if date matches the interval pattern
    return isIntervalMatch(anchorOnly, dateOnly, template.intervalUnit as IntervalUnit, template.intervalValue);
  }

  return false;
}

function isIntervalMatch(
  anchor: Date,
  target: Date,
  unit: IntervalUnit,
  value: number
): boolean {
  if (isEqual(anchor, target)) return true;

  // Calculate the number of intervals between anchor and target
  let current = anchor;
  let iterations = 0;
  const maxIterations = 10000; // Safety limit

  while (isBefore(current, target) && iterations < maxIterations) {
    current = addInterval(current, unit, value);
    if (isEqual(startOfDay(current), startOfDay(target))) {
      return true;
    }
    iterations++;
  }

  return false;
}

function addInterval(date: Date, unit: IntervalUnit, value: number): Date {
  switch (unit) {
    case 'DAY':
      return addDays(date, value);
    case 'WEEK':
      return addWeeks(date, value);
    case 'MONTH':
      return addMonths(date, value);
    case 'YEAR':
      return addYears(date, value);
    default:
      return date;
  }
}

export function getOccurrencesInRange(
  template: TaskTemplate,
  startDate: Date,
  endDate: Date
): Date[] {
  const occurrences: Date[] = [];
  let start = startOfDay(startDate);
  const end = startOfDay(endDate);

  // Respect template's startDate - don't generate before it
  if (template.startDate) {
    const templateStart = startOfDay(toZoned(template.startDate));
    if (isAfter(templateStart, start)) {
      start = templateStart;
    }
  }

  // If start is after end, no occurrences
  if (isAfter(start, end)) {
    return occurrences;
  }

  // For ONCE, just check if anchor is in range
  if (template.scheduleType === 'ONCE') {
    if (!template.anchorDate) return [];
    const anchorOnly = startOfDay(toZoned(template.anchorDate));
    if (!isBefore(anchorOnly, start) && !isAfter(anchorOnly, end)) {
      occurrences.push(anchorOnly);
    }
    return occurrences;
  }

  // For INTERVAL, iterate from anchor
  if (template.scheduleType === 'INTERVAL') {
    if (!template.anchorDate || !template.intervalUnit || !template.intervalValue) {
      return [];
    }

    let current = startOfDay(toZoned(template.anchorDate));
    const maxIterations = 10000;
    let iterations = 0;

    // Move current to first occurrence >= start
    while (isBefore(current, start) && iterations < maxIterations) {
      current = addInterval(current, template.intervalUnit as IntervalUnit, template.intervalValue);
      iterations++;
    }

    // Collect all occurrences in range
    while (!isAfter(current, end) && iterations < maxIterations) {
      occurrences.push(current);
      current = addInterval(current, template.intervalUnit as IntervalUnit, template.intervalValue);
      iterations++;
    }

    return occurrences;
  }

  // For other types, check each day in range
  const days = eachDayOfInterval({ start, end });
  for (const day of days) {
    if (shouldOccurOnDate(template, day)) {
      occurrences.push(day);
    }
  }

  return occurrences;
}

export function getNextOccurrence(template: TaskTemplate, afterDate: Date): Date | null {
  const start = startOfDay(afterDate);
  const maxDaysToCheck = 366 * 2; // Check up to 2 years ahead

  for (let i = 0; i < maxDaysToCheck; i++) {
    const checkDate = addDays(start, i);
    if (shouldOccurOnDate(template, checkDate)) {
      return checkDate;
    }
  }

  return null;
}
