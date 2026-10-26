import { Outlet, NavLink, useNavigate, useSearchParams, useLocation } from 'react-router-dom';
import { useEffect, useMemo, useRef, useState, type FormEvent } from 'react';
import {
  Bell, Grid, MapPin, Signal, Settings, FileText,
  AlertTriangle, LogOut, User, Layers, ListChecks,
  Clock3, Users, Search, PanelLeftClose, PanelLeftOpen,
  Sun, Moon, X, ChevronRight, ClipboardList,
} from 'lucide-react';
import { useProfile } from '../context/ProfileContext';
import { useAuth } from '../context/AuthContext';
import { useSmartBinContext } from '../context/SmartBinContext';
import { useNotifications } from '../context/NotificationContext';
import ErrorBoundary from '../components/ErrorBoundary';

/* ── Profile avatar block ──────────────────────────────────────── */
function ProfileHeader({ collapsed }: { collapsed: boolean }) {
  const { profile, loading } = useProfile();

  const initials = profile?.collectorName
    ? profile.collectorName.split(' ').map((n) => n[0]).slice(0, 2).join('').toUpperCase()
    : 'GG';

  return (
    <div className={`flex items-center ${collapsed ? 'justify-center' : 'gap-3'}`}>
      {/* Avatar */}
      <div className="relative h-9 w-9 shrink-0 overflow-hidden rounded-xl bg-brand-500/20 ring-1 ring-brand-500/30">
        {!loading && profile?.avatar ? (
          <img src={profile.avatar} alt="avatar" className="h-full w-full object-cover" />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-xs font-bold text-brand-300">
            {loading ? <User size={14} /> : initials}
          </div>
        )}
      </div>

      {!collapsed && (
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-white">
            {loading ? 'Loading…' : (profile?.collectorName ?? 'Admin')}
          </p>
          <p className="truncate text-xs text-slate-500">
            {loading ? '' : (profile?.role ?? 'Garbage Guardian')}
          </p>
        </div>
      )}
    </div>
  );
}

/* ── Nav items ─────────────────────────────────────────────────── */
const navGroups = [
  {
    label: 'Overview',
    items: [
      { to: '/',         label: 'Dashboard',    icon: Grid      },
      { to: '/live-map', label: 'Live Map',      icon: MapPin    },
      { to: '/analytics',label: 'Analytics',     icon: Signal    },
    ],
  },
  {
    label: 'Operations',
    items: [
      { to: '/smart-bins',          label: 'Bin Monitoring',     icon: Layers     },
      { to: '/collection-routes',   label: 'Collection Routes',  icon: ListChecks },
      { to: '/collection-history',  label: 'Collection History', icon: Clock3     },
      { to: '/alerts',              label: 'Alerts',             icon: AlertTriangle },
    ],
  },
  {
    label: 'Management',
    items: [
      { to: '/employers', label: 'Employers', icon: Users    },
      { to: '/tasks',     label: 'Tasks',     icon: ClipboardList },
      { to: '/reports',   label: 'Reports',   icon: FileText },
      { to: '/settings',  label: 'Settings',  icon: Settings },
      { to: '/profile',   label: 'Profile',   icon: User     },
    ],
  },
];

/* ── Notification severity colour ──────────────────────────────── */
function severityClass(severity: string) {
  if (severity === 'critical') return 'border-l-rose-500   bg-rose-500/5';
  return 'border-l-amber-400 bg-amber-400/5';
}

/* ── Main layout ───────────────────────────────────────────────── */
function DashboardLayout() {
  const { logout }       = useAuth();
  const { profile }      = useProfile();
  const { state }        = useSmartBinContext();
  const { notifications, loading: notificationsLoading, markAllAsSolved } = useNotifications();
  const navigate         = useNavigate();
  const location         = useLocation();
  const [searchParams]   = useSearchParams();
  const [searchTerm, setSearchTerm] = useState('');
  const alertCount       = useMemo(() => notifications.filter((n) => !n.solved).length, [notifications]);
  const [showNotifications, setShowNotifications] = useState(false);
  const notificationsRef = useRef<HTMLDivElement | null>(null);

  const pageTitle = useMemo(() => {
    const path = location.pathname;
    if (path === '/') return { page: 'Dashboard', desc: 'Real-time waste operations' };
    if (path.startsWith('/live-map')) return { page: 'Live Map', desc: 'Fleet GPS & route tracking' };
    if (path.startsWith('/analytics')) return { page: 'Analytics', desc: 'Fleet metrics & fill trends' };
    if (path.startsWith('/smart-bins')) return { page: 'Bin Monitoring', desc: 'Telemetry & sensor readings' };
    if (path.startsWith('/collection-routes')) return { page: 'Collection Routes', desc: 'Pickup stops & scheduling' };
    if (path.startsWith('/collection-history')) return { page: 'Collection History', desc: 'Completed routes & logs' };
    if (path.startsWith('/alerts')) return { page: 'Alerts', desc: 'Active bin notifications' };
    if (path.startsWith('/employers')) return { page: 'Employers', desc: 'Staff & collector roster' };
    if (path.startsWith('/tasks')) return { page: 'Tasks', desc: 'Assigned waste collector jobs' };
    if (path.startsWith('/reports')) return { page: 'Reports', desc: 'Citizen issue submissions' };
    if (path.startsWith('/settings')) return { page: 'Settings', desc: 'System preferences' };
    if (path.startsWith('/profile')) return { page: 'Profile', desc: 'Admin account credentials' };
    if (path.startsWith('/search')) return { page: 'Search Results', desc: 'Query matches' };
    return { page: 'GarbageGuardian', desc: 'Admin Portal' };
  }, [location.pathname]);

  const [sidebarCollapsed, setSidebarCollapsed] = useState(
    () => window.localStorage.getItem('smartbinSidebarCollapsed') === 'true'
  );
  const [theme, setTheme] = useState<'dark' | 'light'>(() => {
    const stored = window.localStorage.getItem('smartbinTheme');
    return stored === 'light' ? 'light' : 'dark';
  });

  const handleLogout = () => { logout(); navigate('/login'); };

  useEffect(() => {
    window.localStorage.setItem('smartbinSidebarCollapsed', String(sidebarCollapsed));
  }, [sidebarCollapsed]);

  useEffect(() => {
    document.documentElement.classList.toggle('light', theme === 'light');
    window.localStorage.setItem('smartbinTheme', theme);
  }, [theme]);

  useEffect(() => {
    setSearchTerm(searchParams.get('q') ?? '');
  }, [searchParams]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (notificationsRef.current && !notificationsRef.current.contains(e.target as Node)) {
        setShowNotifications(false);
      }
    };
    window.addEventListener('mousedown', handleClickOutside);
    return () => window.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSearchSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const q = searchTerm.trim();
    if (!q) return;
    navigate(`/search?q=${encodeURIComponent(q)}`);
  };

  return (
    <div className="flex h-screen w-full overflow-hidden bg-slate-950 text-slate-100">

      {/* ── Sidebar ─────────────────────────────────────────────── */}
      <aside
        className={`${
          sidebarCollapsed ? 'w-[68px]' : 'w-60'
        } sidebar flex h-full shrink-0 flex-col border-r border-white/[0.06] bg-[#080d1a] transition-[width] duration-300 ease-in-out`}
      >
        {/* Top: brand + collapse toggle */}
        <div className={`flex h-16 shrink-0 items-center border-b border-white/[0.06] ${sidebarCollapsed ? 'justify-center px-3' : 'justify-between px-4'}`}>
          {!sidebarCollapsed && (
            <div className="flex items-center gap-2.5">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-500 text-white">
                <Layers size={15} />
              </div>
              <span className="text-sm font-semibold text-white">GarbageGuardian</span>
            </div>
          )}
          <button
            type="button"
            onClick={() => setSidebarCollapsed((c) => !c)}
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-slate-500 transition hover:bg-white/5 hover:text-slate-300"
            aria-label={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            {sidebarCollapsed ? <PanelLeftOpen size={16} /> : <PanelLeftClose size={16} />}
          </button>
        </div>

        {/* Nav groups */}
        <nav className="flex-1 overflow-y-auto overscroll-contain py-4">
          {navGroups.map((group) => (
            <div key={group.label} className="mb-1">
              {!sidebarCollapsed && (
                <p className="mb-1 px-4 pt-2 text-[10px] font-semibold uppercase tracking-widest text-slate-600">
                  {group.label}
                </p>
              )}
              <div className="space-y-0.5 px-2">
                {group.items.map((item) => {
                  const Icon = item.icon;
                  return (
                    <NavLink
                      key={item.to}
                      to={item.to}
                      end={item.to === '/'}
                      title={sidebarCollapsed ? item.label : undefined}
                      className={({ isActive }) =>
                        `group flex items-center rounded-lg py-2 text-sm font-medium transition-colors ${
                          sidebarCollapsed ? 'justify-center px-2' : 'gap-3 px-3'
                        } ${
                          isActive
                            ? 'bg-brand-500/15 text-brand-300'
                            : 'text-slate-400 hover:bg-white/[0.04] hover:text-slate-200'
                        }`
                      }
                    >
                      {({ isActive }) => (
                        <>
                          <Icon size={16} className={`shrink-0 ${isActive ? 'text-brand-400' : 'text-slate-500 group-hover:text-slate-300'}`} />
                          {!sidebarCollapsed && <span className="truncate">{item.label}</span>}
                        </>
                      )}
                    </NavLink>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>

        {/* Bottom: theme + profile + logout */}
        <div className={`shrink-0 border-t border-white/[0.06] py-3 ${sidebarCollapsed ? 'px-2' : 'px-3'} space-y-1`}>
          {/* Theme toggle */}
          <button
            type="button"
            onClick={() => setTheme((t) => (t === 'dark' ? 'light' : 'dark'))}
            title={theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
            className={`flex w-full items-center rounded-lg py-2 text-sm text-slate-400 transition hover:bg-white/[0.04] hover:text-slate-200 ${sidebarCollapsed ? 'justify-center px-2' : 'gap-3 px-3'}`}
          >
            {theme === 'dark' ? <Moon size={15} className="shrink-0" /> : <Sun size={15} className="shrink-0" />}
            {!sidebarCollapsed && <span>{theme === 'dark' ? 'Switch to Light' : 'Switch to Dark'}</span>}
          </button>

          {/* Profile row */}
          {!sidebarCollapsed && (
            <div className="px-1 py-1">
              <ProfileHeader collapsed={false} />
            </div>
          )}
          {sidebarCollapsed && (
            <div className="flex justify-center py-1">
              <ProfileHeader collapsed />
            </div>
          )}

          {/* Logout */}
          <button
            type="button"
            onClick={handleLogout}
            title={sidebarCollapsed ? 'Logout' : undefined}
            className={`flex w-full items-center rounded-lg py-2 text-sm text-slate-400 transition hover:bg-rose-500/10 hover:text-rose-300 ${sidebarCollapsed ? 'justify-center px-2' : 'gap-3 px-3'}`}
          >
            <LogOut size={15} className="shrink-0" />
            {!sidebarCollapsed && <span>Log out</span>}
          </button>
        </div>
      </aside>

      {/* ── Main area ───────────────────────────────────────────── */}
      <div className="relative flex min-w-0 flex-1 flex-col overflow-hidden">

        {/* Topbar */}
        <header className="topbar flex h-16 shrink-0 items-center justify-between border-b border-white/[0.06] bg-slate-950/90 px-5 backdrop-blur-md">
          {/* Left: page context */}
          <div className="flex items-center gap-2 text-sm text-slate-500">
            <span className="font-medium text-slate-300">{pageTitle.page}</span>
            <ChevronRight size={14} />
            <span className="hidden sm:inline">{pageTitle.desc}</span>
          </div>

          {/* Right: search + notif + user */}
          <div className="flex items-center gap-2">
            {/* Search */}
            <form onSubmit={handleSearchSubmit} className="relative hidden sm:block">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
              <input
                type="search"
                placeholder="Search bins, routes, alerts…"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-64 rounded-lg border border-white/[0.08] bg-white/[0.04] py-2 pl-9 pr-4 text-sm text-slate-200 outline-none placeholder:text-slate-600 transition focus:border-brand-500/50 focus:bg-white/[0.06] focus:ring-1 focus:ring-brand-500/20"
              />
            </form>

            {/* Notifications */}
            <div className="relative z-40" ref={notificationsRef}>
              <button
                type="button"
                onClick={() => setShowNotifications((p) => !p)}
                className="relative flex h-9 w-9 items-center justify-center rounded-lg border border-white/[0.08] bg-white/[0.04] text-slate-400 transition hover:border-white/[0.12] hover:bg-white/[0.08] hover:text-slate-200"
                aria-label="Notifications"
              >
                <Bell size={16} />
                {alertCount > 0 && (
                  <span className="absolute -right-0.5 -top-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-rose-500 text-[10px] font-bold text-white">
                    {alertCount > 9 ? '9+' : alertCount}
                  </span>
                )}
              </button>

              {showNotifications && (
                <div className="absolute right-0 top-full z-50 mt-2 w-80 rounded-xl border border-white/[0.08] bg-slate-900 shadow-panel notification-dropdown">
                  {/* Header */}
                  <div className="flex items-center justify-between border-b border-white/[0.06] px-4 py-3">
                    <div>
                      <p className="text-sm font-semibold text-white">Notifications</p>
                      <p className="text-xs text-slate-500">{alertCount} active alert{alertCount !== 1 ? 's' : ''}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      {alertCount > 0 && (
                        <button
                          type="button"
                          onClick={() => void markAllAsSolved()}
                          className="rounded px-2 py-0.5 text-[11px] font-semibold text-emerald-400 hover:bg-emerald-500/10 transition"
                        >
                          Mark all read
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => setShowNotifications(false)}
                        className="rounded-md p-1 text-slate-500 transition hover:bg-white/[0.06] hover:text-slate-300"
                      >
                        <X size={14} />
                      </button>
                    </div>
                  </div>

                  {/* List */}
                  <div className="max-h-72 space-y-1 overflow-y-auto p-2">
                    {notifications.length === 0 ? (
                      <div className="py-8 text-center text-sm text-slate-500">
                        No active notifications
                      </div>
                    ) : (
                      notifications.map((alert) => (
                        <div
                          key={alert._id}
                          className={`rounded-lg border-l-2 p-3 ${severityClass(alert.severity)}`}
                        >
                          <div className="flex items-start justify-between gap-2">
                            <p className="text-sm font-semibold text-white">{alert.title}</p>
                            <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${
                              alert.severity === 'critical'
                                ? 'bg-rose-500/20 text-rose-300'
                                : 'bg-amber-400/20 text-amber-300'
                            }`}>
                              {alert.severity === 'critical' ? 'Critical' : 'Warning'}
                            </span>
                          </div>
                          <p className="mt-1 text-xs text-slate-400">{alert.message}</p>
                          <p className="mt-1.5 text-[10px] text-slate-600">{alert.time}</p>
                        </div>
                      ))
                    )}
                  </div>

                  {notifications.length > 0 && (
                    <div className="border-t border-white/[0.06] p-2">
                      <button
                        type="button"
                        onClick={() => { setShowNotifications(false); navigate('/alerts'); }}
                        className="w-full rounded-lg bg-brand-500 py-2 text-sm font-semibold text-white transition hover:bg-brand-400"
                      >
                        View all alerts
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* User pill */}
            <div className="flex items-center gap-2 rounded-lg border border-white/[0.08] bg-white/[0.04] px-3 py-1.5">
              <div className="flex h-6 w-6 items-center justify-center rounded-md bg-brand-500/20 text-[10px] font-bold text-brand-300">
                {profile?.collectorName?.charAt(0)?.toUpperCase() ?? 'A'}
              </div>
              <span className="hidden text-sm font-medium text-slate-300 md:block">
                {profile?.collectorName ?? 'Admin'}
              </span>
            </div>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto overscroll-contain">
          <div className="p-5 xl:p-6">
            <ErrorBoundary key={location.pathname}>
              <Outlet />
            </ErrorBoundary>
          </div>
        </main>
      </div>
    </div>
  );
}

export default DashboardLayout;
