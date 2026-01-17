import { parseISO, isToday, isPast, startOfDay } from 'date-fns';

export function formatTime(time: string | null): string {
  if (!time) return '';
  return time;
}

export function isOverdue(date: string | Date): boolean {
  const d = typeof date === 'string' ? parseISO(date) : date;
  return isPast(startOfDay(d)) && !isToday(d);
}

export function cn(...classes: (string | boolean | undefined | null)[]): string {
  return classes.filter(Boolean).join(' ');
}
