import { useNotifications } from '../context/NotificationContext';
import { useSmartBinContext } from '../context/SmartBinContext';

function AlertsPage() {
  const { notifications, loading, refreshNotifications, markAsSolved, markProblemSolved } = useNotifications();
  const { state } = useSmartBinContext();
  const alerts = notifications;
  const liveAlerts = alerts.length;

  return (
    <div className="space-y-6">
      <div className="rounded-[32px] border border-white/10 bg-slate-950/80 p-6 shadow-panel">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h3 className="text-2xl font-semibold text-white">Alerts & Notifications</h3>
            <p className="mt-2 text-sm text-slate-400">Monitor active overflow, gas, device offline, and battery alerts.</p>
          </div>
          <div className="rounded-3xl bg-slate-900/80 px-4 py-3 text-sm font-semibold text-white">
            Live alerts: {liveAlerts}
          </div>
        </div>
      </div>

      <div className="grid gap-5 xl:grid-cols-3">
        <div className="glass-panel rounded-[28px] border border-white/10 p-6 shadow-panel">
          <p className="text-sm uppercase tracking-[0.24em] text-slate-400">Active Alerts</p>
          <p className="mt-4 text-3xl font-semibold text-white">{liveAlerts}</p>
          <p className="mt-2 text-sm text-slate-400">Current alert count from incoming bin telemetry.</p>
        </div>
        <div className="glass-panel rounded-[28px] border border-white/10 p-6 shadow-panel">
          <p className="text-sm uppercase tracking-[0.24em] text-slate-400">Connections</p>
          <p className="mt-4 text-3xl font-semibold text-white">{state.status === 'connected' ? 'Online' : 'Offline'}</p>
          <p className="mt-2 text-sm text-slate-400">Socket status for live alert updates.</p>
        </div>
        <div className="glass-panel rounded-[28px] border border-white/10 p-6 shadow-panel">
          <p className="text-sm uppercase tracking-[0.24em] text-slate-400">Last update</p>
          <p className="mt-4 text-3xl font-semibold text-white">{state.lastUpdate ? new Date(state.lastUpdate).toLocaleTimeString() : 'N/A'}</p>
          <p className="mt-2 text-sm text-slate-400">Most recent notification refresh.</p>
        </div>
      </div>

      <div className="space-y-4">
        {loading ? (
          <div className="rounded-[28px] border border-white/10 bg-slate-950/80 p-8 text-center text-slate-400">
            Loading notifications...
          </div>
        ) : alerts.length === 0 ? (
          <div className="rounded-[28px] border border-dashed border-white/10 bg-slate-950/80 p-8 text-center text-slate-400">
            No active notifications at the moment.
          </div>
        ) : (
          alerts.map((alert) => (
            <div key={alert._id} className="rounded-3xl border border-white/10 bg-slate-950/80 p-6 shadow-panel">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-sm uppercase tracking-[0.24em] text-slate-400">{alert.severity === 'critical' ? 'Critical' : 'Warning'}</p>
                  <h4 className="mt-2 text-xl font-semibold text-white">{alert.title}</h4>
                </div>
                <span className="rounded-full bg-brand-500/15 px-3 py-1 text-xs font-semibold uppercase tracking-[0.24em] text-brand-200">
                  {alert.time}
                </span>
              </div>
              <p className="mt-4 text-sm text-slate-300">{alert.message}</p>
              <div className="mt-4 flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => markAsSolved(alert._id)}
                  className="rounded-3xl bg-slate-800/80 px-3 py-2 text-sm font-semibold text-white transition hover:bg-slate-700"
                >
                  Mark Solved
                </button>
                <button
                  type="button"
                  onClick={() => markProblemSolved(alert._id)}
                  className="rounded-3xl bg-slate-800/80 px-3 py-2 text-sm font-semibold text-white transition hover:bg-slate-700"
                >
                  Problem Solved
                </button>
                <span className="rounded-full bg-white/5 px-3 py-2 text-xs text-slate-300">
                  {alert.solved ? 'Solved' : 'Unsolved'} · {alert.problemSolved ? 'Problem Resolved' : 'Action Needed'}
                </span>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

export default AlertsPage;
