import { useNotifications } from '../context/NotificationContext';
import { useSmartBinContext } from '../context/SmartBinContext';
import { AlertTriangle, CheckCircle2, RefreshCw, Wifi, WifiOff, Clock } from 'lucide-react';

function AlertsPage() {
  const { notifications, loading, refreshNotifications, markAsSolved, markProblemSolved } = useNotifications();
  const { state } = useSmartBinContext();
  const alerts    = notifications;
  const liveAlerts = alerts.length;
  const isConnected = state.status === 'connected';

  return (
    <div className="space-y-5">

      {/* Page header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-semibold text-white">Alerts &amp; Notifications</h1>
          <p className="mt-0.5 text-sm text-slate-500">Overflow, gas, offline, and battery alerts from all bins.</p>
        </div>
        <button
          type="button"
          onClick={refreshNotifications}
          className="inline-flex items-center gap-2 rounded-lg border border-white/[0.08] bg-white/[0.04] px-3 py-2 text-sm text-slate-300 transition hover:bg-white/[0.07] hover:text-white"
        >
          <RefreshCw size={14} />
          Refresh
        </button>
      </div>

      {/* Stat strip */}
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="glass-panel shadow-card rounded-2xl p-4">
          <div className="flex items-center justify-between">
            <p className="text-xs font-medium uppercase tracking-widest text-slate-500">Active Alerts</p>
            <div className={`flex h-8 w-8 items-center justify-center rounded-lg ${liveAlerts > 0 ? 'bg-rose-500/10 text-rose-400' : 'bg-emerald-500/10 text-emerald-400'}`}>
              <AlertTriangle size={15} />
            </div>
          </div>
          <p className={`mt-3 text-3xl font-bold tracking-tight ${liveAlerts > 0 ? 'text-rose-300' : 'text-emerald-300'}`}>
            {liveAlerts}
          </p>
          <p className="mt-1 text-xs text-slate-500">Current alerts from bin telemetry</p>
        </div>

        <div className="glass-panel shadow-card rounded-2xl p-4">
          <div className="flex items-center justify-between">
            <p className="text-xs font-medium uppercase tracking-widest text-slate-500">Connection</p>
            <div className={`flex h-8 w-8 items-center justify-center rounded-lg ${isConnected ? 'bg-emerald-500/10 text-emerald-400' : 'bg-slate-700/40 text-slate-400'}`}>
              {isConnected ? <Wifi size={15} /> : <WifiOff size={15} />}
            </div>
          </div>
          <p className={`mt-3 text-3xl font-bold tracking-tight ${isConnected ? 'text-emerald-300' : 'text-slate-400'}`}>
            {isConnected ? 'Online' : 'Offline'}
          </p>
          <p className="mt-1 text-xs text-slate-500">Socket status for live updates</p>
        </div>

        <div className="glass-panel shadow-card rounded-2xl p-4">
          <div className="flex items-center justify-between">
            <p className="text-xs font-medium uppercase tracking-widest text-slate-500">Last Update</p>
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-500/10 text-brand-400">
              <Clock size={15} />
            </div>
          </div>
          <p className="mt-3 text-3xl font-bold tracking-tight text-white">
            {state.lastUpdate ? new Date(state.lastUpdate).toLocaleTimeString() : '—'}
          </p>
          <p className="mt-1 text-xs text-slate-500">Most recent notification refresh</p>
        </div>
      </div>

      {/* Alert list */}
      {loading ? (
        <div className="flex h-40 items-center justify-center rounded-2xl border border-white/[0.06] bg-slate-900/60">
          <p className="text-sm text-slate-500">Loading notifications…</p>
        </div>
      ) : alerts.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-white/[0.08] bg-slate-900/30 py-16 text-center">
          <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-500/10 text-emerald-400">
            <CheckCircle2 size={22} />
          </div>
          <p className="text-sm font-semibold text-white">All clear — no active alerts</p>
          <p className="mt-1 text-xs text-slate-500">Your bins are operating within normal parameters.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {alerts.map((alert) => {
            const isCritical = alert.severity === 'critical';
            return (
              <div
                key={alert._id}
                className={`glass-panel shadow-card rounded-2xl border-l-4 p-5 ${
                  isCritical ? 'border-l-rose-500' : 'border-l-amber-400'
                }`}
              >
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className={`inline-flex rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider ${
                        isCritical
                          ? 'bg-rose-500/15 text-rose-300'
                          : 'bg-amber-400/15 text-amber-300'
                      }`}>
                        {isCritical ? 'Critical' : 'Warning'}
                      </span>
                      <span className="text-xs text-slate-500">{alert.time}</span>
                    </div>
                    <h3 className="mt-2 text-base font-semibold text-white">{alert.title}</h3>
                    <p className="mt-1 text-sm text-slate-400">{alert.message}</p>
                  </div>

                  {/* Status pill */}
                  <div className="shrink-0">
                    <span className={`inline-flex rounded-lg px-2.5 py-1 text-[11px] font-semibold ${
                      alert.solved
                        ? 'bg-emerald-500/10 text-emerald-300'
                        : 'bg-slate-700/40 text-slate-400'
                    }`}>
                      {alert.solved ? '✓ Solved' : 'Unsolved'}
                    </span>
                  </div>
                </div>

                {/* Actions */}
                <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-white/[0.05] pt-4">
                  <button
                    type="button"
                    onClick={() => markAsSolved(alert._id)}
                    className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-500/10 px-3 py-1.5 text-sm font-semibold text-emerald-300 transition hover:bg-emerald-500/20"
                  >
                    <CheckCircle2 size={13} />
                    Mark Solved
                  </button>
                  <button
                    type="button"
                    onClick={() => markProblemSolved(alert._id)}
                    className="inline-flex items-center gap-1.5 rounded-lg bg-brand-500/10 px-3 py-1.5 text-sm font-semibold text-brand-300 transition hover:bg-brand-500/20"
                  >
                    Problem Resolved
                  </button>
                  <span className={`ml-auto rounded-lg px-2.5 py-1 text-[11px] font-medium ${
                    alert.problemSolved
                      ? 'bg-emerald-500/10 text-emerald-400'
                      : 'bg-slate-800/60 text-slate-500'
                  }`}>
                    {alert.problemSolved ? '✓ Problem cleared' : 'Action needed'}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default AlertsPage;
