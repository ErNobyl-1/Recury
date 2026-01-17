import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Search, Copy, Archive, Trash2, RotateCcw } from 'lucide-react';
import { templates as templatesApi, Template } from '../lib/api';
import { cn } from '../lib/utils';
import { useTranslation } from '../i18n';

type StatusFilter = 'active' | 'archived' | 'all';
type TypeFilter = string | '';

export default function TasksPage() {
  const [templateList, setTemplateList] = useState<Template[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('active');
  const [typeFilter, setTypeFilter] = useState<TypeFilter>('');
  const navigate = useNavigate();
  const { t, locale } = useTranslation();

  const loadTemplates = useCallback(async () => {
    setLoading(true);
    try {
      const data = await templatesApi.list({
        status: statusFilter,
        type: typeFilter || undefined,
        search: search || undefined,
      });
      setTemplateList(data);
    } catch (error) {
      console.error('Failed to load templates:', error);
    } finally {
      setLoading(false);
    }
  }, [statusFilter, typeFilter, search]);

  useEffect(() => {
    loadTemplates();
  }, [loadTemplates]);

  const handleDuplicate = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    try {
      await templatesApi.duplicate(id);
      loadTemplates();
    } catch (error) {
      console.error('Failed to duplicate template:', error);
    }
  };

  const handleArchive = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    try {
      await templatesApi.update(id, { isActive: false });
      loadTemplates();
    } catch (error) {
      console.error('Failed to archive template:', error);
    }
  };

  const handleRestore = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    try {
      await templatesApi.update(id, { isActive: true });
      loadTemplates();
    } catch (error) {
      console.error('Failed to restore template:', error);
    }
  };

  const handleDelete = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (!confirm(t('tasks.deleteConfirmWithInstances'))) {
      return;
    }
    try {
      await templatesApi.delete(id, true);
      loadTemplates();
    } catch (error) {
      console.error('Failed to delete template:', error);
    }
  };

  const getScheduleTypeLabel = (type: string): string => {
    const labels: Record<string, string> = {
      ONCE: t('scheduleLabels.once'),
      DAILY: t('scheduleLabels.daily'),
      WEEKLY: t('scheduleLabels.weekly'),
      MONTHLY: t('scheduleLabels.monthly'),
      YEARLY: t('scheduleLabels.yearly'),
      INTERVAL: t('scheduleLabels.interval'),
    };
    return labels[type] || type;
  };

  const formatWeekdays = (weeklyDays: string | null): string => {
    if (!weeklyDays) return '';
    const dayKeys = ['su', 'mo', 'tu', 'we', 'th', 'fr', 'sa'];
    return weeklyDays.split(',').map(d => {
      const dayNum = parseInt(d, 10);
      return t(`weekdays.short.${dayKeys[dayNum]}`);
    }).join(', ');
  };

  const getIntervalLabel = (unit: string | null, value: number | null): string => {
    if (!unit || !value) return '';
    const unitKey = unit.toLowerCase();
    const unitLabel = value === 1 ? t(`intervalUnits.${unitKey}`) : t(`intervalUnits.${unitKey}_plural`);
    return t('scheduleLabels.everyInterval', { value, unit: unitLabel });
  };

  const getMonthlyModeLabel = (mode: string | null, day: number | null): string => {
    if (mode === 'FIRST_DAY') return t('scheduleLabels.monthlyFirst');
    if (mode === 'LAST_DAY') return t('scheduleLabels.monthlyLast');
    if (day) return t('scheduleLabels.monthlyDay', { day });
    return '';
  };

  const getScheduleDescription = (template: Template): string => {
    switch (template.scheduleType) {
      case 'DAILY':
        return t('scheduleLabels.daily');
      case 'WEEKLY':
        return t('scheduleLabels.weeklyOn', { days: formatWeekdays(template.weeklyDays) });
      case 'MONTHLY':
        return getMonthlyModeLabel(template.monthlyMode, template.monthlyDay);
      case 'YEARLY':
        return t('scheduleLabels.yearlyOn', { day: template.yearlyDay ?? '', month: template.yearlyMonth ?? '' });
      case 'INTERVAL':
        return getIntervalLabel(template.intervalUnit, template.intervalValue);
      case 'ONCE':
        return template.anchorDate
          ? t('scheduleLabels.onceWithDate', { date: new Date(template.anchorDate).toLocaleDateString(locale === 'de' ? 'de-DE' : 'en-US') })
          : t('scheduleLabels.onceNoDate');
      default:
        return template.scheduleType;
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">{t('tasks.title')}</h1>
        <button
          onClick={() => navigate('/tasks/new')}
          className="btn btn-primary flex items-center gap-2"
        >
          <Plus size={20} />
          <span>{t('nav.newTask')}</span>
        </button>
      </div>

      {/* Filters */}
      <div className="card p-4 space-y-4">
        <div className="flex flex-col sm:flex-row gap-4">
          {/* Search */}
          <div className="relative flex-1">
            <Search size={20} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder={t('common.search')}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="input pl-10"
            />
          </div>

          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as StatusFilter)}
            className="input w-auto"
          >
            <option value="active">{t('tasks.filters.active')}</option>
            <option value="archived">{t('tasks.filters.archived')}</option>
            <option value="all">{t('tasks.filters.all')}</option>
          </select>

          {/* Type Filter */}
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="input w-auto"
          >
            <option value="">{t('tasks.filters.allTypes')}</option>
            <option value="once">{t('tasks.schedule.once')}</option>
            <option value="daily">{t('tasks.schedule.daily')}</option>
            <option value="weekly">{t('tasks.schedule.weekly')}</option>
            <option value="monthly">{t('tasks.schedule.monthly')}</option>
            <option value="yearly">{t('tasks.schedule.yearly')}</option>
            <option value="interval">{t('scheduleLabels.interval')}</option>
          </select>
        </div>
      </div>

      {/* Template List */}
      {loading ? (
        <div className="text-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600 mx-auto" />
        </div>
      ) : templateList.length === 0 ? (
        <div className="card p-8 text-center text-gray-500">
          <p>{t('tasks.noTasksFound')}</p>
          {statusFilter === 'active' && !search && !typeFilter && (
            <button
              onClick={() => navigate('/tasks/new')}
              className="btn btn-primary mt-4"
            >
              {t('tasks.createFirst')}
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-2">
          {templateList.map((template) => (
            <div
              key={template.id}
              onClick={() => navigate(`/tasks/${template.id}`)}
              className={cn(
                'card p-4 cursor-pointer hover:shadow-md transition-shadow',
                !template.isActive && 'opacity-60'
              )}
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    {template.color && (
                      <span
                        className="w-3 h-3 rounded-full flex-shrink-0"
                        style={{ backgroundColor: template.color }}
                        title={`${t('tasks.form.color')}: ${template.color}`}
                      />
                    )}
                    <h3 className="font-medium text-gray-900 truncate">{template.title}</h3>
                    {!template.isActive && (
                      <span className="badge bg-gray-200 text-gray-600">{t('tasks.badges.archived')}</span>
                    )}
                  </div>

                  <div className="flex flex-wrap gap-2 text-sm text-gray-500">
                    <span className="badge bg-primary-100 text-primary-700">
                      {getScheduleTypeLabel(template.scheduleType)}
                    </span>
                    <span>{getScheduleDescription(template)}</span>
                    <span className={cn(
                      'badge',
                      template.carryPolicy === 'FAIL_ON_MISS'
                        ? 'bg-red-100 text-red-700'
                        : 'bg-yellow-100 text-yellow-700'
                    )}>
                      {template.carryPolicy === 'FAIL_ON_MISS' ? t('tasks.badges.fails') : t('tasks.badges.stacks')}
                    </span>
                  </div>

                  {template.notes && (
                    <p className="text-sm text-gray-500 mt-2 truncate">{template.notes}</p>
                  )}
                </div>

                {/* Actions */}
                <div className="flex items-center gap-1 flex-shrink-0">
                  <button
                    onClick={(e) => handleDuplicate(e, template.id)}
                    className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                    title={t('tasks.actions.duplicate')}
                  >
                    <Copy size={18} className="text-gray-500" />
                  </button>

                  {template.isActive ? (
                    <button
                      onClick={(e) => handleArchive(e, template.id)}
                      className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                      title={t('tasks.actions.archive')}
                    >
                      <Archive size={18} className="text-gray-500" />
                    </button>
                  ) : (
                    <>
                      <button
                        onClick={(e) => handleRestore(e, template.id)}
                        className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                        title={t('tasks.actions.restore')}
                      >
                        <RotateCcw size={18} className="text-gray-500" />
                      </button>
                      <button
                        onClick={(e) => handleDelete(e, template.id)}
                        className="p-2 hover:bg-red-100 rounded-lg transition-colors"
                        title={t('tasks.actions.deletePermanent')}
                      >
                        <Trash2 size={18} className="text-red-500" />
                      </button>
                    </>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
