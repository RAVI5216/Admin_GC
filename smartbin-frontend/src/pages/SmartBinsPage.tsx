import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSmartBinData } from '../hooks/useSmartBinData';
import StatusBadge from '../components/StatusBadge';
import { ChevronRight, Layers } from 'lucide-react';

/* ── Fill level badge (inline, no extra dep) ───────────────────── */
function FillBadge({ level }: { level: number }) {
  if (level > 80) {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full bg-rose-500/10 px-2.5 py-0.5 text-xs font-semibold text-rose-300 ring-1 ring-rose-500/20">
        <span className="h-1.5 w-1.5 rounded-full bg-rose-400" />
        {level}% · Immediate
      </span>
    );
  }
  if (level > 60) {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-400/10 px-2.5 py-0.5 text-xs font-semibold text-amber-300 ring-1 ring-amber-400/20">
        <span className="h-1.5 w-1.5 rounded-full bg-amber-400" />
        {level}% · Warning
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/10 px-2.5 py-0.5 text-xs font-semibold text-emerald-300 ring-1 ring-emerald-500/20">
      <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
      {level}% · Clear
    </span>
  );
}

/* ── Fill progress bar ─────────────────────────────────────────── */
function FillBar({ level }: { level: number }) {
  const color =
    level > 80 ? 'bg-rose-500' : level > 60 ? 'bg-amber-400' : 'bg-emerald-500';
  return (
    <div className="flex w-24 items-center gap-2">
      <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-slate-800">
        <div className={`h-full rounded-full fill-bar ${color}`} style={{ width: `${level}%` }} />
      </div>
    </div>
  );
}

/* ── Column header ─────────────────────────────────────────────── */
function Th({ children }: { children?: React.ReactNode }) {
  return (
    <th className="whitespace-nowrap px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-widest text-slate-500">
      {children}
    </th>
  );
}

function SmartBinsPage() {
  const { data } = useSmartBinData();
  const navigate = useNavigate();
  const rows     = useMemo(() => data?.bins ?? [], [data]);

  const critical = rows.filter((b) => b.fillLevel > 80).length;
  const warning  = rows.filter((b) => b.fillLevel > 60 && b.fillLevel <= 80).length;

  return (
    <div className="space-y-5">

      {/* Page header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-semibold text-white">Bin Monitoring</h1>
          <p className="mt-0.5 text-sm text-slate-500">Full fleet view — click any row for detailed telemetry.</p>
        </div>
        <div className="flex items-center gap-2 text-xs text-slate-400">
          {critical > 0 && (
            <span className="rounded-full bg-rose-500/10 px-3 py-1 font-semibold text-rose-300 ring-1 ring-rose-500/20">
              {critical} immediate
            </span>
          )}
          {warning > 0 && (
            <span className="rounded-full bg-amber-400/10 px-3 py-1 font-semibold text-amber-300 ring-1 ring-amber-400/20">
              {warning} warning
            </span>
          )}
          <span className="rounded-full bg-white/[0.05] px-3 py-1">
            {rows.length} total bins
          </span>
        </div>
      </div>

      {/* Table card */}
      <div className="glass-panel shadow-card overflow-hidden rounded-2xl">
        {rows.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-500/10 text-brand-400">
              <Layers size={24} />
            </div>
            <p className="text-base font-semibold text-white">No bins found</p>
            <p className="mt-1.5 text-sm text-slate-500">Connect your hardware to see live bin data.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full">
              <thead>
                <tr className="border-b border-white/[0.06] bg-white/[0.02]">
                  <Th>Device ID</Th>
                  <Th>Location</Th>
                  <Th>Fill Level</Th>
                  <Th>Progress</Th>
                  <Th>Temp</Th>
                  <Th>Humidity</Th>
                  <Th>Gas</Th>
                  <Th>Battery</Th>
                  <Th>RSSI</Th>
                  <Th>Status</Th>
                  <Th>Last Updated</Th>
                  <Th></Th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.04]">
                {rows.map((bin) => (
                  <tr
                    key={bin.deviceId}
                    onClick={() => navigate(`/smart-bins/${encodeURIComponent(bin.deviceId)}`)}
                    className="cursor-pointer transition-colors hover:bg-white/[0.03]"
                  >
                    <td className="whitespace-nowrap px-4 py-3.5">
                      <span className="rounded-md bg-brand-500/10 px-2 py-0.5 text-xs font-mono font-semibold text-brand-300">
                        {bin.deviceId}
                      </span>
                    </td>
                    <td className="px-4 py-3.5">
                      <p className="max-w-[160px] truncate text-sm text-slate-200">{bin.location}</p>
                    </td>
                    <td className="px-4 py-3.5">
                      <FillBadge level={bin.fillLevel} />
                    </td>
                    <td className="px-4 py-3.5">
                      <FillBar level={bin.fillLevel} />
                    </td>
                    <td className="whitespace-nowrap px-4 py-3.5 text-sm text-slate-300">{bin.temperature}°C</td>
                    <td className="whitespace-nowrap px-4 py-3.5 text-sm text-slate-300">{bin.humidity}%</td>
                    <td className="whitespace-nowrap px-4 py-3.5 text-sm text-slate-300">{bin.gasLevel}</td>
                    <td className="whitespace-nowrap px-4 py-3.5">
                      <span className={`text-sm font-medium ${bin.battery < 20 ? 'text-rose-300' : 'text-slate-300'}`}>
                        {bin.battery}%
                      </span>
                    </td>
                    <td className="whitespace-nowrap px-4 py-3.5 text-sm text-slate-300">{bin.rssi} dBm</td>
                    <td className="px-4 py-3.5">
                      <StatusBadge status={bin.status} />
                    </td>
                    <td className="whitespace-nowrap px-4 py-3.5 text-xs text-slate-500">{bin.lastUpdated}</td>
                    <td className="px-4 py-3.5">
                      <ChevronRight size={14} className="text-slate-600" />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

export default SmartBinsPage;
