import { Outlet, NavLink, useNavigate, useSearchParams } from 'react-router-dom';
import { useEffect, useRef, useState, type FormEvent } from 'react';
import { Bell, Grid, MapPin, ShieldCheck, Signal, Settings, FileText, AlertTriangle, LogOut, User, Layers, ListChecks, Clock3, Users, Search } from 'lucide-react';
import { useProfile } from '../context/ProfileContext';
import { useAuth } from '../context/AuthContext';
import { useSmartBinContext } from '../context/SmartBinContext';
import { useNotifications } from '../context/NotificationContext';

function ProfileHeader() {
  const { profile, loading } = useProfile();

  if (loading || !profile) {
    return (
      <div className="flex items-center gap-3">
        <div className="flex h-12 w-12 items-center justify-center rounded-3xl bg-brand-500/15 text-brand-300 ring-1 ring-brand-400/20">
          <User size={24} />
        </div>
        <div>
          <p className="text-xs uppercase tracking-[0.4em] text-brand-300/80">Garbage Guardian</p>
          <h1 className="text-xl font-semibold text-white">Admin Portal</h1>
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-3">
      <div className="h-12 w-12 overflow-hidden rounded-3xl bg-slate-900/60">
        {profile.avatar ? (
          <img src={profile.avatar} alt="avatar" className="h-12 w-12 object-cover" />
        ) : (
          <div className="flex h-12 w-12 items-center justify-center text-slate-400"><User size={20} /></div>
        )}
      </div>
      <div>
        <p className="text-xs uppercase tracking-[0.4em] text-brand-300/80">{profile.role ?? 'Collector'}</p>
        <h1 className="text-xl font-semibold text-white">{profile.collectorName ?? 'Collector Dashboard'}</h1>
      </div>
    </div>
  );
}

const navItems = [
  { to: '/', label: 'Dashboard', icon: Grid },
  { to: '/smart-bins', label: 'Bin Monitoring', icon: Layers },
  { to: '/live-map', label: 'Live Map', icon: MapPin },
  { to: '/collection-routes', label: 'Collection Routes', icon: ListChecks },
  { to: '/collection-history', label: 'Collection History', icon: Clock3 },
  { to: '/alerts', label: 'Alerts & Notifications', icon: AlertTriangle },
  { to: '/analytics', label: 'Analytics', icon: Signal },
  { to: '/reports', label: 'Reports', icon: FileText },
  { to: '/employers', label: 'Employers', icon: Users },
  { to: '/settings', label: 'Settings', icon: Settings },
  { to: '/profile', label: 'Profile', icon: User },
];

function DashboardLayout() {
  const { logout } = useAuth();
  const { profile } = useProfile();
  const { state } = useSmartBinContext();
  const { notifications, loading: notificationsLoading } = useNotifications();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [searchTerm, setSearchTerm] = useState('');
  const alertCount = notifications.length;
  const [showNotifications, setShowNotifications] = useState(false);
  const [theme, setTheme] = useState<'dark' | 'light'>(() => {
    const storedTheme = window.localStorage.getItem('smartbinTheme');
    return storedTheme === 'light' ? 'light' : 'dark';
  });
  const notificationsRef = useRef<HTMLDivElement | null>(null);
  const alerts = notifications;

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  useEffect(() => {
    document.documentElement.classList.toggle('light', theme === 'light');
    window.localStorage.setItem('smartbinTheme', theme);
  }, [theme]);

  useEffect(() => {
    setSearchTerm(searchParams.get('q') ?? '');
  }, [searchParams]);

  const handleSearchSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const query = searchTerm.trim();
    if (!query) {
      return;
    }
    navigate(`/search?q=${encodeURIComponent(query)}`);
  };

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (notificationsRef.current && !notificationsRef.current.contains(event.target as Node)) {
        setShowNotifications(false);
      }
    };

    window.addEventListener('mousedown', handleClickOutside);
    return () => window.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <div className="flex min-h-screen">
        <aside className="w-80 shrink-0 border-r border-white/10 bg-slate-950/95 backdrop-blur-xl transition-colors duration-300">
          <div className="flex h-full flex-col justify-between px-6 py-8">
            <div>
              <div className="mb-10">
                <ProfileHeader />
              </div>
              <nav className="space-y-2">
                {navItems.map((item) => {
                  const Icon = item.icon;
                  return (
                    <NavLink
                      key={item.to}
                      to={item.to}
                      className={({ isActive }) =>
                        `group flex items-center gap-4 rounded-3xl px-4 py-3 text-sm font-medium transition ${
                          isActive
                            ? 'bg-brand-500/15 text-brand-100 shadow-lg shadow-brand-500/10'
                            : 'text-slate-300 hover:bg-white/5 hover:text-white'
                        }`
                      }
                    >
                      <Icon size={18} className="text-slate-300 transition group-hover:text-brand-200" />
                      {item.label}
                    </NavLink>
                  );
                })}
              </nav>
            </div>
            <div className="space-y-4">
              <button
              type="button"
              onClick={() => setTheme((current) => (current === 'dark' ? 'light' : 'dark'))}
              className="flex w-full items-center justify-between rounded-3xl bg-white/5 px-4 py-3 text-sm text-slate-300 transition hover:bg-white/10"
            >
              <span>{theme === 'dark' ? 'Dark Mode' : 'Light Mode'}</span>
              <div className="h-6 w-12 rounded-full bg-slate-700 p-1">
                <div
                  className={`h-4 w-4 rounded-full shadow-lg shadow-brand-500/20 transition-transform ${
                    theme === 'light' ? 'translate-x-6 bg-white' : 'translate-x-0 bg-brand-400'
                  }`}
                />
              </div>
            </button>
              <button
                onClick={handleLogout}
                className="flex w-full items-center justify-center gap-2 rounded-3xl border border-white/10 bg-slate-900/80 px-4 py-3 text-sm text-slate-300 transition hover:border-brand-400/40 hover:text-white"
              >
                <LogOut size={16} /> Logout
              </button>
            </div>
          </div>
        </aside>

        <main className="flex-1">
          <div className="border-b border-white/10 bg-slate-950/70 p-5 backdrop-blur-xl">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <p className="text-sm uppercase tracking-[0.32em] text-brand-300/80">Collector Dashboard</p>
                <h2 className="mt-2 text-3xl font-semibold text-white">Real-time overview of waste collection activities</h2>
              </div>
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                <form onSubmit={handleSearchSubmit} className="relative w-full sm:w-80">
                <input
                  type="search"
                  placeholder="Search bins, routes, alerts, employers"
                  value={searchTerm}
                  onChange={(event) => setSearchTerm(event.target.value)}
                  className="w-full rounded-3xl border border-white/10 bg-slate-950/80 px-4 py-3 pr-12 text-sm text-slate-100 outline-none transition focus:border-brand-400/70 focus:ring-2 focus:ring-brand-500/20"
                />
                <button
                  type="submit"
                  className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full bg-brand-500 px-3 py-2 text-slate-950 transition hover:bg-brand-400"
                >
                  <Search size={16} />
                </button>
              </form>
                <div className="relative" ref={notificationsRef}>
                  <button
                    type="button"
                    onClick={() => setShowNotifications((prev) => !prev)}
                    className="inline-flex items-center rounded-3xl border border-white/10 bg-slate-950/80 px-4 py-3 text-sm text-slate-200 transition hover:border-brand-400/40 hover:bg-slate-900/90"
                  >
                    <Bell size={18} className="mr-2" />
                    Notifications
                    {alertCount > 0 && (
                      <span className="ml-3 inline-flex h-6 items-center rounded-full bg-brand-500 px-2.5 text-xs font-semibold text-slate-950">
                        {alertCount}
                      </span>
                    )}
                  </button>

                  {showNotifications && (
                    <div className="absolute right-0 z-20 mt-3 w-[360px] rounded-3xl border border-white/10 bg-slate-950/95 p-4 shadow-2xl shadow-black/40 backdrop-blur-xl">
                      <div className="mb-4 flex items-center justify-between">
                        <div>
                          <p className="text-sm uppercase tracking-[0.24em] text-slate-400">Notifications</p>
                          <p className="text-xs text-slate-500">Latest alerts from bin telemetry</p>
                        </div>
                        <button
                          type="button"
                          onClick={() => setShowNotifications(false)}
                          className="text-slate-400 transition hover:text-white"
                        >
                          Close
                        </button>
                      </div>
                      <div className="space-y-3 max-h-80 overflow-y-auto pr-1">
                        {alerts.length === 0 ? (
                          <div className="rounded-3xl border border-dashed border-white/10 bg-slate-900/80 p-4 text-sm text-slate-400">
                            No active notifications.
                          </div>
                        ) : (
                          alerts.map((alert) => (
                            <div key={alert.id} className="rounded-3xl border border-white/10 bg-slate-950/80 p-4">
                              <div className="flex items-start justify-between gap-3">
                                <div>
                                  <p className="text-sm font-semibold text-white">{alert.title}</p>
                                  <p className="mt-1 text-sm text-slate-400">{alert.message}</p>
                                </div>
                                <span className="rounded-full bg-brand-500/15 px-2 py-1 text-[11px] uppercase tracking-[0.24em] text-brand-200">
                                  {alert.severity === 'critical' ? 'Critical' : 'Warning'}
                                </span>
                              </div>
                              <p className="mt-3 text-xs uppercase tracking-[0.24em] text-slate-500">{alert.time}</p>
                            </div>
                          ))
                        )}
                      </div>
                      {alerts.length > 0 && (
                        <button
                          type="button"
                          onClick={() => {
                            setShowNotifications(false);
                            navigate('/alerts');
                          }}
                          className="mt-4 w-full rounded-3xl bg-brand-500 px-4 py-3 text-sm font-semibold text-slate-950 transition hover:bg-brand-400"
                        >
                          View all alerts
                        </button>
                      )}
                    </div>
                  )}
                </div>
                <div className="inline-flex items-center gap-3 rounded-3xl border border-white/10 bg-slate-950/80 px-4 py-3 text-sm text-slate-200">
                  <User size={18} />
                  <div className="text-left">
                    <p className="text-xs uppercase tracking-[0.32em] text-slate-400">Logged in as</p>
                    <p className="font-semibold text-white">{profile?.collectorName ?? 'Collector'}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="p-6 xl:p-8">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}

export default DashboardLayout;
