import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Save, Trash2 } from 'lucide-react';
import { templates as templatesApi, CreateTemplateInput } from '../lib/api';
import { format, parseISO } from 'date-fns';
import { cn } from '../lib/utils';
import { useTranslation } from '../i18n';

type ScheduleType = 'ONCE' | 'DAILY' | 'WEEKLY' | 'MONTHLY' | 'YEARLY' | 'INTERVAL';
type CarryPolicy = 'FAIL_ON_MISS' | 'CARRY_OVER_STACK';
type IntervalUnit = 'DAY' | 'WEEK' | 'MONTH' | 'YEAR';
type MonthlyMode = 'FIRST_DAY' | 'LAST_DAY' | 'SPECIFIC_DAY';

export default function TaskEditPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { t } = useTranslation();
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
  const [color, setColor] = useState<string | null>(null);

  const WEEKDAYS = [
    { value: 1, label: t('weekdays.short.mo') },
    { value: 2, label: t('weekdays.short.tu') },
    { value: 3, label: t('weekdays.short.we') },
    { value: 4, label: t('weekdays.short.th') },
    { value: 5, label: t('weekdays.short.fr') },
    { value: 6, label: t('weekdays.short.sa') },
    { value: 0, label: t('weekdays.short.su') },
  ];

  const PRESET_COLORS = [
    { value: '#EF4444', label: t('colors.red') },
    { value: '#F97316', label: t('colors.orange') },
    { value: '#EAB308', label: t('colors.yellow') },
    { value: '#22C55E', label: t('colors.green') },
    { value: '#14B8A6', label: t('colors.teal') },
    { value: '#3B82F6', label: t('colors.blue') },
    { value: '#8B5CF6', label: t('colors.violet') },
    { value: '#EC4899', label: t('colors.pink') },
    { value: '#6B7280', label: t('colors.gray') },
  ];

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
      setColor(template.color || null);
    } catch (error) {
      console.error('Failed to load template:', error);
      setError(t('tasks.loadError'));
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
        color: color || null,
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
      setError(error instanceof Error ? error.message : t('tasks.saveError'));
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm(t('tasks.deleteConfirm'))) return;

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
          {isNew ? t('tasks.newTask') : t('tasks.editTask')}
        </h1>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Basic Info */}
        <div className="card p-6 space-y-4">
          <h2 className="font-semibold text-gray-900">{t('tasks.form.basicInfo')}</h2>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {t('tasks.form.titleRequired')}
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="input"
              placeholder={t('tasks.form.titlePlaceholder')}
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {t('tasks.form.notes')}
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="input"
              rows={3}
              placeholder={t('tasks.form.notesPlaceholder')}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {t('tasks.form.tags')}
            </label>
            <input
              type="text"
              value={tags}
              onChange={(e) => setTags(e.target.value)}
              className="input"
              placeholder={t('tasks.form.tagsPlaceholder')}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              {t('tasks.form.color')}
            </label>
            <div className="flex flex-wrap gap-2 items-center">
              {/* No color option */}
              <button
                type="button"
                onClick={() => setColor(null)}
                className={cn(
                  'w-8 h-8 rounded-full border-2 transition-all flex items-center justify-center',
                  color === null
                    ? 'border-gray-900 ring-2 ring-gray-400'
                    : 'border-gray-300 hover:border-gray-400'
                )}
                title={t('tasks.form.noColor')}
              >
                <span className="text-gray-400 text-xs">-</span>
              </button>
              {/* Preset colors */}
              {PRESET_COLORS.map((preset) => (
                <button
                  key={preset.value}
                  type="button"
                  onClick={() => setColor(preset.value)}
                  className={cn(
                    'w-8 h-8 rounded-full border-2 transition-all',
                    color === preset.value
                      ? 'border-gray-900 ring-2 ring-gray-400'
                      : 'border-transparent hover:scale-110'
                  )}
                  style={{ backgroundColor: preset.value }}
                  title={preset.label}
                />
              ))}
              {/* Custom color picker */}
              <div className="relative">
                <input
                  type="color"
                  value={color || '#3B82F6'}
                  onChange={(e) => setColor(e.target.value)}
                  className="absolute inset-0 w-8 h-8 opacity-0 cursor-pointer"
                  title={t('tasks.form.customColor')}
                />
                <div
                  className={cn(
                    'w-8 h-8 rounded-full border-2 flex items-center justify-center cursor-pointer',
                    color && !PRESET_COLORS.some(p => p.value === color)
                      ? 'border-gray-900 ring-2 ring-gray-400'
                      : 'border-gray-300 hover:border-gray-400'
                  )}
                  style={{
                    backgroundColor: color && !PRESET_COLORS.some(p => p.value === color) ? color : 'white'
                  }}
                  title={t('tasks.form.customColor')}
                >
                  {(!color || PRESET_COLORS.some(p => p.value === color)) && (
                    <span className="text-gray-400 text-xs">+</span>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Schedule */}
        <div className="card p-6 space-y-4">
          <h2 className="font-semibold text-gray-900">{t('tasks.schedule.title')}</h2>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {t('tasks.schedule.typeLabel')}
            </label>
            <select
              value={scheduleType}
              onChange={(e) => setScheduleType(e.target.value as ScheduleType)}
              className="input"
            >
              <option value="ONCE">{t('tasks.schedule.once')}</option>
              <option value="DAILY">{t('tasks.schedule.daily')}</option>
              <option value="WEEKLY">{t('tasks.schedule.weekly')}</option>
              <option value="MONTHLY">{t('tasks.schedule.monthly')}</option>
              <option value="YEARLY">{t('tasks.schedule.yearly')}</option>
              <option value="INTERVAL">{t('tasks.schedule.interval')}</option>
            </select>
          </div>

          {/* Start Date - for all types except ONCE */}
          {scheduleType !== 'ONCE' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {t('tasks.schedule.startDate')}
              </label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="input"
              />
              <p className="text-sm text-gray-500 mt-1">
                {t('tasks.schedule.startDateHint')}
              </p>
            </div>
          )}

          {/* ONCE specific */}
          {scheduleType === 'ONCE' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {t('tasks.schedule.date')}
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
                {t('tasks.schedule.weekdays')}
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
                  {t('tasks.schedule.monthlyMode')}
                </label>
                <select
                  value={monthlyMode}
                  onChange={(e) => setMonthlyMode(e.target.value as MonthlyMode)}
                  className="input"
                >
                  <option value="SPECIFIC_DAY">{t('tasks.schedule.monthlySpecificDay')}</option>
                  <option value="FIRST_DAY">{t('tasks.schedule.monthlyFirstDay')}</option>
                  <option value="LAST_DAY">{t('tasks.schedule.monthlyLastDay')}</option>
                </select>
              </div>

              {monthlyMode === 'SPECIFIC_DAY' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {t('tasks.schedule.monthlyDayOfMonth')}
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
                  {t('tasks.schedule.yearlyDay')}
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
                  {t('tasks.schedule.yearlyMonth')}
                </label>
                <select
                  value={yearlyMonth}
                  onChange={(e) => setYearlyMonth(parseInt(e.target.value))}
                  className="input"
                >
                  <option value={1}>{t('months.january')}</option>
                  <option value={2}>{t('months.february')}</option>
                  <option value={3}>{t('months.march')}</option>
                  <option value={4}>{t('months.april')}</option>
                  <option value={5}>{t('months.may')}</option>
                  <option value={6}>{t('months.june')}</option>
                  <option value={7}>{t('months.july')}</option>
                  <option value={8}>{t('months.august')}</option>
                  <option value={9}>{t('months.september')}</option>
                  <option value={10}>{t('months.october')}</option>
                  <option value={11}>{t('months.november')}</option>
                  <option value={12}>{t('months.december')}</option>
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
                    {t('tasks.schedule.intervalEvery')}
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
                    {t('tasks.schedule.intervalUnit')}
                  </label>
                  <select
                    value={intervalUnit}
                    onChange={(e) => setIntervalUnit(e.target.value as IntervalUnit)}
                    className="input"
                  >
                    <option value="DAY">{t('tasks.schedule.intervalDays')}</option>
                    <option value="WEEK">{t('tasks.schedule.intervalWeeks')}</option>
                    <option value="MONTH">{t('tasks.schedule.intervalMonths')}</option>
                    <option value="YEAR">{t('tasks.schedule.intervalYears')}</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {t('tasks.schedule.intervalAnchor')}
                </label>
                <input
                  type="date"
                  value={anchorDate}
                  onChange={(e) => setAnchorDate(e.target.value)}
                  className="input"
                />
                <p className="text-sm text-gray-500 mt-1">
                  {t('tasks.schedule.intervalHint')}
                </p>
              </div>
            </div>
          )}

          {/* Due Time */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {t('tasks.schedule.dueTime')}
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
          <h2 className="font-semibold text-gray-900">{t('tasks.behavior.title')}</h2>

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
                <div className="font-medium text-gray-900">{t('tasks.behavior.carryOver')}</div>
                <div className="text-sm text-gray-500">
                  {t('tasks.behavior.carryOverDesc')}
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
                <div className="font-medium text-gray-900">{t('tasks.behavior.failOnMiss')}</div>
                <div className="text-sm text-gray-500">
                  {t('tasks.behavior.failOnMissDesc')}
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
              <span>{t('common.delete')}</span>
            </button>
          )}

          <div className="flex gap-3 ml-auto">
            <button
              type="button"
              onClick={() => navigate(-1)}
              className="btn btn-secondary"
            >
              {t('common.cancel')}
            </button>
            <button
              type="submit"
              disabled={saving}
              className="btn btn-primary flex items-center gap-2"
            >
              <Save size={20} />
              <span>{saving ? t('common.saving') : t('common.save')}</span>
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}
