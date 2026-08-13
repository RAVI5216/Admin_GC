import { Bell, Droplet, MapPin, Truck, Zap } from 'lucide-react';
import { useMemo } from 'react';
import { Area, AreaChart, CartesianGrid, Cell, Line, LineChart, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { MapContainer, Marker, Popup, TileLayer } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import { useSmartBinData } from '../hooks/useSmartBinData';
import StatCard from '../components/StatCard';
import ChartCard from '../components/ChartCard';
import StatusBadge from '../components/StatusBadge';

function DashboardPage() {
  const { data, connected } = useSmartBinData();

  if (!data) {
    return (
      <div className="min-h-[560px] rounded-[32px] border border-white/10 bg-slate-950/70 p-10 text-slate-300">
        <p className="text-lg font-medium text-white">Waiting for live sensor data...</p>
        <p className="mt-3 text-sm text-slate-400">Connect to the backend and stream live smart bin telemetry.</p>
      </div>
    );
  }

  const routeBins = useMemo(() => {
    const baseTime = new Date();
    return [...data.bins]
      .sort((a, b) => b.fillLevel - a.fillLevel)
      .slice(0, 4)
      .map((bin, index) => {
        const eta = new Date(baseTime.getTime() + index * 15 * 60 * 1000);
        return {
          ...bin,
          eta: eta.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          statusLabel:
            bin.fillLevel >= 90 ? 'Full' : bin.fillLevel >= 61 ? 'Partially Full' : 'Not Full',
        };
      });
  }, [data.bins]);
  const liveMapBins = useMemo(() => data.bins.filter((bin) => bin.latitude !== undefined && bin.longitude !== undefined), [data.bins]);
  const center = useMemo(() => {
    if (liveMapBins.length > 0) {
      const avgLat = liveMapBins.reduce((sum, bin) => sum + (bin.latitude ?? 0), 0) / liveMapBins.length;
      const avgLng = liveMapBins.reduce((sum, bin) => sum + (bin.longitude ?? 0), 0) / liveMapBins.length;
      return [avgLat, avgLng] as [number, number];
    }
    return [1.3521, 103.8198] as [number, number];
  }, [liveMapBins]);

  const notFullCount = data.bins.filter((bin) => bin.fillLevel <= 60).length;
  const partlyFullCount = data.bins.filter((bin) => bin.fillLevel > 60 && bin.fillLevel <= 90).length;
  const progressPercent = data.totals.totalBins ? Math.round((data.totals.collectionsToday / data.totals.totalBins) * 100) : 0;

  const statusSlices = [
    { name: 'Not Full', value: notFullCount, color: '#38bdf8' },
    { name: 'Partially Full', value: partlyFullCount, color: '#7c3aed' },
    { name: 'Full', value: data.totals.fullBins, color: '#fb7185' },
    { name: 'Offline', value: data.totals.offlineBins, color: '#64748b' },
  ].filter((slice) => slice.value > 0);

  return (
    <div className="space-y-6">
      <div className="grid gap-5 md:grid-cols-4">
        <StatCard label="Total Bins" value={data.totals.totalBins} icon={<Zap size={22} />} />
        <StatCard label="Bins Full" value={data.totals.fullBins} icon={<Droplet size={22} />} />
        <StatCard label="In Collection" value={Math.max(0, data.totals.onlineBins - data.totals.fullBins)} icon={<Truck size={22} />} />
        <StatCard label="Collected Today" value={data.totals.collectionsToday} icon={<Bell size={22} />} />
      </div>

      <div className="grid gap-5 xl:grid-cols-[1.6fr_1fr]">
        <div className="space-y-5">
          <div className="glass-panel rounded-[32px] border border-white/10 p-6 shadow-panel">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <p className="text-sm uppercase tracking-[0.24em] text-slate-400">Bin Status Overview</p>
                <h2 className="mt-2 text-3xl font-semibold text-white">Real-time route readiness</h2>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="rounded-3xl bg-slate-950/80 p-4 text-center">
                  <p className="text-xs uppercase tracking-[0.24em] text-slate-400">Bins Installed</p>
                  <p className="mt-3 text-2xl font-semibold text-white">{data.totals.totalBins}</p>
                </div>
                <div className="rounded-3xl bg-slate-950/80 p-4 text-center">
                  <p className="text-xs uppercase tracking-[0.24em] text-slate-400">Live Alerts</p>
                  <p className="mt-3 text-2xl font-semibold text-white">{data.totals.liveAlerts}</p>
                </div>
              </div>
            </div>

            <div className="mt-6 grid gap-5 lg:grid-cols-[0.9fr_0.7fr]">
              <div className="rounded-[32px] bg-slate-950/70 p-6">
                <div className="h-72">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={statusSlices} innerRadius={64} outerRadius={104} paddingAngle={4} dataKey="value">
                        {statusSlices.map((slice) => (
                          <Cell key={slice.name} fill={slice.color} />
                        ))}
                      </Pie>
                      <Tooltip contentStyle={{ background: '#0b1728', border: '1px solid rgba(148,163,184,0.18)', color: '#ffffff' }} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="mt-5 grid gap-3 sm:grid-cols-2">
                  {statusSlices.map((slice) => (
                    <div key={slice.name} className="rounded-3xl bg-slate-900/80 p-4">
                      <p className="text-xs uppercase tracking-[0.24em] text-slate-400">{slice.name}</p>
                      <p className="mt-2 text-2xl font-semibold text-white">{slice.value}</p>
                    </div>
                  ))}
                </div>
              </div>

              <div className="space-y-4">
                <div className="rounded-[32px] bg-slate-950/70 p-6">
                  <p className="text-sm uppercase tracking-[0.24em] text-slate-400">Collection Progress Today</p>
                  <p className="mt-3 text-4xl font-semibold text-white">{data.totals.collectionsToday} / {data.totals.totalBins}</p>
                  <div className="mt-5 h-3 overflow-hidden rounded-full bg-white/10">
                    <div className="h-full rounded-full bg-gradient-to-r from-sky-500 to-blue-500" style={{ width: `${progressPercent}%` }} />
                  </div>
                  <p className="mt-3 text-sm text-slate-400">{progressPercent}% completion</p>
                </div>

                <div className="rounded-[32px] bg-slate-950/70 p-6">
                  <p className="text-sm uppercase tracking-[0.24em] text-slate-400">Route Summary</p>
                  <div className="mt-5 space-y-3">
                    {routeBins.map((bin, index) => (
                      <div key={bin.deviceId} className="rounded-3xl border border-white/10 bg-slate-900/70 p-4">
                        <div className="flex items-center justify-between gap-4">
                          <div>
                            <p className="text-sm font-semibold text-white">{index + 1}. {bin.location}</p>
                            <p className="mt-1 text-xs text-slate-400">{bin.deviceId}</p>
                          </div>
                          <span className="rounded-full bg-slate-800/80 px-3 py-1 text-xs font-semibold text-slate-200">{bin.fillLevel}% full</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="glass-panel rounded-[32px] border border-white/10 p-6 shadow-panel">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-sm uppercase tracking-[0.24em] text-slate-400">Live Alerts</p>
                <h3 className="mt-2 text-xl font-semibold text-white">Recent notifications</h3>
              </div>
              <StatusBadge status={connected ? 'online' : 'offline'} />
            </div>
            <div className="mt-6 space-y-4">
              {data.alerts.slice(0, 4).map((alert) => (
                <div key={alert.id} className="rounded-3xl border border-white/10 bg-slate-950/80 p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="text-sm font-semibold text-white">{alert.title}</p>
                      <p className="mt-1 text-sm text-slate-400">{alert.message}</p>
                    </div>
                    <span className="text-xs uppercase tracking-[0.24em] text-slate-500">{alert.time}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="grid gap-5 xl:grid-cols-[1.4fr_0.85fr]">
        <div className="glass-panel rounded-[32px] border border-white/10 p-6 shadow-panel">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-sm uppercase tracking-[0.24em] text-slate-400">Live Bin Map</p>
              <h3 className="mt-2 text-xl font-semibold text-white">Current route locations</h3>
            </div>
            <div className="inline-flex items-center gap-2 rounded-full bg-slate-900/70 px-4 py-2 text-sm text-slate-200">
              <MapPin size={16} /> {liveMapBins.length} locations
            </div>
          </div>
          <div className="mt-6 overflow-hidden rounded-[28px] border border-white/10 bg-slate-950/80">
            {liveMapBins.length > 0 ? (
              <MapContainer center={center} zoom={11} className="h-[520px] w-full min-h-[520px]" scrollWheelZoom={false}>
                <TileLayer url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}.png" />
                {liveMapBins.map((bin) => (
                  <Marker key={bin.deviceId} position={[bin.latitude as number, bin.longitude as number]}>
                    <Popup>
                      <div className="text-slate-900">
                        <strong>{bin.location}</strong>
                        <p>{bin.deviceId}</p>
                        <p>Fill {bin.fillLevel}%</p>
                        <p>Status: {bin.status}</p>
                      </div>
                    </Popup>
                  </Marker>
                ))}
              </MapContainer>
            ) : (
              <div className="flex min-h-[520px] items-center justify-center bg-slate-950/60 p-8 text-center text-slate-400">
                <div>
                  <p className="text-lg font-semibold text-white">Location data not available</p>
                  <p className="mt-2 text-sm">Add latitude and longitude to your bin payload to visualize live positions.</p>
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="space-y-5">
          <div className="glass-panel rounded-[32px] border border-white/10 p-6 shadow-panel">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-sm uppercase tracking-[0.24em] text-slate-400">Route Performance</p>
                <h3 className="mt-2 text-xl font-semibold text-white">Collector progress</h3>
              </div>
              <div className="rounded-full bg-slate-900/70 px-4 py-2 text-sm text-slate-200">{connected ? 'Live' : 'Offline'}</div>
            </div>
            <div className="mt-6 grid gap-4 sm:grid-cols-2">
              <div className="rounded-3xl bg-slate-950/70 p-5">
                <p className="text-sm text-slate-400">Route Stops</p>
                <p className="mt-3 text-3xl font-semibold text-white">{routeBins.length}</p>
              </div>
              <div className="rounded-3xl bg-slate-950/70 p-5">
                <p className="text-sm text-slate-400">Recent Alerts</p>
                <p className="mt-3 text-3xl font-semibold text-white">{data.alerts.length}</p>
              </div>
            </div>
          </div>

          <div className="glass-panel rounded-[32px] border border-white/10 p-6 shadow-panel">
            <p className="text-sm uppercase tracking-[0.24em] text-slate-400">Collector queue</p>
            <div className="mt-5 space-y-3">
              {routeBins.map((bin, index) => (
                <div key={bin.deviceId} className="rounded-3xl border border-white/10 bg-slate-950/80 p-4">
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <p className="text-sm font-semibold text-white">{index + 1}. {bin.location}</p>
                      <p className="mt-1 text-xs text-slate-400">ID: {bin.deviceId}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-xl font-semibold text-white">{bin.fillLevel}%</p>
                      <p className="text-xs uppercase tracking-[0.24em] text-slate-500">Fill Level</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default DashboardPage;
