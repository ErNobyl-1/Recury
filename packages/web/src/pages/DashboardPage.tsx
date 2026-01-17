import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, RefreshCw, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { instances as instancesApi, DashboardData } from '../lib/api';
import TaskCard from '../components/TaskCard';
import { cn } from '../lib/utils';
import { useTranslation } from '../i18n';

export default function DashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();
  const { t } = useTranslation();

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const dashboard = await instancesApi.dashboard();
      setData(dashboard);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : t('dashboard.loadError'));
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleTaskEdit = (templateId: string) => {
    navigate(`/tasks/${templateId}`);
  };

  if (loading && !data) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="animate-spin text-primary-600" size={32} />
      </div>
    );
  }

  if (error) {
    return (
      <div className="card p-6 text-center">
        <AlertTriangle className="mx-auto text-red-500 mb-2" size={32} />
        <p className="text-red-600">{error}</p>
        <button onClick={loadData} className="btn btn-primary mt-4">
          {t('common.retry')}
        </button>
      </div>
    );
  }

  if (!data) return null;

  const totalOverdue = data.today.overdue.length;
  const totalFailed = data.today.failed.length;
  const totalTodayOpen = data.today.open.length + totalOverdue;
  const totalTodayDone = data.today.done.length;

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">{t('dashboard.title')}</h1>
        <div className="flex gap-2">
          <button
            onClick={loadData}
            disabled={loading}
            className="btn btn-secondary p-2"
            title={t('common.refresh')}
          >
            <RefreshCw size={20} className={cn(loading && 'animate-spin')} />
          </button>
          <button
            onClick={() => navigate('/tasks/new')}
            className="btn btn-primary flex items-center gap-2"
          >
            <Plus size={20} />
            <span className="hidden sm:inline">{t('nav.newTask')}</span>
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="card p-4 text-center">
          <div className="text-2xl font-bold text-primary-600">{totalTodayOpen}</div>
          <div className="text-sm text-gray-500">{t('dashboard.openToday')}</div>
        </div>
        <div className="card p-4 text-center">
          <div className="text-2xl font-bold text-green-600">{totalTodayDone}</div>
          <div className="text-sm text-gray-500">{t('dashboard.done')}</div>
        </div>
        <div className="card p-4 text-center">
          <div className={cn('text-2xl font-bold', totalOverdue > 0 ? 'text-yellow-600' : 'text-gray-400')}>
            {totalOverdue}
          </div>
          <div className="text-sm text-gray-500">{t('dashboard.overdue')}</div>
        </div>
        <div className="card p-4 text-center">
          <div className={cn('text-2xl font-bold', totalFailed > 0 ? 'text-red-600' : 'text-gray-400')}>
            {totalFailed}
          </div>
          <div className="text-sm text-gray-500">{t('dashboard.failed')}</div>
        </div>
      </div>

      {/* Heute */}
      <section>
        <h2 className="text-lg font-semibold text-gray-900 mb-3">{t('dashboard.today')}</h2>

        {/* Overdue */}
        {data.today.overdue.length > 0 && (
          <div className="mb-4">
            <div className="flex items-center gap-2 text-yellow-700 mb-2">
              <AlertTriangle size={16} />
              <span className="text-sm font-medium">{t('dashboard.overdueCount', { count: data.today.overdue.length })}</span>
            </div>
            <div className="space-y-2">
              {data.today.overdue.map((instance) => (
                <TaskCard
                  key={instance.id}
                  instance={instance}
                  onComplete={loadData}
                  onEdit={() => handleTaskEdit(instance.templateId)}
                  onSnooze={loadData}
                  showDate
                />
              ))}
            </div>
          </div>
        )}

        {/* Open */}
        {data.today.open.length > 0 && (
          <div className="space-y-2 mb-4">
            {data.today.open.map((instance) => (
              <TaskCard
                key={instance.id}
                instance={instance}
                onComplete={loadData}
                onEdit={() => handleTaskEdit(instance.templateId)}
                onSnooze={loadData}
              />
            ))}
          </div>
        )}

        {/* Failed */}
        {data.today.failed.length > 0 && (
          <div className="mb-4">
            <div className="flex items-center gap-2 text-red-700 mb-2">
              <AlertTriangle size={16} />
              <span className="text-sm font-medium">{t('dashboard.failedCount', { count: data.today.failed.length })}</span>
            </div>
            <div className="space-y-2">
              {data.today.failed.map((instance) => (
                <TaskCard
                  key={instance.id}
                  instance={instance}
                  onComplete={loadData}
                  onEdit={() => handleTaskEdit(instance.templateId)}
                />
              ))}
            </div>
          </div>
        )}

        {/* Done */}
        {data.today.done.length > 0 && (
          <div className="mt-6">
            <div className="flex items-center gap-2 text-green-700 mb-2">
              <CheckCircle2 size={16} />
              <span className="text-sm font-medium">{t('dashboard.doneCount', { count: data.today.done.length })}</span>
            </div>
            <div className="space-y-2">
              {data.today.done.map((instance) => (
                <TaskCard
                  key={instance.id}
                  instance={instance}
                  onComplete={loadData}
                  onEdit={() => handleTaskEdit(instance.templateId)}
                />
              ))}
            </div>
          </div>
        )}

        {/* Empty state */}
        {totalTodayOpen === 0 && totalTodayDone === 0 && totalFailed === 0 && (
          <div className="card p-8 text-center text-gray-500">
            <p>{t('dashboard.noTasksToday')}</p>
            <button
              onClick={() => navigate('/tasks/new')}
              className="btn btn-primary mt-4"
            >
              {t('dashboard.createFirstTask')}
            </button>
          </div>
        )}
      </section>

      {/* Morgen */}
      <section>
        <h2 className="text-lg font-semibold text-gray-900 mb-3">{t('dashboard.tomorrow')}</h2>

        {data.tomorrow.open.length > 0 ? (
          <div className="space-y-2">
            {data.tomorrow.open.map((instance) => (
              <TaskCard
                key={instance.id}
                instance={instance}
                onComplete={loadData}
                onEdit={() => handleTaskEdit(instance.templateId)}
              />
            ))}
          </div>
        ) : (
          <div className="card p-6 text-center text-gray-500">
            <p>{t('dashboard.noTasksTomorrow')}</p>
          </div>
        )}
      </section>
    </div>
  );
}
