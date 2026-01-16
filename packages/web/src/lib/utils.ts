import { format, parseISO, isToday, isTomorrow, isYesterday, isPast, startOfDay } from 'date-fns';
import { de } from 'date-fns/locale';

export function formatDate(date: string | Date, formatStr = 'dd.MM.yyyy'): string {
  const d = typeof date === 'string' ? parseISO(date) : date;
  return format(d, formatStr, { locale: de });
}

export function formatDateRelative(date: string | Date): string {
  const d = typeof date === 'string' ? parseISO(date) : date;

  if (isToday(d)) return 'Heute';
  if (isTomorrow(d)) return 'Morgen';
  if (isYesterday(d)) return 'Gestern';

  return format(d, 'EEEE, dd.MM.', { locale: de });
}

export function formatTime(time: string | null): string {
  if (!time) return '';
  return time;
}

export function isOverdue(date: string | Date): boolean {
  const d = typeof date === 'string' ? parseISO(date) : date;
  return isPast(startOfDay(d)) && !isToday(d);
}

export function getScheduleTypeLabel(type: string): string {
  const labels: Record<string, string> = {
    ONCE: 'Einmalig',
    DAILY: 'Täglich',
    WEEKLY: 'Wöchentlich',
    MONTHLY: 'Monatlich',
    YEARLY: 'Jährlich',
    INTERVAL: 'Intervall',
  };
  return labels[type] || type;
}

export function getCarryPolicyLabel(policy: string): string {
  const labels: Record<string, string> = {
    FAIL_ON_MISS: 'Fehlgeschlagen bei Verpassen',
    CARRY_OVER_STACK: 'Stapelt sich auf',
  };
  return labels[policy] || policy;
}

export function getWeekdayLabel(day: number): string {
  const days = ['So', 'Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa'];
  return days[day] || '';
}

export function getWeekdaysFromString(weeklyDays: string | null): number[] {
  if (!weeklyDays) return [];
  return weeklyDays.split(',').map(d => parseInt(d, 10)).filter(d => !isNaN(d));
}

export function formatWeekdays(weeklyDays: string | null): string {
  const days = getWeekdaysFromString(weeklyDays);
  return days.map(d => getWeekdayLabel(d)).join(', ');
}

export function getIntervalLabel(unit: string | null, value: number | null): string {
  if (!unit || !value) return '';

  const unitLabels: Record<string, [string, string]> = {
    DAY: ['Tag', 'Tage'],
    WEEK: ['Woche', 'Wochen'],
    MONTH: ['Monat', 'Monate'],
    YEAR: ['Jahr', 'Jahre'],
  };

  const [singular, plural] = unitLabels[unit] || [unit, unit];
  return `Alle ${value} ${value === 1 ? singular : plural}`;
}

export function getMonthlyModeLabel(mode: string | null, day: number | null): string {
  if (mode === 'FIRST_DAY') return 'Am 1. des Monats';
  if (mode === 'LAST_DAY') return 'Am letzten Tag des Monats';
  if (day) return `Am ${day}. des Monats`;
  return '';
}

export function cn(...classes: (string | boolean | undefined | null)[]): string {
  return classes.filter(Boolean).join(' ');
}
