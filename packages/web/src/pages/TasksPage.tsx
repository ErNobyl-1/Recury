import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Search, Copy, Archive, Trash2, RotateCcw } from 'lucide-react';
import { templates as templatesApi, Template } from '../lib/api';
import { getScheduleTypeLabel, cn, formatWeekdays, getIntervalLabel, getMonthlyModeLabel } from '../lib/utils';

type StatusFilter = 'active' | 'archived' | 'all';
type TypeFilter = string | '';

export default function TasksPage() {
  const [templateList, setTemplateList] = useState<Template[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('active');
  const [typeFilter, setTypeFilter] = useState<TypeFilter>('');
  const navigate = useNavigate();

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
    if (!confirm('Aufgabe wirklich dauerhaft löschen? Alle Instanzen werden ebenfalls gelöscht.')) {
      return;
    }
    try {
      await templatesApi.delete(id, true);
      loadTemplates();
    } catch (error) {
      console.error('Failed to delete template:', error);
    }
  };

  const getScheduleDescription = (template: Template): string => {
    switch (template.scheduleType) {
      case 'DAILY':
        return 'Täglich';
      case 'WEEKLY':
        return `Wöchentlich: ${formatWeekdays(template.weeklyDays)}`;
      case 'MONTHLY':
        return getMonthlyModeLabel(template.monthlyMode, template.monthlyDay);
      case 'YEARLY':
        return `Jährlich am ${template.yearlyDay}.${template.yearlyMonth}.`;
      case 'INTERVAL':
        return getIntervalLabel(template.intervalUnit, template.intervalValue);
      case 'ONCE':
        return template.anchorDate
          ? `Einmalig am ${new Date(template.anchorDate).toLocaleDateString('de-DE')}`
          : 'Einmalig (kein Datum)';
      default:
        return template.scheduleType;
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Aufgaben</h1>
        <button
          onClick={() => navigate('/tasks/new')}
          className="btn btn-primary flex items-center gap-2"
        >
          <Plus size={20} />
          <span>Neue Aufgabe</span>
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
              placeholder="Suchen..."
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
            <option value="active">Aktiv</option>
            <option value="archived">Archiviert</option>
            <option value="all">Alle</option>
          </select>

          {/* Type Filter */}
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="input w-auto"
          >
            <option value="">Alle Typen</option>
            <option value="once">Einmalig</option>
            <option value="daily">Täglich</option>
            <option value="weekly">Wöchentlich</option>
            <option value="monthly">Monatlich</option>
            <option value="yearly">Jährlich</option>
            <option value="interval">Intervall</option>
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
          <p>Keine Aufgaben gefunden.</p>
          {statusFilter === 'active' && !search && !typeFilter && (
            <button
              onClick={() => navigate('/tasks/new')}
              className="btn btn-primary mt-4"
            >
              Erste Aufgabe erstellen
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
                        title={`Farbe: ${template.color}`}
                      />
                    )}
                    <h3 className="font-medium text-gray-900 truncate">{template.title}</h3>
                    {!template.isActive && (
                      <span className="badge bg-gray-200 text-gray-600">Archiviert</span>
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
                      {template.carryPolicy === 'FAIL_ON_MISS' ? 'Failt' : 'Stapelt'}
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
                    title="Duplizieren"
                  >
                    <Copy size={18} className="text-gray-500" />
                  </button>

                  {template.isActive ? (
                    <button
                      onClick={(e) => handleArchive(e, template.id)}
                      className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                      title="Archivieren"
                    >
                      <Archive size={18} className="text-gray-500" />
                    </button>
                  ) : (
                    <>
                      <button
                        onClick={(e) => handleRestore(e, template.id)}
                        className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                        title="Wiederherstellen"
                      >
                        <RotateCcw size={18} className="text-gray-500" />
                      </button>
                      <button
                        onClick={(e) => handleDelete(e, template.id)}
                        className="p-2 hover:bg-red-100 rounded-lg transition-colors"
                        title="Endgültig löschen"
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
