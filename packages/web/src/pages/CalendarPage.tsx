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
import InstanceEditModal from '../components/InstanceEditModal';
import { cn, formatDate } from '../lib/utils';

export default function CalendarPage() {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [instances, setInstances] = useState<Instance[]>([]);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [loading, setLoading] = useState(true);
  const [editingInstance, setEditingInstance] = useState<Instance | null>(null);
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
    <div className="md:max-w-4xl md:mx-auto space-y-4 md:space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-xl md:text-2xl font-bold text-gray-900">Kalender</h1>
        <button
          onClick={loadInstances}
          disabled={loading}
          className="btn btn-secondary p-2"
          title="Aktualisieren"
        >
          <RefreshCw size={20} className={cn(loading && 'animate-spin')} />
        </button>
      </div>

      {/* Calendar - full width on mobile, card on desktop */}
      <div className="bg-white md:card md:p-4 -mx-4 px-2 py-3 md:mx-0 md:rounded-lg">
        <div className="flex items-center justify-between mb-3 md:mb-4">
          <button
            onClick={handlePrevMonth}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <ChevronLeft size={24} />
          </button>

          <div className="flex items-center gap-3 md:gap-4">
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
        <div className="grid grid-cols-7 mb-1 md:mb-2">
          {weekDays.map((day) => (
            <div key={day} className="text-center text-sm font-medium text-gray-500 py-1 md:py-2">
              {day}
            </div>
          ))}
        </div>

        {/* Calendar grid */}
        <div className="grid grid-cols-7 gap-px md:gap-1">
          {calendarDays.map((day) => {
            const dayInstances = getInstancesForDate(day);
            const openInstances = dayInstances.filter((i) => i.status === 'OPEN');
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
                  'min-h-[70px] md:min-h-[80px] p-1 rounded-md md:rounded-lg transition-colors relative',
                  'flex flex-col items-stretch',
                  isCurrentMonth ? 'hover:bg-gray-100' : 'text-gray-300',
                  isSelected && 'bg-primary-100 hover:bg-primary-100',
                  isDayToday && !isSelected && 'bg-primary-50'
                )}
              >
                <div className="flex items-center justify-between">
                  <span
                    className={cn(
                      'text-sm font-medium',
                      isDayToday && 'text-primary-600 font-bold',
                      isSelected && 'text-primary-700'
                    )}
                  >
                    {format(day, 'd')}
                  </span>

                  {/* Done/Failed indicators */}
                  {isCurrentMonth && (doneCount > 0 || failedCount > 0) && (
                    <div className="flex gap-0.5">
                      {doneCount > 0 && (
                        <span className="w-2 h-2 rounded-full bg-green-500" title={`${doneCount} erledigt`} />
                      )}
                      {failedCount > 0 && (
                        <span className="w-2 h-2 rounded-full bg-red-500" title={`${failedCount} fehlgeschlagen`} />
                      )}
                    </div>
                  )}
                </div>

                {/* Open task titles - show all with full titles */}
                {isCurrentMonth && openInstances.length > 0 && (
                  <div className="mt-1 space-y-0.5 text-left overflow-y-auto flex-1">
                    {openInstances.map((instance) => {
                      const taskColor = instance.template?.color;
                      const defaultColor = '#6B7280'; // Gray for tasks without color
                      const displayColor = taskColor || defaultColor;
                      return (
                        <div
                          key={instance.id}
                          className="text-[10px] leading-tight rounded px-1 py-0.5 truncate"
                          style={{
                            backgroundColor: `${displayColor}15`,
                            color: displayColor,
                            borderLeft: `2px solid ${displayColor}`,
                          }}
                          title={instance.template?.title}
                        >
                          {instance.template?.title}
                        </div>
                      );
                    })}
                  </div>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Selected day details */}
      {selectedDate && (
        <div className="bg-white md:card p-4 -mx-4 md:mx-0 md:rounded-lg">
          <h3 className="font-semibold text-gray-900 mb-3">
            {formatDate(selectedDate, 'EEEE, dd. MMMM yyyy')}
          </h3>

          {selectedInstances.length > 0 ? (
            <div className="space-y-4">
              {/* Open tasks */}
              {selectedInstances.filter(i => i.status === 'OPEN').length > 0 && (
                <div>
                  <h4 className="text-sm font-medium text-gray-600 mb-2 flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-primary-500" />
                    Offen ({selectedInstances.filter(i => i.status === 'OPEN').length})
                  </h4>
                  <div className="space-y-2">
                    {selectedInstances.filter(i => i.status === 'OPEN').map((instance) => (
                      <TaskCard
                        key={instance.id}
                        instance={instance}
                        onComplete={loadInstances}
                        onEdit={() => setEditingInstance(instance)}
                        onSnooze={loadInstances}
                        onDelete={loadInstances}
                      />
                    ))}
                  </div>
                </div>
              )}

              {/* Done tasks */}
              {selectedInstances.filter(i => i.status === 'DONE').length > 0 && (
                <div>
                  <h4 className="text-sm font-medium text-gray-600 mb-2 flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-green-500" />
                    Erledigt ({selectedInstances.filter(i => i.status === 'DONE').length})
                  </h4>
                  <div className="space-y-2">
                    {selectedInstances.filter(i => i.status === 'DONE').map((instance) => (
                      <TaskCard
                        key={instance.id}
                        instance={instance}
                        onComplete={loadInstances}
                        onEdit={() => setEditingInstance(instance)}
                        onSnooze={loadInstances}
                        onDelete={loadInstances}
                      />
                    ))}
                  </div>
                </div>
              )}

              {/* Failed tasks */}
              {selectedInstances.filter(i => i.status === 'FAILED').length > 0 && (
                <div>
                  <h4 className="text-sm font-medium text-gray-600 mb-2 flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-red-500" />
                    Fehlgeschlagen ({selectedInstances.filter(i => i.status === 'FAILED').length})
                  </h4>
                  <div className="space-y-2">
                    {selectedInstances.filter(i => i.status === 'FAILED').map((instance) => (
                      <TaskCard
                        key={instance.id}
                        instance={instance}
                        onComplete={loadInstances}
                        onEdit={() => setEditingInstance(instance)}
                        onSnooze={loadInstances}
                        onDelete={loadInstances}
                      />
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <p className="text-gray-500 text-center py-4">
              Keine Aufgaben an diesem Tag.
            </p>
          )}
        </div>
      )}

      {/* Instance Edit Modal */}
      {editingInstance && (
        <InstanceEditModal
          instance={editingInstance}
          onClose={() => setEditingInstance(null)}
          onSave={loadInstances}
          onEditTemplate={() => {
            navigate(`/tasks/${editingInstance.templateId}`);
            setEditingInstance(null);
          }}
        />
      )}
    </div>
  );
}
