import { useMemo } from 'react';
import { useParams } from 'react-router-dom';
import {
  Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from 'recharts';
import { ShieldCheck, Thermometer, Wind, BatteryCharging, Droplet, MapPin } from 'lucide-react';
import { useSmartBinData } from '../hooks/useSmartBinData';
import StatusBadge from '../components/StatusBadge';

/* ── Telemetry tile ────────────────────────────────────────────── */
function TelemetryTile({
  icon,
  label,
  value,
  accent = 'blue',
}: {
  icon: React.ReactNode;
  label: string;
  value: string | number;
  accent?: 'blue' | 'sky' | 'emerald' | 'violet' | 'amber';
}) {
  const iconBg: Record<string, string> = {
    blue:    'bg-brand-500/10 text-brand-300',
    sky:     'bg-sky-500/10 text-sky-300',
    emerald: 'bg-emerald-500/10 text-emerald-300',
    violet:  'bg-violet-500/10 text-violet-300',
    amber:   'bg-amber-400/10 text-amber-300',
  };
  return (
    <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-4">
      <div className={`mb-3 inline-flex items-center gap-1.5 rounded-lg p-2 ${iconBg[accent]}`}>
        {icon}
        <span className="text-[10px] font-semibold uppercase tracking-widest">{label}</span>
      </div>
      <p className="text-3xl font-bold tracking-tight text-white">{value}</p>
    </div>
  );
}

function BinDetailsPage() {
  const { id }   = useParams();
  const { data } = useSmartBinData();
  const bin      = useMemo(() => data?.bins.find((b) => b.deviceId === id), [data, id]);

  if (!bin) {
    return (
      <div className="flex min-h-[320px] items-center justify-center rounded-2xl border border-white/[0.06] bg-slate-900/60 text-center">
        <div>
          <p className="text-base font-semibold text-white">Select a bin from the fleet</p>
          <p className="mt-1.5 text-sm text-slate-500">Navigate to Bin Monitoring and click a row.</p>
        </div>
      </div>
    );
  }

  const chartData    = data?.charts.fillLevelHistory.slice(-12) ?? [];
  const fillColor    = bin.fillLevel > 80 ? 'text-rose-300' : bin.fillLevel > 60 ? 'text-amber-300' : 'text-emerald-300';
  const fillBarColor = bin.fillLevel > 80 ? 'bg-rose-500'   : bin.fillLevel > 60 ? 'bg-amber-400'   : 'bg-emerald-500';

  return (
    <div className="space-y-5">

      {/* Header */}
      <div className="glass-panel shadow-card rounded-2xl p-5">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-xs font-medium uppercase tracking-widest text-slate-500">Bin Details</p>
            <h1 className="mt-1.5 text-2xl font-semibold text-white">{bin.location}</h1>
            <p className="mt-1 text-sm text-slate-500">Device ID: <span className="font-mono text-slate-300">{bin.deviceId}</span></p>
          </div>
          <StatusBadge status={bin.status} />
        </div>

        {/* Fill level hero */}
        <div className="mt-5 rounded-xl border border-white/[0.06] bg-white/[0.02] p-4">
          <div className="flex items-center justify-between">
            <p className="text-xs font-medium uppercase tracking-widest text-slate-500">Current Fill Level</p>
            <p className={`text-2xl font-bold ${fillColor}`}>{bin.fillLevel}%</p>
          </div>
          <div className="mt-3 h-2.5 overflow-hidden rounded-full bg-slate-800">
            <div className={`h-full rounded-full fill-bar ${fillBarColor}`} style={{ width: `${bin.fillLevel}%` }} />
          </div>
        </div>
      </div>

      {/* Two-column content */}
      <div className="grid gap-5 xl:grid-cols-[1.1fr_0.9fr]">

        {/* Left: telemetry + chart */}
        <div className="space-y-5">
          <div className="glass-panel shadow-card rounded-2xl p-5">
            <h2 className="mb-4 text-sm font-semibold text-white">Live Telemetry</h2>
            <div className="grid gap-3 sm:grid-cols-2">
              <TelemetryTile icon={<Thermometer size={14} />}    label="Temperature" value={`${bin.temperature}°C`} accent="amber" />
              <TelemetryTile icon={<Droplet size={14} />}        label="Fill Level"  value={`${bin.fillLevel}%`}   accent="sky"   />
              <TelemetryTile icon={<BatteryCharging size={14} />}label="Battery"     value={`${bin.battery}%`}     accent="emerald" />
              <TelemetryTile icon={<Wind size={14} />}           label="Signal"      value={`${bin.rssi} dBm`}     accent="violet" />
            </div>
          </div>

          {/* Fill level chart */}
          <div className="glass-panel shadow-card rounded-2xl p-5">
            <div className="mb-4 flex items-center gap-2 text-slate-400">
              <ShieldCheck size={15} />
              <span className="text-sm font-semibold text-white">Fill Level History</span>
            </div>
            <div className="h-56">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData} margin={{ left: -20, right: 8, top: 8, bottom: 0 }}>
                  <defs>
                    <linearGradient id="fillGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%"   stopColor="#38bdf8" stopOpacity={0.3} />
                      <stop offset="100%" stopColor="#38bdf8" stopOpacity={0}   />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                  <XAxis dataKey="time" tick={{ fill: '#475569', fontSize: 11 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fill: '#475569', fontSize: 11 }} axisLine={false} tickLine={false} />
                  <Tooltip
                    contentStyle={{
                      background: 'var(--chart-tooltip-bg)',
                      border: '1px solid var(--chart-tooltip-border)',
                      color: 'var(--chart-tooltip-text)',
                      borderRadius: '10px',
                      fontSize: '12px',
                    }}
                  />
                  <Area type="monotone" dataKey="value" stroke="#38bdf8" strokeWidth={2} fill="url(#fillGrad)" dot={false} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        {/* Right: summary + location */}
        <div className="space-y-5">
          <div className="glass-panel shadow-card rounded-2xl p-5">
            <h2 className="mb-4 text-sm font-semibold text-white">Telemetry Summary</h2>
            <div className="space-y-2">
              {[
                { label: 'Humidity',     value: `${bin.humidity}%`   },
                { label: 'Gas Level',    value: String(bin.gasLevel)  },
                { label: 'Status',       value: bin.status            },
                { label: 'Last Updated', value: bin.lastUpdated       },
              ].map(({ label, value }) => (
                <div key={label} className="flex items-center justify-between rounded-lg border border-white/[0.05] bg-white/[0.02] px-4 py-3">
                  <span className="text-xs text-slate-500">{label}</span>
                  <span className="text-sm font-semibold text-white">{value}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="glass-panel shadow-card rounded-2xl p-5">
            <div className="flex items-center gap-2 text-slate-400">
              <MapPin size={15} />
              <h2 className="text-sm font-semibold text-white">Location</h2>
            </div>
            <p className="mt-3 text-sm text-slate-400">{bin.location}</p>
            <p className="mt-1 text-xs text-slate-600">Monitored continuously with live sensor telemetry.</p>
            <div className="mt-4 rounded-xl border border-white/[0.06] bg-white/[0.02] p-4">
              <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-600">Coordinates</p>
              <p className="mt-2 font-mono text-sm text-white">
                {bin.latitude  !== undefined ? bin.latitude.toFixed(6)  : '—'},&nbsp;
                {bin.longitude !== undefined ? bin.longitude.toFixed(6) : '—'}
              </p>
              {(bin.latitude === undefined || bin.longitude === undefined) && (
                <p className="mt-1.5 text-xs text-slate-600">Live coordinates not yet available for this bin.</p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default BinDetailsPage;
