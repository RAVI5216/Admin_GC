import { useMemo } from 'react';
import { useParams } from 'react-router-dom';
import { Area, AreaChart, CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { ShieldCheck, Thermometer, Wind, BatteryCharging, Wifi, Droplet } from 'lucide-react';
import { useSmartBinData } from '../hooks/useSmartBinData';
import StatusBadge from '../components/StatusBadge';

function BinDetailsPage() {
  const { id } = useParams();
  const { data } = useSmartBinData();

  const bin = useMemo(() => data?.bins.find((item) => item.deviceId === id), [data, id]);

  if (!bin) {
    return (
      <div className="rounded-[32px] border border-white/10 bg-slate-950/80 p-10 text-slate-300 shadow-panel">
        <p className="text-lg font-medium text-white">Select a bin from the fleet to view live telemetry.</p>
      </div>
    );
  }

  const chartData = data?.charts.fillLevelHistory.slice(-12) ?? [];

  return (
    <div className="space-y-6">
      <div className="rounded-[32px] border border-white/10 bg-slate-950/80 p-6 shadow-panel">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-sm uppercase tracking-[0.24em] text-slate-400">Bin Details</p>
            <h3 className="mt-2 text-3xl font-semibold text-white">{bin.location}</h3>
            <p className="mt-2 text-sm text-slate-400">Device ID: {bin.deviceId}</p>
          </div>
          <StatusBadge status={bin.status} />
        </div>
      </div>

      <div className="grid gap-5 xl:grid-cols-2">
        <div className="space-y-5 rounded-[32px] border border-white/10 bg-slate-950/80 p-6 shadow-panel">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="rounded-3xl bg-slate-950/70 p-5">
              <div className="flex items-center gap-3 text-brand-300"><Thermometer size={18} /><span className="text-sm uppercase tracking-[0.2em]">Temperature</span></div>
              <p className="mt-5 text-4xl font-semibold text-white">{bin.temperature}°C</p>
            </div>
            <div className="rounded-3xl bg-slate-950/70 p-5">
              <div className="flex items-center gap-3 text-sky-300"><Droplet size={18} /><span className="text-sm uppercase tracking-[0.2em]">Fill Level</span></div>
              <p className="mt-5 text-4xl font-semibold text-white">{bin.fillLevel}%</p>
            </div>
            <div className="rounded-3xl bg-slate-950/70 p-5">
              <div className="flex items-center gap-3 text-emerald-300"><BatteryCharging size={18} /><span className="text-sm uppercase tracking-[0.2em]">Battery</span></div>
              <p className="mt-5 text-4xl font-semibold text-white">{bin.battery}%</p>
            </div>
            <div className="rounded-3xl bg-slate-950/70 p-5">
              <div className="flex items-center gap-3 text-violet-300"><Wind size={18} /><span className="text-sm uppercase tracking-[0.2em]">Signal</span></div>
              <p className="mt-5 text-4xl font-semibold text-white">{bin.rssi} dBm</p>
            </div>
          </div>

          <div className="rounded-[28px] bg-slate-950/70 p-5">
            <div className="mb-5 flex items-center gap-3 text-slate-300">
              <ShieldCheck size={18} />
              <span className="text-sm uppercase tracking-[0.2em]">Live telemetry charts</span>
            </div>
            <div className="h-[320px]">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData} margin={{ left: -20, right: -20, top: 10, bottom: 5 }}>
                  <CartesianGrid opacity={0.12} vertical={false} />
                  <XAxis dataKey="time" tick={{ fill: '#94a3b8', fontSize: 12 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fill: '#94a3b8', fontSize: 12 }} axisLine={false} tickLine={false} />
                  <Tooltip contentStyle={{ background: '#0b1728', border: '1px solid rgba(148,163,184,0.18)' }} />
                  <Line type="monotone" dataKey="value" stroke="#38bdf8" strokeWidth={3} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        <div className="space-y-5">
          <div className="rounded-[32px] border border-white/10 bg-slate-950/80 p-6 shadow-panel">
            <h4 className="text-xl font-semibold text-white">Telemetry Summary</h4>
            <div className="mt-5 grid gap-4">
              <div className="rounded-3xl bg-slate-950/70 p-5">
                <p className="text-sm text-slate-400">Humidity</p>
                <p className="mt-2 text-3xl font-semibold text-white">{bin.humidity}%</p>
              </div>
              <div className="rounded-3xl bg-slate-950/70 p-5">
                <p className="text-sm text-slate-400">Gas Level</p>
                <p className="mt-2 text-3xl font-semibold text-white">{bin.gasLevel}</p>
              </div>
              <div className="rounded-3xl bg-slate-950/70 p-5">
                <p className="text-sm text-slate-400">Current Status</p>
                <p className="mt-2 text-3xl font-semibold text-white">{bin.status}</p>
              </div>
              <div className="rounded-3xl bg-slate-950/70 p-5">
                <p className="text-sm text-slate-400">Last Updated</p>
                <p className="mt-2 text-3xl font-semibold text-white">{bin.lastUpdated}</p>
              </div>
            </div>
          </div>

          <div className="rounded-[32px] border border-white/10 bg-slate-950/80 p-6 shadow-panel">
            <h4 className="text-xl font-semibold text-white">Location</h4>
            <p className="mt-3 text-slate-400">{bin.location} — monitored continuously with live sensor telemetry.</p>
            <div className="mt-6 rounded-3xl bg-slate-950/70 p-5 text-slate-300">
              <p className="text-sm uppercase tracking-[0.2em] text-slate-500">Coordinates</p>
              <p className="mt-3 text-lg text-white">
                Latitude: {bin.latitude !== undefined ? bin.latitude : '--'}, Longitude: {bin.longitude !== undefined ? bin.longitude : '--'}
              </p>
              {bin.latitude === undefined || bin.longitude === undefined ? (
                <p className="mt-2 text-sm text-slate-400">Live coordinates are not available for this bin yet.</p>
              ) : null}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default BinDetailsPage;
