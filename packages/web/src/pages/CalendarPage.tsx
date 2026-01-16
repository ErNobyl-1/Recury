import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  format,
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  isSameMonth,
  isSameDay,
  isToday,
  addMonths,
  subMonths,
  parseISO,
} from 'date-fns';
import { de } from 'date-fns/locale';
import { ChevronLeft, ChevronRight, RefreshCw } from 'lucide-react';
import { instances as instancesApi, Instance } from '../lib/api';
import TaskCard from '../components/TaskCard';
import { cn, formatDate } from '../lib/utils';

export default function CalendarPage() {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [instances, setInstances] = useState<Instance[]>([]);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  const loadInstances = useCallback(async () => {
    setLoading(true);
    try {
      const start = startOfWeek(startOfMonth(currentMonth), { locale: de });
      const end = endOfWeek(endOfMonth(addMonths(currentMonth, 1)), { locale: de });

      const from = format(start, 'yyyy-MM-dd');
      const to = format(end, 'yyyy-MM-dd');

      const data = await instancesApi.list(from, to);
      setInstances(data);
    } catch (error) {
      console.error('Failed to load instances:', error);
    } finally {
      setLoading(false);
    }
  }, [currentMonth]);

  useEffect(() => {
    loadInstances();
  }, [loadInstances]);

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const calendarStart = startOfWeek(monthStart, { locale: de });
  const calendarEnd = endOfWeek(monthEnd, { locale: de });
  const calendarDays = eachDayOfInterval({ start: calendarStart, end: calendarEnd });

  const getInstancesForDate = (date: Date): Instance[] => {
    return instances.filter((instance) => {
      const instanceDate = parseISO(instance.date);
      return isSameDay(instanceDate, date);
    });
  };

  const selectedInstances = selectedDate ? getInstancesForDate(selectedDate) : [];

  const handlePrevMonth = () => setCurrentMonth(subMonths(currentMonth, 1));
  const handleNextMonth = () => setCurrentMonth(addMonths(currentMonth, 1));
  const handleToday = () => {
    setCurrentMonth(new Date());
    setSelectedDate(new Date());
  };

  const weekDays = ['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So'];

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Kalender</h1>
        <button
          onClick={loadInstances}
          disabled={loading}
          className="btn btn-secondary p-2"
          title="Aktualisieren"
        >
          <RefreshCw size={20} className={cn(loading && 'animate-spin')} />
        </button>
      </div>

      {/* Calendar Navigation */}
      <div className="card p-4">
        <div className="flex items-center justify-between mb-4">
          <button
            onClick={handlePrevMonth}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <ChevronLeft size={24} />
          </button>

          <div className="flex items-center gap-4">
            <h2 className="text-lg font-semibold">
              {format(currentMonth, 'MMMM yyyy', { locale: de })}
            </h2>
            <button
              onClick={handleToday}
              className="btn btn-secondary text-sm px-3 py-1"
            >
              Heute
            </button>
          </div>

          <button
            onClick={handleNextMonth}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <ChevronRight size={24} />
          </button>
        </div>

        {/* Week day headers */}
        <div className="grid grid-cols-7 mb-2">
          {weekDays.map((day) => (
            <div key={day} className="text-center text-sm font-medium text-gray-500 py-2">
              {day}
            </div>
          ))}
        </div>

        {/* Calendar grid */}
        <div className="grid grid-cols-7 gap-1">
          {calendarDays.map((day) => {
            const dayInstances = getInstancesForDate(day);
            const openCount = dayInstances.filter((i) => i.status === 'OPEN').length;
            const doneCount = dayInstances.filter((i) => i.status === 'DONE').length;
            const failedCount = dayInstances.filter((i) => i.status === 'FAILED').length;
            const isSelected = selectedDate && isSameDay(day, selectedDate);
            const isCurrentMonth = isSameMonth(day, currentMonth);
            const isDayToday = isToday(day);

            return (
              <button
                key={day.toISOString()}
                onClick={() => setSelectedDate(day)}
                className={cn(
                  'aspect-square p-1 rounded-lg transition-colors relative',
                  'flex flex-col items-center justify-start',
                  isCurrentMonth ? 'hover:bg-gray-100' : 'text-gray-300',
                  isSelected && 'bg-primary-100 hover:bg-primary-100',
                  isDayToday && !isSelected && 'bg-primary-50'
                )}
              >
                <span
                  className={cn(
                    'text-sm font-medium',
                    isDayToday && 'text-primary-600 font-bold',
                    isSelected && 'text-primary-700'
                  )}
                >
                  {format(day, 'd')}
                </span>

                {/* Task indicators */}
                {isCurrentMonth && dayInstances.length > 0 && (
                  <div className="flex gap-0.5 mt-1 flex-wrap justify-center">
                    {openCount > 0 && (
                      <span className="w-2 h-2 rounded-full bg-primary-500" title={`${openCount} offen`} />
                    )}
                    {doneCount > 0 && (
                      <span className="w-2 h-2 rounded-full bg-green-500" title={`${doneCount} erledigt`} />
                    )}
                    {failedCount > 0 && (
                      <span className="w-2 h-2 rounded-full bg-red-500" title={`${failedCount} fehlgeschlagen`} />
                    )}
                  </div>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Selected day details */}
      {selectedDate && (
        <div className="card p-4">
          <h3 className="font-semibold text-gray-900 mb-3">
            {formatDate(selectedDate, 'EEEE, dd. MMMM yyyy')}
          </h3>

          {selectedInstances.length > 0 ? (
            <div className="space-y-2">
              {selectedInstances.map((instance) => (
                <TaskCard
                  key={instance.id}
                  instance={instance}
                  onComplete={loadInstances}
                  onEdit={() => navigate(`/tasks/${instance.templateId}`)}
                  onSnooze={loadInstances}
                />
              ))}
            </div>
          ) : (
            <p className="text-gray-500 text-center py-4">
              Keine Aufgaben an diesem Tag.
            </p>
          )}
        </div>
      )}

      {/* Legend */}
      <div className="flex justify-center gap-6 text-sm text-gray-500">
        <div className="flex items-center gap-2">
          <span className="w-3 h-3 rounded-full bg-primary-500" />
          <span>Offen</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-3 h-3 rounded-full bg-green-500" />
          <span>Erledigt</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-3 h-3 rounded-full bg-red-500" />
          <span>Fehlgeschlagen</span>
        </div>
      </div>
    </div>
  );
}
