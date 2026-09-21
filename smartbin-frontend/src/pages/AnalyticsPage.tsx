import { useMemo } from 'react';
import StatCard from '../components/StatCard';
import ChartCard from '../components/ChartCard';
import { useSmartBinData } from '../hooks/useSmartBinData';
import { Signal } from 'lucide-react';

function AnalyticsPage() {
  const { data, connected } = useSmartBinData();

  const metrics = useMemo(() => {
    if (!data) {
      return [
        { label: 'Bins Collected',   value: '—', icon: '♻️', highlight: 'Waiting for hardware telemetry', accent: 'blue' as const },
        { label: 'Route Efficiency', value: '—', icon: '📍', highlight: 'Connect an ESP32 device to begin', accent: 'emerald' as const },
        { label: 'Avg Fill Level',   value: '—', icon: '📈', highlight: 'Fill values will appear here live', accent: 'amber' as const },
        { label: 'Alerts',           value: '—', icon: '⚠️', highlight: 'Live alerts stream in automatically', accent: 'rose' as const },
      ];
    }
    const avgFill     = data.bins.length > 0 ? Math.round(data.bins.reduce((s, b) => s + b.fillLevel, 0) / data.bins.length) : 0;
    const highestFill = data.bins.length > 0 ? Math.max(...data.bins.map((b) => b.fillLevel)) : 0;
    const alertCount  = data.alerts.length;
    return [
      { label: 'Bins Collected',   value: data.totals.collectionsToday,                 icon: '♻️', highlight: `${data.totals.totalBins} bins tracked live`,                accent: 'blue'    as const },
      { label: 'Route Efficiency', value: `${Math.max(70, 100 - highestFill + 10)}%`,   icon: '📍', highlight: 'Updated from latest hardware packet',                      accent: 'emerald' as const },
      { label: 'Avg Fill Level',   value: `${avgFill}%`,                                icon: '📈', highlight: `${data.totals.fullBins} bins need attention`,               accent: 'amber'   as const },
      { label: 'Alerts',           value: alertCount,                                    icon: '⚠️', highlight: connected ? 'Streaming in real time' : 'Waiting for conn.', accent: 'rose'    as const },
    ];
  }, [connected, data]);

  const trendData = useMemo(() => {
    if (!data?.charts.fillLevelHistory?.length) return [48, 56, 62, 58, 71, 69, 78];
    return data.charts.fillLevelHistory.slice(-7).map((p) => Math.min(100, Math.max(8, Math.round(p.value))));
  }, [data]);

  const zoneData = useMemo(() => {
    if (!data?.bins.length) {
      return [
        { zone: 'North',   value: 0 },
        { zone: 'Central', value: 0 },
        { zone: 'East',    value: 0 },
        { zone: 'West',    value: 0 },
      ];
    }
    const grouped = data.bins.reduce<Record<string, number[]>>((acc, bin) => {
      const key = bin.location?.split(' ')[0] || 'Zone';
      if (!acc[key]) acc[key] = [];
      acc[key].push(bin.fillLevel);
      return acc;
    }, {});
    return Object.entries(grouped).slice(0, 4).map(([zone, vals]) => ({
      zone,
      value: Math.round(vals.reduce((s, v) => s + v, 0) / vals.length),
    }));
  }, [data]);

  const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

  return (
    <div className="space-y-5">

      {/* Page hero */}
      <div className="glass-panel shadow-card overflow-hidden rounded-2xl p-5">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className={`mb-2 inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold ${
              connected
                ? 'bg-emerald-500/10 text-emerald-300 ring-1 ring-emerald-500/20'
                : 'bg-slate-700/40 text-slate-400 ring-1 ring-slate-600/20'
            }`}>
              <span className={`h-1.5 w-1.5 rounded-full ${connected ? 'bg-emerald-400 live-dot' : 'bg-slate-500'}`} />
              {connected ? 'Live operational pulse' : 'Waiting for hardware stream'}
            </div>
            <h1 className="text-xl font-semibold text-white">Analytics</h1>
            <p className="mt-0.5 text-sm text-slate-500">
              Each ESP32 message feeds the trend, capacity, and alert views automatically.
            </p>
          </div>
          <div className="flex items-center gap-2 rounded-xl border border-white/[0.07] bg-white/[0.04] px-4 py-2.5">
            <Signal size={16} className={connected ? 'text-emerald-400' : 'text-slate-500'} />
            <div>
              <p className="text-[10px] uppercase tracking-widest text-slate-500">Status</p>
              <p className="text-sm font-semibold text-white">{connected ? 'Connected' : 'Offline'}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Metric cards */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {metrics.map((m) => (
          <StatCard
            key={m.label}
            label={m.label}
            value={m.value}
            icon={<span className="text-lg">{m.icon}</span>}
            highlight={m.highlight}
            accent={m.accent}
          />
        ))}
      </div>

      {/* Charts */}
      <div className="grid gap-5 xl:grid-cols-2">

        {/* Collection trend bar chart */}
        <ChartCard title="Collection trend" helpText="Weekly fill-level movement from the latest device events">
          <div className="flex h-full flex-col gap-3">
            <div className="flex flex-1 items-end gap-2 rounded-xl border border-white/[0.06] bg-slate-900/50 p-4">
              {trendData.map((val, i) => (
                <div key={i} className="flex flex-1 flex-col items-center gap-1.5">
                  <div className="flex w-full flex-1 items-end">
                    <div
                      className="w-full rounded-lg bg-gradient-to-t from-brand-600 to-brand-400 transition-all duration-500"
                      style={{ height: `${val}%` }}
                    />
                  </div>
                  <span className="text-[10px] font-medium text-slate-500">{days[i]}</span>
                </div>
              ))}
            </div>
            <div className="flex items-center justify-between rounded-lg border border-white/[0.06] bg-white/[0.02] px-3 py-2 text-xs">
              <span className="text-slate-500">{connected ? 'Updated from latest bin heartbeat' : 'Waiting for live updates'}</span>
              <span className="font-semibold text-white">{data ? `${Math.max(...trendData)}% peak` : '—'}</span>
            </div>
          </div>
        </ChartCard>

        {/* Capacity by zone */}
        <ChartCard title="Capacity by zone" helpText="Current fill pressure based on incoming bin telemetry">
          <div className="flex h-full flex-col justify-between gap-3">
            <div className="space-y-3">
              {zoneData.map((item) => {
                const color =
                  item.value > 80 ? 'bg-rose-500'
                  : item.value > 60 ? 'bg-amber-400'
                  : 'bg-emerald-500';
                return (
                  <div key={item.zone}>
                    <div className="mb-1.5 flex items-center justify-between text-xs">
                      <span className="font-medium text-slate-300">{item.zone}</span>
                      <span className="font-semibold text-white">{item.value}%</span>
                    </div>
                    <div className="h-2 overflow-hidden rounded-full bg-slate-800">
                      <div
                        className={`h-full rounded-full fill-bar ${color}`}
                        style={{ width: `${Math.max(4, item.value)}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
            <div className={`rounded-xl px-4 py-3 text-xs ${
              connected
                ? 'bg-emerald-500/5 text-emerald-400 ring-1 ring-emerald-500/15'
                : 'bg-slate-800/40 text-slate-500'
            }`}>
              {connected
                ? 'Latest hardware messages are driving these values now.'
                : 'Connect your ESP32 device to populate this view.'}
            </div>
          </div>
        </ChartCard>
      </div>
    </div>
  );
}

export default AnalyticsPage;
