import { Outlet, NavLink, useLocation } from 'react-router-dom';
import { LayoutDashboard, Calendar, ListTodo, Settings, LogOut } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { cn } from '../lib/utils';

const navItems = [
  { path: '/', icon: LayoutDashboard, label: 'Dashboard' },
  { path: '/calendar', icon: Calendar, label: 'Kalender' },
  { path: '/tasks', icon: ListTodo, label: 'Aufgaben' },
  { path: '/settings', icon: Settings, label: 'Einstellungen' },
];

export default function Layout() {
  const { logout } = useAuth();
  const location = useLocation();

  const handleLogout = async () => {
    await logout();
  };

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      {/* Header - Desktop */}
      <header className="hidden md:flex bg-white border-b border-gray-200 px-6 py-4 items-center justify-between">
        <div className="flex items-center gap-8">
          <h1 className="text-xl font-bold text-primary-600">Recury</h1>
          <nav className="flex gap-1">
            {navItems.map(({ path, icon: Icon, label }) => (
              <NavLink
                key={path}
                to={path}
                className={({ isActive }) =>
                  cn(
                    'flex items-center gap-2 px-4 py-2 rounded-lg transition-colors',
                    isActive
                      ? 'bg-primary-100 text-primary-700'
                      : 'text-gray-600 hover:bg-gray-100'
                  )
                }
              >
                <Icon size={20} />
                <span>{label}</span>
              </NavLink>
            ))}
          </nav>
        </div>
        <button
          onClick={handleLogout}
          className="flex items-center gap-2 px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
        >
          <LogOut size={20} />
          <span>Abmelden</span>
        </button>
      </header>

      {/* Main Content */}
      <main className="flex-1 p-4 md:p-6 pb-24 md:pb-6 overflow-auto">
        <Outlet />
      </main>

      {/* Mobile Bottom Navigation */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 px-2 py-2 flex justify-around safe-area-inset-bottom">
        {navItems.map(({ path, icon: Icon, label }) => {
          const isActive = location.pathname === path ||
            (path !== '/' && location.pathname.startsWith(path));

          return (
            <NavLink
              key={path}
              to={path}
              className={cn(
                'flex flex-col items-center gap-1 px-3 py-2 rounded-lg transition-colors min-w-[64px]',
                isActive
                  ? 'text-primary-600'
                  : 'text-gray-500'
              )}
            >
              <Icon size={24} />
              <span className="text-xs">{label}</span>
            </NavLink>
          );
        })}
      </nav>
    </div>
  );
}
