import { useState, useEffect } from 'react';
import { X, Calendar, Trash2 } from 'lucide-react';
import { Instance, instances as instancesApi, UpdateInstanceInput } from '../lib/api';
import { format, parseISO } from 'date-fns';
import { useTranslation } from '../i18n';

interface InstanceEditModalProps {
  instance: Instance;
  onClose: () => void;
  onSave: () => void;
  onEditTemplate: () => void;
}

export default function InstanceEditModal({
  instance,
  onClose,
  onSave,
  onEditTemplate,
}: InstanceEditModalProps) {
  const [customTitle, setCustomTitle] = useState(instance.customTitle ?? '');
  const [customNotes, setCustomNotes] = useState(instance.customNotes ?? '');
  const [newDate, setNewDate] = useState(instance.date);
  const [loading, setLoading] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const { t, dateFnsLocale } = useTranslation();

  // Reset state when instance changes
  useEffect(() => {
    setCustomTitle(instance.customTitle ?? '');
    setCustomNotes(instance.customNotes ?? '');
    setNewDate(instance.date);
  }, [instance]);

  const handleSaveInstance = async () => {
    setLoading(true);
    try {
      const updates: UpdateInstanceInput = {};

      // Only send customTitle if it differs from empty (use template)
      if (customTitle !== (instance.customTitle ?? '')) {
        updates.customTitle = customTitle || null;
      }

      // Only send customNotes if it differs
      if (customNotes !== (instance.customNotes ?? '')) {
        updates.customNotes = customNotes || null;
      }

      // Only send date if changed
      if (newDate !== instance.date) {
        updates.date = newDate;
      }

      if (Object.keys(updates).length > 0) {
        await instancesApi.update(instance.id, updates);
      }

      onSave();
      onClose();
    } catch (error) {
      console.error('Failed to update instance:', error);
      alert(t('instanceModal.saveError'));
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    setLoading(true);
    try {
      await instancesApi.delete(instance.id);
      onSave();
      onClose();
    } catch (error) {
      console.error('Failed to delete instance:', error);
      alert(t('instanceModal.deleteError'));
    } finally {
      setLoading(false);
      setShowDeleteConfirm(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b">
          <h2 className="text-lg font-semibold">{t('instanceModal.title')}</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="p-4 space-y-4">
          {/* Date display */}
          <div className="flex items-center gap-2 text-gray-600 bg-gray-50 rounded-lg p-3">
            <Calendar size={18} />
            <span>{format(parseISO(instance.date), 'EEEE, dd. MMMM yyyy', { locale: dateFnsLocale })}</span>
          </div>

          {/* Info box */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-sm text-blue-800">
            {t('instanceModal.infoBox')}
          </div>

          {/* Custom Title */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {t('instanceModal.customTitle')}
            </label>
            <input
              type="text"
              value={customTitle}
              onChange={(e) => setCustomTitle(e.target.value)}
              placeholder={instance.template.title}
              className="input w-full"
            />
            {customTitle && (
              <p className="text-xs text-gray-500 mt-1">
                {t('instanceModal.original', { text: instance.template.title })}
              </p>
            )}
          </div>

          {/* Custom Notes */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {t('instanceModal.customNotes')}
            </label>
            <textarea
              value={customNotes}
              onChange={(e) => setCustomNotes(e.target.value)}
              placeholder={instance.template.notes || t('instanceModal.noNotes')}
              rows={3}
              className="input w-full resize-none"
            />
            {customNotes && instance.template.notes && (
              <p className="text-xs text-gray-500 mt-1">
                {t('instanceModal.original', { text: instance.template.notes })}
              </p>
            )}
          </div>

          {/* Date picker */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {t('instanceModal.moveDate')}
            </label>
            <input
              type="date"
              value={newDate}
              onChange={(e) => setNewDate(e.target.value)}
              className="input w-full"
            />
          </div>

          {/* Delete section */}
          {!showDeleteConfirm ? (
            <button
              onClick={() => setShowDeleteConfirm(true)}
              className="flex items-center gap-2 text-red-600 hover:text-red-700 text-sm"
            >
              <Trash2 size={16} />
              {t('instanceModal.deleteThis')}
            </button>
          ) : (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3">
              <p className="text-sm text-red-800 mb-3">
                {t('instanceModal.deleteConfirm')}
              </p>
              <div className="flex gap-2">
                <button
                  onClick={handleDelete}
                  disabled={loading}
                  className="btn bg-red-600 text-white hover:bg-red-700 text-sm px-3 py-1"
                >
                  {t('instanceModal.yesDelete')}
                </button>
                <button
                  onClick={() => setShowDeleteConfirm(false)}
                  className="btn btn-secondary text-sm px-3 py-1"
                >
                  {t('common.cancel')}
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t bg-gray-50 space-y-2">
          <div className="flex gap-2">
            <button
              onClick={handleSaveInstance}
              disabled={loading}
              className="btn btn-primary flex-1"
            >
              {loading ? t('common.saving') : t('instanceModal.saveThis')}
            </button>
            <button
              onClick={onClose}
              disabled={loading}
              className="btn btn-secondary"
            >
              {t('common.cancel')}
            </button>
          </div>

          <button
            onClick={onEditTemplate}
            className="w-full text-sm text-gray-600 hover:text-gray-800 py-2"
          >
            {t('instanceModal.editTemplate')}
          </button>
        </div>
      </div>
    </div>
  );
}
