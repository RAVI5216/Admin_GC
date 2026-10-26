import { useState, useEffect, useMemo } from 'react';
import StatCard from '../components/StatCard';
import ChartCard from '../components/ChartCard';
import { useSmartBinData } from '../hooks/useSmartBinData';
import { fetchReports, ReportRecord } from '../services/reportService';
import { fetchTasks } from '../services/taskService';
import type { Task } from '../types/task';
import { dataCache } from '../services/dataCache';
import { Signal, BarChart3, PieChart as PieIcon, Activity, CheckCircle2, AlertTriangle, Layers, Download } from 'lucide-react';
import ExportModal from '../components/ExportModal';
import { exportToCsv, exportToPdf, type Timeframe } from '../utils/exportUtils';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
  PieChart,
  Pie,
} from 'recharts';

function AnalyticsPage() {
  const { data, connected } = useSmartBinData();
  const [reports, setReports] = useState<ReportRecord[]>(() => dataCache.getReports() || []);
  const [tasks, setTasks] = useState<Task[]>(() => dataCache.getTasks() || []);
  const [loadingExtras, setLoadingExtras] = useState(() => !dataCache.hasReports() || !dataCache.hasTasks());
  const [showExportModal, setShowExportModal] = useState(false);

  const handleExportAnalyticsCsv = (timeframe: Timeframe) => {
    const headers = ['Smart Bin ID', 'Campus Location', 'Fill Level (%)', 'Status', 'Last Reported Time'];
    const rows = bins.map((b) => [
      b.deviceId,
      b.location || 'Marwadi University',
      b.fillLevel,
      b.status,
      b.lastUpdated ? new Date(b.lastUpdated).toLocaleString() : '—',
    ]);
    exportToCsv(`garbageguardian-analytics-${timeframe}`, headers, rows);
  };

  const handleExportAnalyticsPdf = (timeframe: Timeframe) => {
    const avgFill = bins.length > 0 ? Math.round(bins.reduce((s, b) => s + b.fillLevel, 0) / bins.length) : 0;
    const criticalCount = bins.filter((b) => b.fillLevel >= 75).length;
    const completedTasks = tasks.filter((t) => t.status === 'completed').length;

    const headers = ['Device ID', 'Campus Location', 'Fill Level (%)', 'Status', 'Telemetry Signal'];
    const rows = bins.map((b) => [
      b.deviceId,
      b.location || 'Campus Center',
      `${b.fillLevel}%`,
      b.status,
      b.fillLevel >= 75 ? 'CRITICAL' : b.fillLevel >= 40 ? 'MODERATE' : 'NORMAL',
    ]);

    exportToPdf({
      title: 'Executive Campus Waste Telemetry Briefing',
      subtitle: 'Marwadi University Smart Campus IoT Infrastructure & Operations',
      timeframeLabel:
        timeframe === 'week'
          ? 'Last 7 Days'
          : timeframe === 'month'
          ? 'Last 30 Days'
          : timeframe === 'year'
          ? 'Last 1 Year'
          : 'All Historical Telemetry',
      summaryCards: [
        { label: 'Campus Avg Fill', value: `${avgFill}%`, accent: avgFill > 70 ? '#e11d48' : '#0284c7' },
        { label: 'Critical Bins', value: criticalCount, accent: '#e11d48' },
        { label: 'Tasks Resolved', value: completedTasks, accent: '#059669' },
        { label: 'Active Sensors', value: `${bins.length} Units`, accent: '#7c3aed' },
      ],
      headers,
      rows,
      footerNote: 'Official Campus Waste Analytics • Department of Infrastructure & Sustainability',
    });
  };

  useEffect(() => {
    let isMounted = true;
    if (!dataCache.hasReports() || !dataCache.hasTasks()) {
      setLoadingExtras(true);
    }
    Promise.allSettled([fetchReports(), fetchTasks()])
      .then(([repRes, taskRes]) => {
        if (!isMounted) return;
        if (repRes.status === 'fulfilled') setReports(repRes.value);
        if (taskRes.status === 'fulfilled') setTasks(taskRes.value);
      })
      .finally(() => {
        if (isMounted) setLoadingExtras(false);
      });
    return () => {
      isMounted = false;
    };
  }, []);

  const bins = useMemo(() => data?.bins ?? [], [data]);

  const metrics = useMemo(() => {
    if (!data || bins.length === 0) {
      return [
        { label: 'Total Smart Bins', value: '—', icon: '🗑️', highlight: 'Connecting to DynamoDB...', accent: 'blue' as const },
        { label: 'Campus Avg Fill', value: '—', icon: '📈', highlight: 'Real-time telemetry', accent: 'emerald' as const },
        { label: 'Critical Attention', value: '—', icon: '⚠️', highlight: 'Fill level > 75%', accent: 'rose' as const },
        { label: 'Active Reports & Tasks', value: '—', icon: '📋', highlight: 'Campus operational status', accent: 'amber' as const },
      ];
    }

    const avgFill = Math.round(bins.reduce((s, b) => s + b.fillLevel, 0) / bins.length);
    const criticalBinsCount = bins.filter((b) => b.fillLevel >= 75).length;
    const pendingTasks = tasks.filter((t) => t.status !== 'completed').length;
    const unresolvedReports = reports.filter((r) => r.status !== 'resolved' && r.status !== 'closed').length;

    return [
      {
        label: 'Total Smart Bins',
        value: bins.length,
        icon: '🗑️',
        highlight: '8 physical bins in Marwadi campus',
        accent: 'blue' as const,
      },
      {
        label: 'Campus Avg Fill',
        value: `${avgFill}%`,
        icon: '📈',
        highlight: avgFill > 60 ? 'Moderate campus load' : 'Normal capacity levels',
        accent: avgFill > 70 ? ('rose' as const) : avgFill > 40 ? ('amber' as const) : ('emerald' as const),
      },
      {
        label: 'Critical Attention',
        value: criticalBinsCount,
        icon: '⚠️',
        highlight: criticalBinsCount > 0 ? `${criticalBinsCount} bin(s) require prompt emptying` : 'All bins below threshold',
        accent: criticalBinsCount > 0 ? ('rose' as const) : ('emerald' as const),
      },
      {
        label: 'Pending Workload',
        value: pendingTasks + unresolvedReports,
        icon: '📋',
        highlight: `${pendingTasks} open tasks, ${unresolvedReports} pending reports`,
        accent: 'amber' as const,
      },
    ];
  }, [data, bins, tasks, reports]);

  // Bar chart data: all 8 real smart bins
  const binBarData = useMemo(() => {
    if (!bins.length) return [];
    return bins.map((bin) => ({
      name: bin.deviceId.replace('SmartBin0', 'Bin #').replace('SmartBin', 'Bin #'),
      fullName: bin.deviceId,
      location: bin.location,
      fillLevel: bin.fillLevel,
      status: bin.status,
    }));
  }, [bins]);

  // Pie chart distribution
  const fillDistributionData = useMemo(() => {
    if (!bins.length) return [];
    const critical = bins.filter((b) => b.fillLevel >= 75).length;
    const moderate = bins.filter((b) => b.fillLevel >= 40 && b.fillLevel < 75).length;
    const low = bins.filter((b) => b.fillLevel < 40).length;

    return [
      { name: 'Critical (>75%)', value: critical, color: '#f43f5e' },
      { name: 'Moderate (40-75%)', value: moderate, color: '#f59e0b' },
      { name: 'Normal (<40%)', value: low, color: '#10b981' },
    ].filter((item) => item.value > 0);
  }, [bins]);

  // Zone capacity data
  const zoneData = useMemo(() => {
    if (!bins.length) return [];
    const zones: Record<string, { totalFill: number; count: number }> = {
      'Campus Gates': { totalFill: 0, count: 0 },
      'Hostel Wings': { totalFill: 0, count: 0 },
      'Academic & PG': { totalFill: 0, count: 0 },
      'Recreation & Lake': { totalFill: 0, count: 0 },
    };

    bins.forEach((b) => {
      const loc = (b.location || '').toLowerCase();
      if (loc.includes('gate') || loc.includes('entrance')) {
        zones['Campus Gates'].totalFill += b.fillLevel;
        zones['Campus Gates'].count += 1;
      } else if (loc.includes('wing')) {
        zones['Hostel Wings'].totalFill += b.fillLevel;
        zones['Hostel Wings'].count += 1;
      } else if (loc.includes('pg') || loc.includes('logo')) {
        zones['Academic & PG'].totalFill += b.fillLevel;
        zones['Academic & PG'].count += 1;
      } else {
        zones['Recreation & Lake'].totalFill += b.fillLevel;
        zones['Recreation & Lake'].count += 1;
      }
    });

    return Object.entries(zones).map(([zone, stat]) => ({
      zone,
      count: stat.count,
      avgFill: stat.count > 0 ? Math.round(stat.totalFill / stat.count) : 0,
    }));
  }, [bins]);

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="glass-panel shadow-card overflow-hidden rounded-3xl p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div
              className={`mb-2 inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold ${
                connected
                  ? 'bg-emerald-500/10 text-emerald-300 ring-1 ring-emerald-500/20'
                  : 'bg-slate-700/40 text-slate-400 ring-1 ring-slate-600/20'
              }`}
            >
              <span className={`h-1.5 w-1.5 rounded-full ${connected ? 'bg-emerald-400 live-dot' : 'bg-slate-500'}`} />
              {connected ? 'Live AWS DynamoDB Stream Active' : 'Connecting to Telemetry Stream'}
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-white">Campus Waste Telemetry Analytics</h1>
            <p className="mt-1 text-sm text-slate-400">
              Aggregated real-time metrics across physical IoT bins, citizen reports, and operational dispatch.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={() => setShowExportModal(true)}
              className="inline-flex items-center gap-2 rounded-2xl border border-cyan-500/30 bg-cyan-500/10 px-4 py-2.5 text-xs font-semibold text-cyan-300 hover:bg-cyan-500/20 transition shadow-sm"
            >
              <Download size={15} />
              Export Briefing (PDF/CSV)
            </button>

            <div className="flex items-center gap-2 rounded-2xl border border-white/[0.08] bg-white/[0.03] px-4 py-2.5">
              <Signal size={18} className={connected ? 'text-emerald-400' : 'text-slate-500'} />
              <div>
                <p className="text-[10px] uppercase tracking-widest text-slate-400">DynamoDB Feed</p>
                <p className="text-sm font-semibold text-white">{connected ? 'Synchronized' : 'Polling'}</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Top Metric Cards */}
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

      {/* Real Data Charts */}
      <div className="grid gap-6 xl:grid-cols-3">
        {/* Fill Level per Physical Bin (2 cols) */}
        <div className="xl:col-span-2">
          <ChartCard
            title="Real-time Fill Level by Smart Bin"
            helpText="Live fill percentage across all 8 campus sensor units"
          >
            <div className="h-full w-full pt-2">
              <ResponsiveContainer width="100%" height="88%">
                <BarChart data={binBarData} margin={{ top: 10, right: 10, left: -20, bottom: 25 }}>
                  <XAxis
                    dataKey="name"
                    stroke="#64748b"
                    fontSize={11}
                    tickLine={false}
                    interval={0}
                    angle={-20}
                    textAnchor="end"
                  />
                  <YAxis
                    stroke="#64748b"
                    fontSize={11}
                    tickLine={false}
                    domain={[0, 100]}
                    tickFormatter={(v) => `${v}%`}
                  />
                  <Tooltip
                    content={({ active, payload }) => {
                      if (!active || !payload?.length) return null;
                      const item = payload[0].payload;
                      return (
                        <div className="rounded-xl border border-white/10 bg-slate-900/95 p-3 shadow-xl backdrop-blur">
                          <p className="font-semibold text-white">{item.fullName}</p>
                          <p className="text-xs text-slate-400">{item.location}</p>
                          <div className="mt-2 flex items-center justify-between gap-4 text-xs">
                            <span className="text-slate-300">Fill Level:</span>
                            <span className="font-bold text-brand-400">{item.fillLevel}%</span>
                          </div>
                          <div className="flex items-center justify-between gap-4 text-xs">
                            <span className="text-slate-300">Status:</span>
                            <span className="font-medium text-slate-200">{item.status}</span>
                          </div>
                        </div>
                      );
                    }}
                  />
                  <Bar dataKey="fillLevel" radius={[6, 6, 0, 0]}>
                    {binBarData.map((entry, index) => {
                      const color =
                        entry.fillLevel >= 75
                          ? '#f43f5e'
                          : entry.fillLevel >= 40
                          ? '#f59e0b'
                          : '#10b981';
                      return <Cell key={`cell-${index}`} fill={color} />;
                    })}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
              <div className="flex items-center justify-center gap-6 text-[11px] text-slate-400 border-t border-white/5 pt-2">
                <span className="flex items-center gap-1.5">
                  <span className="h-2 w-2 rounded-full bg-emerald-500" /> Normal (&lt;40%)
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="h-2 w-2 rounded-full bg-amber-500" /> Half/Moderate (40-74%)
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="h-2 w-2 rounded-full bg-rose-500" /> Critical / Full (≥75%)
                </span>
              </div>
            </div>
          </ChartCard>
        </div>

        {/* Capacity Breakdown Doughnut (1 col) */}
        <div>
          <ChartCard title="Campus Capacity Distribution" helpText="Bins segmented by urgency">
            <div className="flex h-full flex-col justify-between">
              <div className="h-44 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={fillDistributionData}
                      cx="50%"
                      cy="50%"
                      innerRadius={45}
                      outerRadius={65}
                      paddingAngle={5}
                      dataKey="value"
                    >
                      {fillDistributionData.map((entry, index) => (
                        <Cell key={`slice-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip
                      content={({ active, payload }) => {
                        if (!active || !payload?.length) return null;
                        const item = payload[0].payload;
                        return (
                          <div className="rounded-xl border border-white/10 bg-slate-900/95 px-3 py-2 text-xs shadow-xl backdrop-blur">
                            <span className="font-semibold text-white">{item.name}: </span>
                            <span className="font-bold text-brand-300">{item.value} bins</span>
                          </div>
                        );
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>

              <div className="space-y-2 border-t border-white/5 pt-3">
                {fillDistributionData.map((d) => (
                  <div key={d.name} className="flex items-center justify-between text-xs">
                    <span className="flex items-center gap-2 text-slate-300">
                      <span className="h-2 w-2 rounded-full" style={{ backgroundColor: d.color }} />
                      {d.name}
                    </span>
                    <span className="font-semibold text-white">
                      {d.value} bin{d.value > 1 ? 's' : ''} ({Math.round((d.value / (bins.length || 1)) * 100)}%)
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </ChartCard>
        </div>
      </div>

      {/* Zone Capacity and Operations Section */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* Zone Capacity */}
        <div className="rounded-3xl border border-white/10 bg-slate-900/60 p-6 shadow-panel">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-base font-semibold text-white flex items-center gap-2">
              <Layers size={17} className="text-cyan-400" />
              Zone Capacity Pressure
            </h3>
            <span className="text-xs text-slate-400">Marwadi University Zones</span>
          </div>

          <div className="space-y-4">
            {zoneData.map((item) => {
              const color =
                item.avgFill >= 75
                  ? 'bg-rose-500'
                  : item.avgFill >= 50
                  ? 'bg-amber-400'
                  : 'bg-emerald-500';
              return (
                <div key={item.zone} className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-medium text-slate-200">
                      {item.zone}{' '}
                      <span className="text-[11px] text-slate-500">({item.count} bins)</span>
                    </span>
                    <span className="font-bold text-white">{item.avgFill}%</span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-slate-800">
                    <div
                      className={`h-full rounded-full transition-all duration-700 ${color}`}
                      style={{ width: `${Math.max(4, item.avgFill)}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Operational Dispatch Summary */}
        <div className="rounded-3xl border border-white/10 bg-slate-900/60 p-6 shadow-panel flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-semibold text-white flex items-center gap-2">
                <Activity size={17} className="text-brand-400" />
                Operational Dispatch & Resolution
              </h3>
              <span className="text-xs text-slate-400">Live Queue</span>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-2xl border border-white/5 bg-white/[0.02] p-4">
                <p className="text-xs text-slate-400">Active Tasks</p>
                <p className="text-2xl font-bold text-white mt-1">
                  {tasks.filter((t) => t.status !== 'completed').length}
                </p>
                <p className="text-[11px] text-brand-300 mt-1">
                  {tasks.filter((t) => t.status === 'in-progress').length} in progress
                </p>
              </div>

              <div className="rounded-2xl border border-white/5 bg-white/[0.02] p-4">
                <p className="text-xs text-slate-400">Open Reports</p>
                <p className="text-2xl font-bold text-white mt-1">
                  {reports.filter((r) => r.status !== 'resolved' && r.status !== 'closed').length}
                </p>
                <p className="text-[11px] text-amber-300 mt-1">
                  {reports.length} total logged
                </p>
              </div>
            </div>
          </div>

          <div className="mt-4 rounded-2xl border border-brand-500/20 bg-brand-500/10 p-3.5 text-xs text-brand-200 flex items-center gap-2.5">
            <CheckCircle2 size={16} className="text-brand-400 shrink-0" />
            <span>
              Real-time analytics are refreshed continuously from AWS DynamoDB tables (SmartBins, Tasks, Reports).
            </span>
          </div>
        </div>
      </div>

      {/* Analytics Executive Export Modal */}
      <ExportModal
        isOpen={showExportModal}
        onClose={() => setShowExportModal(false)}
        title="Export Executive Analytics Briefing"
        description="Generate official briefing documents (PDF) or raw data metrics (CSV) summarizing campus waste efficiency."
        recordCount={bins.length}
        onExportCsv={handleExportAnalyticsCsv}
        onExportPdf={handleExportAnalyticsPdf}
      />
    </div>
  );
}

export default AnalyticsPage;
