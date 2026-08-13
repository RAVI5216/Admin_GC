import { useMemo } from 'react';
import StatCard from '../components/StatCard';
import ChartCard from '../components/ChartCard';
import { useSmartBinData } from '../hooks/useSmartBinData';

function AnalyticsPage() {
  const { data, connected } = useSmartBinData();

  const metrics = useMemo(() => {
    if (!data) {
      return [
        { label: 'Bins Collected', value: '—', icon: '♻️', highlight: 'Waiting for hardware telemetry' },
        { label: 'Route Efficiency', value: '—', icon: '📍', highlight: 'Connect an ESP32 device to begin' },
        { label: 'Avg Fill Level', value: '—', icon: '📈', highlight: 'Fill values will appear here live' },
        { label: 'Alerts', value: '—', icon: '⚠️', highlight: 'Live alerts stream in automatically' },
      ];
    }

    const avgFill = data.bins.length > 0 ? Math.round(data.bins.reduce((sum, bin) => sum + bin.fillLevel, 0) / data.bins.length) : 0;
    const highestFill = data.bins.length > 0 ? Math.max(...data.bins.map((bin) => bin.fillLevel)) : 0;
    const alertCount = data.alerts.length;

    return [
      { label: 'Bins Collected', value: data.totals.collectionsToday, icon: '♻️', highlight: `${data.totals.totalBins} bins tracked live` },
      { label: 'Route Efficiency', value: `${Math.max(70, 100 - highestFill + 10)}%`, icon: '📍', highlight: 'Updated from the latest hardware packet' },
      { label: 'Avg Fill Level', value: `${avgFill}%`, icon: '📈', highlight: `${data.totals.fullBins} bins currently need attention` },
      { label: 'Alerts', value: alertCount, icon: '⚠️', highlight: connected ? 'Streaming in real time' : 'Waiting for connection' },
    ];
  }, [connected, data]);

  const trendData = useMemo(() => {
    if (!data?.charts.fillLevelHistory?.length) {
      return [48, 56, 62, 58, 71, 69, 78];
    }

    return data.charts.fillLevelHistory.slice(-7).map((point) => Math.min(100, Math.max(8, Math.round(point.value))));
  }, [data]);

  const zoneData = useMemo(() => {
    if (!data?.bins.length) {
      return [
        { zone: 'North', value: 0 },
        { zone: 'Central', value: 0 },
        { zone: 'East', value: 0 },
        { zone: 'West', value: 0 },
      ];
    }

    const grouped = data.bins.reduce<Record<string, number[]>>((acc, bin) => {
      const key = bin.location?.split(' ')[0] || 'Zone';
      if (!acc[key]) acc[key] = [];
      acc[key].push(bin.fillLevel);
      return acc;
    }, {});

    return Object.entries(grouped)
      .slice(0, 4)
      .map(([zone, values]) => ({
        zone,
        value: Math.round(values.reduce((sum, value) => sum + value, 0) / values.length),
      }));
  }, [data]);

  return (
    <div className="space-y-6">
      <div className="overflow-hidden rounded-[32px] border border-emerald-400/20 bg-gradient-to-br from-slate-950 via-slate-900 to-emerald-950/70 p-6 shadow-[0_25px_80px_rgba(0,0,0,0.35)]">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-2xl">
            <div className="inline-flex items-center rounded-full border border-emerald-400/20 bg-emerald-500/10 px-3 py-1 text-sm text-emerald-200">
              {connected ? 'Live operational pulse' : 'Waiting for hardware stream'}
            </div>
            <h3 className="mt-4 text-3xl font-semibold text-white">Analytics that respond to every ESP32 update.</h3>
            <p className="mt-3 text-sm leading-6 text-slate-300">
              Each bin message from your hardware feeds the trend, capacity, and alert views automatically.
            </p>
          </div>
          <div className="rounded-2xl border border-white/10 bg-white/10 px-4 py-3 backdrop-blur">
            <p className="text-xs uppercase tracking-[0.24em] text-slate-400">Current status</p>
            <p className="mt-1 text-2xl font-semibold text-white">{connected ? 'Connected' : 'Offline'}</p>
          </div>
        </div>
      </div>

      <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
        {metrics.map((metric) => (
          <StatCard
            key={metric.label}
            label={metric.label}
            value={metric.value}
            icon={<span className="text-xl">{metric.icon}</span>}
            highlight={metric.highlight}
          />
        ))}
      </div>

      <div className="grid gap-5 xl:grid-cols-2">
        <ChartCard title="Collection trend" helpText="Live fill-level movement from the latest device events">
          <div className="flex h-full flex-col justify-between">
            <div className="flex items-end gap-3 rounded-[24px] border border-white/10 bg-slate-950/60 p-4">
              {trendData.map((value, index) => (
                <div key={`${value}-${index}`} className="flex flex-1 flex-col items-center gap-2">
                  <div className="flex h-44 w-full items-end rounded-2xl bg-slate-800/80 p-1">
                    <div
                      className="w-full rounded-xl bg-gradient-to-t from-emerald-500 via-teal-400 to-cyan-300"
                      style={{ height: `${value}%` }}
                    />
                  </div>
                  <span className="text-xs uppercase tracking-[0.24em] text-slate-400">
                    {['M', 'T', 'W', 'T', 'F', 'S', 'S'][index]}
                  </span>
                </div>
              ))}
            </div>
            <div className="mt-4 flex items-center justify-between rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-slate-300">
              <span>{connected ? 'Updated from the latest bin heartbeat' : 'Waiting for live updates'}</span>
              <span className="font-semibold text-white">{data ? `${Math.max(...trendData)}% peak` : 'No data yet'}</span>
            </div>
          </div>
        </ChartCard>

        <ChartCard title="Capacity by zone" helpText="Current pressure levels based on incoming bin data">
          <div className="flex h-full flex-col gap-4">
            {zoneData.map((item) => (
              <div key={item.zone} className="rounded-[20px] border border-white/10 bg-slate-950/60 p-4">
                <div className="mb-2 flex items-center justify-between text-sm">
                  <span className="text-slate-300">{item.zone}</span>
                  <span className="font-semibold text-white">{item.value}%</span>
                </div>
                <div className="h-2.5 rounded-full bg-slate-800">
                  <div
                    className="h-2.5 rounded-full bg-gradient-to-r from-emerald-400 to-cyan-400"
                    style={{ width: `${Math.max(6, item.value)}%` }}
                  />
                </div>
              </div>
            ))}
            <div className="rounded-[20px] border border-emerald-400/20 bg-emerald-500/10 p-4 text-sm text-emerald-100">
              {connected ? 'The latest hardware messages are driving these values now.' : 'Connect your ESP32 device to begin populating this view.'}
            </div>
          </div>
        </ChartCard>
      </div>
    </div>
  );
}

export default AnalyticsPage;
