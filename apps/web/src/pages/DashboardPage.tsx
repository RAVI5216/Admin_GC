import { Bell, Droplet, MapPin, Truck, Zap, AlertTriangle } from 'lucide-react';
import { useMemo } from 'react';
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts';
import { MapContainer, Marker, Popup, TileLayer } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import { useSmartBinData } from '../hooks/useSmartBinData';
import StatCard from '../components/StatCard';
import StatusBadge from '../components/StatusBadge';

/* ── Fill level helper ─────────────────────────────────────────── */
function fillColor(level: number) {
  if (level > 80) return { bar: 'bg-rose-500',   text: 'text-rose-300',   bg: 'bg-rose-500/10'   };
  if (level > 60) return { bar: 'bg-amber-400',  text: 'text-amber-300',  bg: 'bg-amber-400/10'  };
  return               { bar: 'bg-emerald-500', text: 'text-emerald-300', bg: 'bg-emerald-500/10' };
}

function FillBar({ level }: { level: number }) {
  const c = fillColor(level);
  return (
    <div className="flex items-center gap-2">
      <div className="h-1.5 w-20 overflow-hidden rounded-full bg-slate-800">
        <div className={`h-full rounded-full fill-bar ${c.bar}`} style={{ width: `${level}%` }} />
      </div>
      <span className={`text-xs font-semibold ${c.text}`}>{level}%</span>
    </div>
  );
}

/* ── Stat card section ─────────────────────────────────────────── */
const PIE_COLORS: Record<string, string> = {
  'Not Full':       '#10b981',
  'Partially Full': '#f59e0b',
  'Full':           '#f43f5e',
  'Offline':        '#475569',
};

function DashboardPage() {
  const { data, connected } = useSmartBinData();

  if (!data) {
    return (
      <div className="flex min-h-[480px] items-center justify-center rounded-2xl border border-white/[0.07] bg-slate-900 shadow-card">
        <div className="text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-brand-500/10 text-brand-400">
            <Zap size={22} />
          </div>
          <p className="text-base font-semibold text-white">Waiting for live sensor data</p>
          <p className="mt-1.5 text-sm text-slate-500">Connect to the backend to stream bin telemetry.</p>
        </div>
      </div>
    );
  }

  /* ── Derived data ──────────────────────────────────────────────── */
  const routeBins = useMemo(() => {
    const base = new Date();
    return [...data.bins]
      .sort((a, b) => b.fillLevel - a.fillLevel)
      .slice(0, 5)
      .map((bin, i) => {
        const eta = new Date(base.getTime() + i * 15 * 60 * 1000);
        return {
          ...bin,
          eta: eta.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        };
      });
  }, [data.bins]);

  const liveMapBins = useMemo(
    () => data.bins.filter((b) => b.latitude !== undefined && b.longitude !== undefined),
    [data.bins]
  );

  const center = useMemo<[number, number]>(() => {
    if (liveMapBins.length > 0) {
      return [
        liveMapBins.reduce((s, b) => s + (b.latitude ?? 0), 0) / liveMapBins.length,
        liveMapBins.reduce((s, b) => s + (b.longitude ?? 0), 0) / liveMapBins.length,
      ];
    }
    return [1.3521, 103.8198];
  }, [liveMapBins]);

  const notFullCount  = data.bins.filter((b) => b.fillLevel <= 60).length;
  const partlyCount   = data.bins.filter((b) => b.fillLevel > 60 && b.fillLevel <= 80).length;
  const progressPct   = data.totals.totalBins
    ? Math.round((data.totals.collectionsToday / data.totals.totalBins) * 100)
    : 0;

  const statusSlices = [
    { name: 'Not Full',       value: notFullCount,           color: PIE_COLORS['Not Full']       },
    { name: 'Partially Full', value: partlyCount,             color: PIE_COLORS['Partially Full'] },
    { name: 'Full',           value: data.totals.fullBins,    color: PIE_COLORS['Full']           },
    { name: 'Offline',        value: data.totals.offlineBins, color: PIE_COLORS['Offline']        },
  ].filter((s) => s.value > 0);

  const binsOver80 = data.bins.filter((b) => b.fillLevel > 80).length;

  return (
    <div className="space-y-5">

      {/* ── Metric cards row ─────────────────────────────────────── */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Total Bins"
          value={data.totals.totalBins}
          icon={<Zap size={18} />}
          accent="blue"
          highlight={`${data.totals.onlineBins} online`}
        />
        <StatCard
          label="Active Alerts"
          value={data.totals.liveAlerts}
          icon={<Bell size={18} />}
          accent={data.totals.liveAlerts > 0 ? 'rose' : 'emerald'}
          highlight={data.totals.liveAlerts > 0 ? 'Needs attention' : 'All clear'}
        />
        <StatCard
          label="Bins over 80%"
          value={binsOver80}
          icon={<Droplet size={18} />}
          accent={binsOver80 > 0 ? 'amber' : 'emerald'}
          highlight="Require immediate collection"
        />
        <StatCard
          label="Collected Today"
          value={data.totals.collectionsToday}
          icon={<Truck size={18} />}
          accent="emerald"
          highlight={`${progressPct}% of fleet`}
        />
      </div>

      {/* ── Primary content: Map + Alerts ────────────────────────── */}
      <div className="grid gap-5 xl:grid-cols-[1fr_340px]">

        {/* Live map */}
        <div className="glass-panel shadow-card rounded-2xl p-4">
          <div className="mb-3 flex items-center justify-between">
            <div>
              <h2 className="text-sm font-semibold text-white">Live Bin Map</h2>
              <p className="text-xs text-slate-500">Real-time locations across the city</p>
            </div>
            <div className="flex items-center gap-1.5 rounded-full border border-white/[0.08] bg-white/[0.04] px-3 py-1 text-xs text-slate-400">
              <MapPin size={12} className="text-brand-400" />
              {liveMapBins.length} located
            </div>
          </div>

          <div className="overflow-hidden rounded-xl border border-white/[0.07]">
            {liveMapBins.length > 0 ? (
              <MapContainer center={center} zoom={11} className="h-[440px] w-full" scrollWheelZoom={false}>
                <TileLayer url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}.png" />
                {liveMapBins.map((bin) => (
                  <Marker key={bin.deviceId} position={[bin.latitude as number, bin.longitude as number]}>
                    <Popup>
                      <div className="text-slate-900 text-sm">
                        <p className="font-semibold">{bin.location}</p>
                        <p className="text-xs text-gray-500">{bin.deviceId}</p>
                        <p className="mt-1">Fill: <strong>{bin.fillLevel}%</strong></p>
                        <p>Status: <strong>{bin.status}</strong></p>
                      </div>
                    </Popup>
                  </Marker>
                ))}
              </MapContainer>
            ) : (
              <div className="flex h-[440px] items-center justify-center bg-slate-950/60 text-center">
                <div>
                  <MapPin size={28} className="mx-auto mb-3 text-slate-600" />
                  <p className="text-sm font-medium text-white">No location data</p>
                  <p className="mt-1 text-xs text-slate-500">Add lat/lng to bin payloads to see live positions.</p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right column: alerts + donut */}
        <div className="flex flex-col gap-5">

          {/* Live alerts */}
          <div className="glass-panel shadow-card flex flex-1 flex-col rounded-2xl p-4">
            <div className="mb-3 flex items-center justify-between">
              <div>
                <h2 className="text-sm font-semibold text-white">Live Alerts</h2>
                <p className="text-xs text-slate-500">Most recent notifications</p>
              </div>
              <StatusBadge status={connected ? 'online' : 'offline'} />
            </div>

            <div className="flex-1 space-y-2 overflow-y-auto">
              {data.alerts.length === 0 ? (
                <div className="flex h-32 items-center justify-center rounded-xl border border-dashed border-white/[0.07] text-center">
                  <div>
                    <p className="text-sm font-medium text-slate-400">No active alerts</p>
                    <p className="mt-1 text-xs text-slate-600">Bins operating normally</p>
                  </div>
                </div>
              ) : (
                data.alerts.slice(0, 5).map((alert) => (
                  <div
                    key={alert.id}
                    className="rounded-lg border border-white/[0.06] bg-white/[0.02] p-3"
                  >
                    <p className="text-xs font-semibold text-white">{alert.title}</p>
                    <p className="mt-0.5 text-xs text-slate-500 line-clamp-2">{alert.message}</p>
                    <p className="mt-1.5 text-[10px] text-slate-600">{alert.time}</p>
                  </div>
                ))
              )}
            </div>

            <div className="mt-3 flex items-center justify-between rounded-lg bg-slate-900/60 px-3 py-2.5 text-xs">
              <span className="text-slate-500">Active alerts</span>
              <span className="font-semibold text-white">{data.totals.liveAlerts}</span>
            </div>
          </div>

          {/* Bin status donut */}
          <div className="glass-panel shadow-card rounded-2xl p-4">
            <h2 className="mb-1 text-sm font-semibold text-white">Bin Status Mix</h2>
            <p className="mb-3 text-xs text-slate-500">Distribution by fill level</p>
            <div className="h-36">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={statusSlices} innerRadius={44} outerRadius={64} paddingAngle={3} dataKey="value">
                    {statusSlices.map((s) => (
                      <Cell key={s.name} fill={s.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      background: 'var(--chart-tooltip-bg)',
                      border: '1px solid var(--chart-tooltip-border)',
                      color: 'var(--chart-tooltip-text)',
                      borderRadius: '8px',
                      fontSize: '12px',
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="mt-2 grid grid-cols-2 gap-1.5">
              {statusSlices.map((s) => (
                <div key={s.name} className="flex items-center gap-1.5">
                  <span className="h-2 w-2 shrink-0 rounded-full" style={{ background: s.color }} />
                  <span className="truncate text-[11px] text-slate-400">{s.name}</span>
                  <span className="ml-auto text-[11px] font-semibold text-white">{s.value}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* ── Collection progress + Priority queue ─────────────────── */}
      <div className="grid gap-5 xl:grid-cols-[1fr_1fr]">

        {/* Collection progress */}
        <div className="glass-panel shadow-card rounded-2xl p-5">
          <h2 className="text-sm font-semibold text-white">Collection Progress Today</h2>
          <p className="mt-0.5 text-xs text-slate-500">Bins collected out of total fleet</p>
          <div className="mt-4 flex items-end gap-3">
            <p className="text-4xl font-bold tracking-tight text-white">{data.totals.collectionsToday}</p>
            <p className="mb-1 text-sm text-slate-500">/ {data.totals.totalBins} bins</p>
          </div>
          <div className="mt-4 h-2 overflow-hidden rounded-full bg-slate-800">
            <div
              className="h-full rounded-full bg-gradient-to-r from-brand-500 to-brand-400 fill-bar"
              style={{ width: `${progressPct}%` }}
            />
          </div>
          <div className="mt-2 flex justify-between text-xs text-slate-500">
            <span>0%</span>
            <span className="font-semibold text-brand-300">{progressPct}% complete</span>
            <span>100%</span>
          </div>
        </div>

        {/* Priority queue */}
        <div className="glass-panel shadow-card rounded-2xl p-5">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h2 className="text-sm font-semibold text-white">Priority Collection Queue</h2>
              <p className="mt-0.5 text-xs text-slate-500">Highest fill levels first</p>
            </div>
            <span className="flex items-center gap-1 rounded-full bg-amber-400/10 px-2.5 py-1 text-[11px] font-semibold text-amber-300">
              <AlertTriangle size={11} />
              {routeBins.length} stops
            </span>
          </div>

          <div className="space-y-2">
            {routeBins.map((bin, i) => {
              const c = fillColor(bin.fillLevel);
              return (
                <div key={bin.deviceId} className="flex items-center gap-3 rounded-lg border border-white/[0.06] bg-white/[0.02] px-3 py-2.5">
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-slate-800 text-[11px] font-bold text-slate-400">
                    {i + 1}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-xs font-semibold text-white">{bin.location}</p>
                    <p className="text-[10px] text-slate-600">{bin.deviceId} · ETA {bin.eta}</p>
                  </div>
                  <FillBar level={bin.fillLevel} />
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

export default DashboardPage;
