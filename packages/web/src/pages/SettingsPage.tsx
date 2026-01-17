import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { LogOut, Key, Shield, Globe } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { auth } from '../lib/api';
import { useTranslation } from '../i18n';
import type { Locale } from '../i18n';

export default function SettingsPage() {
  const { logout } = useAuth();
  const navigate = useNavigate();
  const { t, locale, setLocale } = useTranslation();

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [changing, setChanging] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage(null);

    if (newPassword !== confirmPassword) {
      setMessage({ type: 'error', text: t('settings.password.mismatch') });
      return;
    }

    if (newPassword.length < 4) {
      setMessage({ type: 'error', text: t('settings.password.tooShort') });
      return;
    }

    setChanging(true);
    try {
      await auth.changePassword(currentPassword, newPassword);
      setMessage({ type: 'success', text: t('settings.password.success') });
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (error) {
      setMessage({
        type: 'error',
        text: error instanceof Error ? error.message : t('settings.password.error'),
      });
    } finally {
      setChanging(false);
    }
  };

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const handleLocaleChange = (newLocale: Locale) => {
    setLocale(newLocale);
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">{t('settings.title')}</h1>

      {/* Language */}
      <div className="card p-6">
        <div className="flex items-center gap-3 mb-4">
          <Globe className="text-primary-600" size={24} />
          <h2 className="font-semibold text-gray-900">{t('settings.language.title')}</h2>
        </div>

        <select
          value={locale}
          onChange={(e) => handleLocaleChange(e.target.value as Locale)}
          className="input max-w-xs"
        >
          <option value="de">{t('settings.language.german')}</option>
          <option value="en">{t('settings.language.english')}</option>
        </select>
      </div>

      {/* Password Change */}
      <div className="card p-6">
        <div className="flex items-center gap-3 mb-4">
          <Key className="text-primary-600" size={24} />
          <h2 className="font-semibold text-gray-900">{t('settings.password.title')}</h2>
        </div>

        <form onSubmit={handleChangePassword} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {t('settings.password.current')}
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
              {t('settings.password.new')}
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
              {t('settings.password.confirm')}
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
            {changing ? t('settings.password.changing') : t('settings.password.change')}
          </button>
        </form>
      </div>

      {/* Security Info */}
      <div className="card p-6">
        <div className="flex items-center gap-3 mb-4">
          <Shield className="text-primary-600" size={24} />
          <h2 className="font-semibold text-gray-900">{t('settings.security.title')}</h2>
        </div>

        <ul className="space-y-2 text-sm text-gray-600">
          <li>• {t('settings.security.hint1')}</li>
          <li>• {t('settings.security.hint2')}</li>
          <li>• {t('settings.security.hint3')}</li>
          <li>• {t('settings.security.hint4')}</li>
        </ul>
      </div>

      {/* Logout */}
      <div className="card p-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="font-semibold text-gray-900">{t('settings.logout.title')}</h2>
            <p className="text-sm text-gray-500">{t('settings.logout.description')}</p>
          </div>
          <button
            onClick={handleLogout}
            className="btn btn-secondary flex items-center gap-2"
          >
            <LogOut size={20} />
            <span>{t('auth.logout')}</span>
          </button>
        </div>
      </div>

      {/* About */}
      <div className="card p-6 text-center text-gray-500 text-sm">
        <p className="font-semibold text-gray-900 mb-1">{t('app.name')}</p>
        <p>{t('app.tagline')}</p>
        <p className="mt-2">{t('app.version')}</p>
      </div>
    </div>
  );
}
