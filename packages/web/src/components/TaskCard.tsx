import { Check, Clock, AlertCircle, ChevronRight, MoreVertical, Trash2, Edit3 } from 'lucide-react';
import { useState } from 'react';
import { Instance, instances as instancesApi } from '../lib/api';
import { formatDate, formatTime, isOverdue, cn } from '../lib/utils';

interface TaskCardProps {
  instance: Instance;
  onComplete?: () => void;
  onEdit?: () => void;
  onSnooze?: () => void;
  onDelete?: () => void;
  showDate?: boolean;
}

export default function TaskCard({
  instance,
  onComplete,
  onEdit,
  onSnooze,
  onDelete,
  showDate = false,
}: TaskCardProps) {
  const [loading, setLoading] = useState(false);
  const [showMenu, setShowMenu] = useState(false);

  const isTaskOverdue = instance.status === 'OPEN' && isOverdue(instance.date);
  const isDone = instance.status === 'DONE';
  const isFailed = instance.status === 'FAILED';

  const handleComplete = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (loading || isDone || isFailed) return;

    setLoading(true);
    try {
      await instancesApi.complete(instance.id);
      onComplete?.();
    } catch (error) {
      console.error('Failed to complete task:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleUncomplete = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (loading || !isDone) return;

    setLoading(true);
    try {
      await instancesApi.uncomplete(instance.id);
      onComplete?.();
    } catch (error) {
      console.error('Failed to uncomplete task:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSnooze = async () => {
    if (loading) return;

    setLoading(true);
    try {
      await instancesApi.snooze(instance.id);
      onSnooze?.();
    } catch (error) {
      console.error('Failed to snooze task:', error);
    } finally {
      setLoading(false);
      setShowMenu(false);
    }
  };

  const handleDelete = async () => {
    if (loading) return;

    setLoading(true);
    try {
      await instancesApi.delete(instance.id);
      onDelete?.();
    } catch (error) {
      console.error('Failed to delete instance:', error);
    } finally {
      setLoading(false);
      setShowMenu(false);
    }
  };

  // Use custom values if set, otherwise fall back to template
  const displayTitle = instance.customTitle || instance.template.title;
  const displayNotes = instance.customNotes || instance.template.notes;
  const hasCustomization = instance.customTitle || instance.customNotes;

  return (
    <div
      className={cn(
        'task-card',
        isDone && 'opacity-60',
        isFailed && 'border-red-200 bg-red-50'
      )}
      onClick={onEdit}
    >
      {/* Checkbox */}
      <button
        onClick={isDone ? handleUncomplete : handleComplete}
        disabled={loading || isFailed}
        className={cn(
          'task-checkbox flex-shrink-0',
          isDone && 'done',
          loading && 'opacity-50',
          isFailed && 'border-red-400 cursor-not-allowed'
        )}
      >
        {isDone && <Check size={16} className="text-white" />}
        {isFailed && <AlertCircle size={16} className="text-red-500" />}
      </button>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className={cn('font-medium truncate', isDone && 'line-through')}>
            {displayTitle}
          </span>
          {hasCustomization && (
            <span title="Angepasster Termin">
              <Edit3 size={12} className="text-blue-500 flex-shrink-0" />
            </span>
          )}
          {isTaskOverdue && (
            <span className="badge badge-overdue flex-shrink-0">Ueberfaellig</span>
          )}
          {isFailed && (
            <span className="badge badge-failed flex-shrink-0">Fehlgeschlagen</span>
          )}
          {instance.template.carryPolicy === 'CARRY_OVER_STACK' && isTaskOverdue && (
            <span className="badge badge-carry flex-shrink-0">Stapelt</span>
          )}
        </div>

        <div className="flex items-center gap-3 text-sm text-gray-500 mt-1">
          {showDate && (
            <span>{formatDate(instance.date)}</span>
          )}
          {instance.template.dueTime && (
            <span className="flex items-center gap-1">
              <Clock size={14} />
              {formatTime(instance.template.dueTime)}
            </span>
          )}
          {displayNotes && (
            <span className="truncate">{displayNotes}</span>
          )}
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-1 flex-shrink-0">
        {!isDone && !isFailed && (
          <div className="relative">
            <button
              onClick={(e) => {
                e.stopPropagation();
                setShowMenu(!showMenu);
              }}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <MoreVertical size={20} className="text-gray-400" />
            </button>

            {showMenu && (
              <>
                <div
                  className="fixed inset-0 z-10"
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowMenu(false);
                  }}
                />
                <div className="absolute right-0 bottom-full mb-1 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-20 min-w-[180px]">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleSnooze();
                    }}
                    className="w-full px-4 py-2 text-left text-sm hover:bg-gray-100 transition-colors"
                  >
                    Auf morgen schieben
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setShowMenu(false);
                      onEdit?.();
                    }}
                    className="w-full px-4 py-2 text-left text-sm hover:bg-gray-100 transition-colors"
                  >
                    Diesen Termin bearbeiten
                  </button>
                  <hr className="my-1 border-gray-200" />
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      if (confirm('Diesen Termin wirklich loeschen?')) {
                        handleDelete();
                      } else {
                        setShowMenu(false);
                      }
                    }}
                    className="w-full px-4 py-2 text-left text-sm text-red-600 hover:bg-red-50 transition-colors flex items-center gap-2"
                  >
                    <Trash2 size={14} />
                    Termin loeschen
                  </button>
                </div>
              </>
            )}
          </div>
        )}
        <ChevronRight size={20} className="text-gray-300" />
      </div>
    </div>
  );
}
