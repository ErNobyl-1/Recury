import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { LogOut, Key, Shield } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { auth } from '../lib/api';

export default function SettingsPage() {
  const { logout } = useAuth();
  const navigate = useNavigate();

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [changing, setChanging] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage(null);

    if (newPassword !== confirmPassword) {
      setMessage({ type: 'error', text: 'Passwörter stimmen nicht überein' });
      return;
    }

    if (newPassword.length < 4) {
      setMessage({ type: 'error', text: 'Passwort muss mindestens 4 Zeichen lang sein' });
      return;
    }

    setChanging(true);
    try {
      await auth.changePassword(currentPassword, newPassword);
      setMessage({ type: 'success', text: 'Passwort erfolgreich geändert' });
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (error) {
      setMessage({
        type: 'error',
        text: error instanceof Error ? error.message : 'Fehler beim Ändern des Passworts',
      });
    } finally {
      setChanging(false);
    }
  };

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">Einstellungen</h1>

      {/* Password Change */}
      <div className="card p-6">
        <div className="flex items-center gap-3 mb-4">
          <Key className="text-primary-600" size={24} />
          <h2 className="font-semibold text-gray-900">Passwort ändern</h2>
        </div>

        <form onSubmit={handleChangePassword} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Aktuelles Passwort
            </label>
            <input
              type="password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              className="input"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Neues Passwort
            </label>
            <input
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className="input"
              required
              minLength={4}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Passwort bestätigen
            </label>
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="input"
              required
            />
          </div>

          {message && (
            <div
              className={`p-3 rounded-lg ${
                message.type === 'success'
                  ? 'bg-green-50 text-green-700'
                  : 'bg-red-50 text-red-700'
              }`}
            >
              {message.text}
            </div>
          )}

          <button
            type="submit"
            disabled={changing}
            className="btn btn-primary"
          >
            {changing ? 'Ändern...' : 'Passwort ändern'}
          </button>
        </form>
      </div>

      {/* Security Info */}
      <div className="card p-6">
        <div className="flex items-center gap-3 mb-4">
          <Shield className="text-primary-600" size={24} />
          <h2 className="font-semibold text-gray-900">Sicherheitshinweise</h2>
        </div>

        <ul className="space-y-2 text-sm text-gray-600">
          <li>• Diese App ist für den Betrieb im lokalen Netzwerk oder per VPN gedacht</li>
          <li>• Verwende ein sicheres Passwort, auch wenn nur du Zugriff hast</li>
          <li>• Deine Daten werden lokal auf dem Server gespeichert</li>
          <li>• Es werden keine Daten an externe Dienste übertragen</li>
        </ul>
      </div>

      {/* Logout */}
      <div className="card p-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="font-semibold text-gray-900">Abmelden</h2>
            <p className="text-sm text-gray-500">Beende deine aktuelle Sitzung</p>
          </div>
          <button
            onClick={handleLogout}
            className="btn btn-secondary flex items-center gap-2"
          >
            <LogOut size={20} />
            <span>Abmelden</span>
          </button>
        </div>
      </div>

      {/* About */}
      <div className="card p-6 text-center text-gray-500 text-sm">
        <p className="font-semibold text-gray-900 mb-1">Recury</p>
        <p>Aufgaben, die an dich denken.</p>
        <p className="mt-2">Version 1.0.0</p>
      </div>
    </div>
  );
}
