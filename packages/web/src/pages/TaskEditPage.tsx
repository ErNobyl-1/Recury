import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Save, Trash2 } from 'lucide-react';
import { templates as templatesApi, CreateTemplateInput } from '../lib/api';
import { format, parseISO } from 'date-fns';
import { cn } from '../lib/utils';

type ScheduleType = 'ONCE' | 'DAILY' | 'WEEKLY' | 'MONTHLY' | 'YEARLY' | 'INTERVAL';
type CarryPolicy = 'FAIL_ON_MISS' | 'CARRY_OVER_STACK';
type IntervalUnit = 'DAY' | 'WEEK' | 'MONTH' | 'YEAR';
type MonthlyMode = 'FIRST_DAY' | 'LAST_DAY' | 'SPECIFIC_DAY';

const WEEKDAYS = [
  { value: 1, label: 'Mo' },
  { value: 2, label: 'Di' },
  { value: 3, label: 'Mi' },
  { value: 4, label: 'Do' },
  { value: 5, label: 'Fr' },
  { value: 6, label: 'Sa' },
  { value: 0, label: 'So' },
];

export default function TaskEditPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const isNew = !id || id === 'new';

  const [loading, setLoading] = useState(!isNew);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form state
  const [title, setTitle] = useState('');
  const [notes, setNotes] = useState('');
  const [scheduleType, setScheduleType] = useState<ScheduleType>('DAILY');
  const [carryPolicy, setCarryPolicy] = useState<CarryPolicy>('CARRY_OVER_STACK');

  // Schedule-specific fields
  const [startDate, setStartDate] = useState('');
  const [anchorDate, setAnchorDate] = useState('');
  const [weeklyDays, setWeeklyDays] = useState<number[]>([1]); // Default: Monday
  const [monthlyDay, setMonthlyDay] = useState(1);
  const [monthlyMode, setMonthlyMode] = useState<MonthlyMode>('SPECIFIC_DAY');
  const [yearlyMonth, setYearlyMonth] = useState(1);
  const [yearlyDay, setYearlyDay] = useState(1);
  const [intervalValue, setIntervalValue] = useState(1);
  const [intervalUnit, setIntervalUnit] = useState<IntervalUnit>('WEEK');
  const [dueTime, setDueTime] = useState('');
  const [tags, setTags] = useState('');

  useEffect(() => {
    if (!isNew && id) {
      loadTemplate(id);
    }
  }, [id, isNew]);

  const loadTemplate = async (templateId: string) => {
    try {
      const template = await templatesApi.get(templateId);
      setTitle(template.title);
      setNotes(template.notes || '');
      setScheduleType(template.scheduleType);
      setCarryPolicy(template.carryPolicy);
      setStartDate(template.startDate ? format(parseISO(template.startDate), 'yyyy-MM-dd') : '');
      setAnchorDate(template.anchorDate ? format(parseISO(template.anchorDate), 'yyyy-MM-dd') : '');
      setWeeklyDays(template.weeklyDays ? template.weeklyDays.split(',').map(Number) : [1]);
      setMonthlyDay(template.monthlyDay || 1);
      setMonthlyMode(template.monthlyMode || 'SPECIFIC_DAY');
      setYearlyMonth(template.yearlyMonth || 1);
      setYearlyDay(template.yearlyDay || 1);
      setIntervalValue(template.intervalValue || 1);
      setIntervalUnit(template.intervalUnit || 'WEEK');
      setDueTime(template.dueTime || '');
      setTags(template.tags || '');
    } catch (error) {
      console.error('Failed to load template:', error);
      setError('Aufgabe konnte nicht geladen werden');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSaving(true);

    try {
      const data: CreateTemplateInput = {
        title,
        notes: notes || null,
        scheduleType,
        carryPolicy,
        startDate: startDate ? new Date(startDate).toISOString() : null,
        dueTime: dueTime || null,
        tags: tags || null,
      };

      // Schedule-specific fields
      switch (scheduleType) {
        case 'ONCE':
          data.anchorDate = anchorDate ? new Date(anchorDate).toISOString() : null;
          break;
        case 'WEEKLY':
          data.weeklyDays = weeklyDays.sort().join(',');
          break;
        case 'MONTHLY':
          data.monthlyMode = monthlyMode;
          if (monthlyMode === 'SPECIFIC_DAY') {
            data.monthlyDay = monthlyDay;
          }
          break;
        case 'YEARLY':
          data.yearlyMonth = yearlyMonth;
          data.yearlyDay = yearlyDay;
          break;
        case 'INTERVAL':
          data.anchorDate = anchorDate ? new Date(anchorDate).toISOString() : new Date().toISOString();
          data.intervalUnit = intervalUnit;
          data.intervalValue = intervalValue;
          break;
      }

      if (isNew) {
        await templatesApi.create(data);
      } else {
        await templatesApi.update(id!, data);
      }

      navigate('/tasks');
    } catch (error) {
      console.error('Failed to save template:', error);
      setError(error instanceof Error ? error.message : 'Speichern fehlgeschlagen');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm('Aufgabe wirklich dauerhaft löschen?')) return;

    try {
      await templatesApi.delete(id!, true);
      navigate('/tasks');
    } catch (error) {
      console.error('Failed to delete template:', error);
    }
  };

  const toggleWeekday = (day: number) => {
    if (weeklyDays.includes(day)) {
      if (weeklyDays.length > 1) {
        setWeeklyDays(weeklyDays.filter(d => d !== day));
      }
    } else {
      setWeeklyDays([...weeklyDays, day]);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600" />
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-4 mb-6">
        <button
          onClick={() => navigate(-1)}
          className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
        >
          <ArrowLeft size={24} />
        </button>
        <h1 className="text-2xl font-bold text-gray-900">
          {isNew ? 'Neue Aufgabe' : 'Aufgabe bearbeiten'}
        </h1>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Basic Info */}
        <div className="card p-6 space-y-4">
          <h2 className="font-semibold text-gray-900">Grunddaten</h2>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Titel *
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="input"
              placeholder="z.B. Müll rausbringen"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Notizen
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="input"
              rows={3}
              placeholder="Optionale Notizen..."
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Tags
            </label>
            <input
              type="text"
              value={tags}
              onChange={(e) => setTags(e.target.value)}
              className="input"
              placeholder="z.B. Haushalt, Wichtig"
            />
          </div>
        </div>

        {/* Schedule */}
        <div className="card p-6 space-y-4">
          <h2 className="font-semibold text-gray-900">Wiederholung</h2>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Wiederholungsart *
            </label>
            <select
              value={scheduleType}
              onChange={(e) => setScheduleType(e.target.value as ScheduleType)}
              className="input"
            >
              <option value="ONCE">Einmalig</option>
              <option value="DAILY">Täglich</option>
              <option value="WEEKLY">Wöchentlich</option>
              <option value="MONTHLY">Monatlich</option>
              <option value="YEARLY">Jährlich</option>
              <option value="INTERVAL">Alle X Tage/Wochen/...</option>
            </select>
          </div>

          {/* Start Date - für alle Typen außer ONCE */}
          {scheduleType !== 'ONCE' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Gültig ab (optional)
              </label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="input"
              />
              <p className="text-sm text-gray-500 mt-1">
                Leer = ab heute. Setze ein Datum, um die Aufgabe erst später oder rückwirkend zu starten.
              </p>
            </div>
          )}

          {/* ONCE specific */}
          {scheduleType === 'ONCE' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Datum *
              </label>
              <input
                type="date"
                value={anchorDate}
                onChange={(e) => setAnchorDate(e.target.value)}
                className="input"
                required
              />
            </div>
          )}

          {/* WEEKLY specific */}
          {scheduleType === 'WEEKLY' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Wochentage *
              </label>
              <div className="flex flex-wrap gap-2">
                {WEEKDAYS.map(({ value, label }) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => toggleWeekday(value)}
                    className={cn(
                      'px-4 py-2 rounded-lg border transition-colors',
                      weeklyDays.includes(value)
                        ? 'bg-primary-600 text-white border-primary-600'
                        : 'bg-white text-gray-700 border-gray-300 hover:border-primary-400'
                    )}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* MONTHLY specific */}
          {scheduleType === 'MONTHLY' && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Modus
                </label>
                <select
                  value={monthlyMode}
                  onChange={(e) => setMonthlyMode(e.target.value as MonthlyMode)}
                  className="input"
                >
                  <option value="SPECIFIC_DAY">Bestimmter Tag</option>
                  <option value="FIRST_DAY">Erster Tag des Monats</option>
                  <option value="LAST_DAY">Letzter Tag des Monats</option>
                </select>
              </div>

              {monthlyMode === 'SPECIFIC_DAY' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Tag im Monat
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={31}
                    value={monthlyDay}
                    onChange={(e) => setMonthlyDay(parseInt(e.target.value) || 1)}
                    className="input w-24"
                  />
                </div>
              )}
            </div>
          )}

          {/* YEARLY specific */}
          {scheduleType === 'YEARLY' && (
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Tag
                </label>
                <input
                  type="number"
                  min={1}
                  max={31}
                  value={yearlyDay}
                  onChange={(e) => setYearlyDay(parseInt(e.target.value) || 1)}
                  className="input"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Monat
                </label>
                <select
                  value={yearlyMonth}
                  onChange={(e) => setYearlyMonth(parseInt(e.target.value))}
                  className="input"
                >
                  <option value={1}>Januar</option>
                  <option value={2}>Februar</option>
                  <option value={3}>März</option>
                  <option value={4}>April</option>
                  <option value={5}>Mai</option>
                  <option value={6}>Juni</option>
                  <option value={7}>Juli</option>
                  <option value={8}>August</option>
                  <option value={9}>September</option>
                  <option value={10}>Oktober</option>
                  <option value={11}>November</option>
                  <option value={12}>Dezember</option>
                </select>
              </div>
            </div>
          )}

          {/* INTERVAL specific */}
          {scheduleType === 'INTERVAL' && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Alle
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={365}
                    value={intervalValue}
                    onChange={(e) => setIntervalValue(parseInt(e.target.value) || 1)}
                    className="input"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Einheit
                  </label>
                  <select
                    value={intervalUnit}
                    onChange={(e) => setIntervalUnit(e.target.value as IntervalUnit)}
                    className="input"
                  >
                    <option value="DAY">Tage</option>
                    <option value="WEEK">Wochen</option>
                    <option value="MONTH">Monate</option>
                    <option value="YEAR">Jahre</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Startdatum (Anker)
                </label>
                <input
                  type="date"
                  value={anchorDate}
                  onChange={(e) => setAnchorDate(e.target.value)}
                  className="input"
                />
                <p className="text-sm text-gray-500 mt-1">
                  Das Intervall wird ab diesem Datum berechnet. Für "Woche A/B" wähle hier den Beginn von Woche A und setze Intervall auf 2 Wochen.
                </p>
              </div>
            </div>
          )}

          {/* Due Time */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Fällig um (optional)
            </label>
            <input
              type="time"
              value={dueTime}
              onChange={(e) => setDueTime(e.target.value)}
              className="input w-32"
            />
          </div>
        </div>

        {/* Behavior */}
        <div className="card p-6 space-y-4">
          <h2 className="font-semibold text-gray-900">Verhalten bei Verpassen</h2>

          <div className="space-y-3">
            <label className="flex items-start gap-3 p-3 rounded-lg border cursor-pointer hover:bg-gray-50 transition-colors">
              <input
                type="radio"
                name="carryPolicy"
                value="CARRY_OVER_STACK"
                checked={carryPolicy === 'CARRY_OVER_STACK'}
                onChange={(e) => setCarryPolicy(e.target.value as CarryPolicy)}
                className="mt-1"
              />
              <div>
                <div className="font-medium text-gray-900">Stapelt sich auf</div>
                <div className="text-sm text-gray-500">
                  Verpasste Aufgaben bleiben offen und werden als "überfällig" angezeigt
                </div>
              </div>
            </label>

            <label className="flex items-start gap-3 p-3 rounded-lg border cursor-pointer hover:bg-gray-50 transition-colors">
              <input
                type="radio"
                name="carryPolicy"
                value="FAIL_ON_MISS"
                checked={carryPolicy === 'FAIL_ON_MISS'}
                onChange={(e) => setCarryPolicy(e.target.value as CarryPolicy)}
                className="mt-1"
              />
              <div>
                <div className="font-medium text-gray-900">Fehlschlag bei Verpassen</div>
                <div className="text-sm text-gray-500">
                  Verpasste Aufgaben werden als "fehlgeschlagen" markiert und können nicht mehr erledigt werden
                </div>
              </div>
            </label>
          </div>
        </div>

        {/* Error */}
        {error && (
          <div className="p-4 bg-red-50 text-red-700 rounded-lg">
            {error}
          </div>
        )}

        {/* Actions */}
        <div className="flex items-center justify-between">
          {!isNew && (
            <button
              type="button"
              onClick={handleDelete}
              className="btn btn-danger flex items-center gap-2"
            >
              <Trash2 size={20} />
              <span>Löschen</span>
            </button>
          )}

          <div className="flex gap-3 ml-auto">
            <button
              type="button"
              onClick={() => navigate(-1)}
              className="btn btn-secondary"
            >
              Abbrechen
            </button>
            <button
              type="submit"
              disabled={saving}
              className="btn btn-primary flex items-center gap-2"
            >
              <Save size={20} />
              <span>{saving ? 'Speichern...' : 'Speichern'}</span>
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}
