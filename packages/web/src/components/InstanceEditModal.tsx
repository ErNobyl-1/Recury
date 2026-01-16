import { useState, useEffect } from 'react';
import { X, Calendar, Trash2 } from 'lucide-react';
import { Instance, instances as instancesApi, UpdateInstanceInput } from '../lib/api';
import { formatDate } from '../lib/utils';

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
      alert('Fehler beim Speichern');
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
      alert('Fehler beim Loeschen');
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
          <h2 className="text-lg font-semibold">Termin bearbeiten</h2>
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
            <span>{formatDate(instance.date, 'EEEE, dd. MMMM yyyy')}</span>
          </div>

          {/* Info box */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-sm text-blue-800">
            Hier kannst du nur diesen einzelnen Termin bearbeiten.
            Die Vorlage und alle anderen Termine bleiben unveraendert.
          </div>

          {/* Custom Title */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Titel (nur fuer diesen Termin)
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
                Original: {instance.template.title}
              </p>
            )}
          </div>

          {/* Custom Notes */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Notizen (nur fuer diesen Termin)
            </label>
            <textarea
              value={customNotes}
              onChange={(e) => setCustomNotes(e.target.value)}
              placeholder={instance.template.notes || 'Keine Notizen'}
              rows={3}
              className="input w-full resize-none"
            />
            {customNotes && instance.template.notes && (
              <p className="text-xs text-gray-500 mt-1">
                Original: {instance.template.notes}
              </p>
            )}
          </div>

          {/* Date picker */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Datum verschieben
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
              Diesen Termin loeschen
            </button>
          ) : (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3">
              <p className="text-sm text-red-800 mb-3">
                Diesen Termin wirklich loeschen? Die Aufgabe wird an diesem Tag nicht mehr angezeigt.
              </p>
              <div className="flex gap-2">
                <button
                  onClick={handleDelete}
                  disabled={loading}
                  className="btn bg-red-600 text-white hover:bg-red-700 text-sm px-3 py-1"
                >
                  Ja, loeschen
                </button>
                <button
                  onClick={() => setShowDeleteConfirm(false)}
                  className="btn btn-secondary text-sm px-3 py-1"
                >
                  Abbrechen
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
              {loading ? 'Speichern...' : 'Diesen Termin speichern'}
            </button>
            <button
              onClick={onClose}
              disabled={loading}
              className="btn btn-secondary"
            >
              Abbrechen
            </button>
          </div>

          <button
            onClick={onEditTemplate}
            className="w-full text-sm text-gray-600 hover:text-gray-800 py-2"
          >
            Alle Termine bearbeiten (Vorlage oeffnen)
          </button>
        </div>
      </div>
    </div>
  );
}
