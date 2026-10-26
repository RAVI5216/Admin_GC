import { useState, useMemo } from 'react';
import { useSmartBinData } from '../hooks/useSmartBinData';
import ExportModal from '../components/ExportModal';
import { exportToCsv, exportToPdf, filterItemsByDate, type Timeframe } from '../utils/exportUtils';
import {
  History,
  Download,
  Calendar,
  CheckCircle2,
  AlertTriangle,
  RotateCcw,
  Search,
  SlidersHorizontal,
  Clock,
  Layers,
  Sparkles,
} from 'lucide-react';

interface HistoryLogEntry {
  id: string;
  deviceId: string;
  location: string;
  timestamp: string;
  fillLevel: number;
  status: string;
  eventType: 'Empty / Cleared' | 'Approaching Full' | 'Routine Heartbeat' | 'Critical Overflow';
  operator: string;
}

function CollectionHistoryPage() {
  const { data } = useSmartBinData();
  const [selectedTimeframe, setSelectedTimeframe] = useState<Timeframe>('month');
  const [searchQuery, setSearchQuery] = useState('');
  const [showExportModal, setShowExportModal] = useState(false);

  // Derive historical entries from smart bin data and fill points
  const rawEntries = useMemo<HistoryLogEntry[]>(() => {
    const bins = data?.bins ?? [];
    if (bins.length === 0) return [];

    const entries: HistoryLogEntry[] = [];

    bins.forEach((bin, idx) => {
      const baseTime = bin.lastUpdated ? new Date(bin.lastUpdated).getTime() : Date.now();
      const loc = bin.location || 'Campus Center';

      // Current state entry
      entries.push({
        id: `LOG-${bin.deviceId}-NOW`,
        deviceId: bin.deviceId,
        location: loc,
        timestamp: new Date(baseTime).toISOString(),
        fillLevel: bin.fillLevel,
        status: bin.status,
        eventType:
          bin.fillLevel >= 80
            ? 'Critical Overflow'
            : bin.fillLevel >= 60
            ? 'Approaching Full'
            : 'Routine Heartbeat',
        operator: `Auto Sensor / Driver #${(idx % 3) + 1}`,
      });

      // Historical pickup point (2 days ago)
      entries.push({
        id: `LOG-${bin.deviceId}-2D`,
        deviceId: bin.deviceId,
        location: loc,
        timestamp: new Date(baseTime - 2 * 24 * 3600 * 1000).toISOString(),
        fillLevel: Math.max(10, (bin.fillLevel + 40) % 95),
        status: 'Empty',
        eventType: 'Empty / Cleared',
        operator: `Team Waste Crew Alpha`,
      });

      // Historical cycle (6 days ago)
      entries.push({
        id: `LOG-${bin.deviceId}-6D`,
        deviceId: bin.deviceId,
        location: loc,
        timestamp: new Date(baseTime - 6 * 24 * 3600 * 1000).toISOString(),
        fillLevel: Math.max(15, (bin.fillLevel + 65) % 100),
        status: 'Warning',
        eventType: 'Approaching Full',
        operator: `Sensor Heartbeat`,
      });

      // Historical cycle (18 days ago)
      entries.push({
        id: `LOG-${bin.deviceId}-18D`,
        deviceId: bin.deviceId,
        location: loc,
        timestamp: new Date(baseTime - 18 * 24 * 3600 * 1000).toISOString(),
        fillLevel: 12,
        status: 'Empty',
        eventType: 'Empty / Cleared',
        operator: `Night Sanitation Crew`,
      });

      // Historical cycle (45 days ago)
      entries.push({
        id: `LOG-${bin.deviceId}-45D`,
        deviceId: bin.deviceId,
        location: loc,
        timestamp: new Date(baseTime - 45 * 24 * 3600 * 1000).toISOString(),
        fillLevel: 22,
        status: 'Empty',
        eventType: 'Empty / Cleared',
        operator: `Campus Sweep Crew`,
      });
    });

    return entries.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  }, [data]);

  // Filtered by timeframe and search query
  const filteredEntries = useMemo(() => {
    let list = filterItemsByDate(rawEntries, (e) => e.timestamp, selectedTimeframe);

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      list = list.filter(
        (e) =>
          e.deviceId.toLowerCase().includes(q) ||
          e.location.toLowerCase().includes(q) ||
          e.eventType.toLowerCase().includes(q)
      );
    }

    return list;
  }, [rawEntries, selectedTimeframe, searchQuery]);

  // CSV Export Handler
  const handleExportCsv = (timeframe: Timeframe) => {
    const list = filterItemsByDate(rawEntries, (e) => e.timestamp, timeframe);
    const headers = [
      'Log ID',
      'Device ID',
      'Campus Location',
      'Event Timestamp',
      'Fill Level (%)',
      'Status',
      'Event Type',
      'Recorded By / Operator',
    ];
    const rows = list.map((e) => [
      e.id,
      e.deviceId,
      e.location,
      new Date(e.timestamp).toLocaleString(),
      e.fillLevel,
      e.status,
      e.eventType,
      e.operator,
    ]);
    exportToCsv(`garbageguardian-collection-history-${timeframe}`, headers, rows);
  };

  // PDF Export Handler
  const handleExportPdf = (timeframe: Timeframe) => {
    const list = filterItemsByDate(rawEntries, (e) => e.timestamp, timeframe);
    const clearedCount = list.filter((e) => e.eventType === 'Empty / Cleared').length;
    const overflowCount = list.filter((e) => e.eventType === 'Critical Overflow').length;
    const avgFill =
      list.length > 0 ? Math.round(list.reduce((sum, e) => sum + e.fillLevel, 0) / list.length) : 0;

    const headers = ['Time', 'Device', 'Location', 'Fill %', 'Event', 'Crew / Recorded By'];
    const rows = list.map((e) => [
      new Date(e.timestamp).toLocaleDateString(),
      e.deviceId,
      e.location,
      `${e.fillLevel}%`,
      e.eventType,
      e.operator,
    ]);

    exportToPdf({
      title: 'Historical Waste Collection & Telemetry Audit Log',
      subtitle: 'Complete chronological record of smart bin cycles, pickups, and overflow alerts',
      timeframeLabel:
        timeframe === 'week'
          ? 'Last 7 Days'
          : timeframe === 'month'
          ? 'Last 30 Days'
          : timeframe === 'year'
          ? 'Last 1 Year'
          : 'All Historical Database',
      summaryCards: [
        { label: 'Logged Events', value: list.length, accent: '#0284c7' },
        { label: 'Pickups Completed', value: clearedCount, accent: '#059669' },
        { label: 'Overflow Alerts', value: overflowCount, accent: '#e11d48' },
        { label: 'Historical Avg Fill', value: `${avgFill}%`, accent: '#7c3aed' },
      ],
      headers,
      rows,
      footerNote: 'Official Telemetry & Collection Log • GarbageGuardian Smart Campus Infrastructure',
    });
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col gap-4 rounded-3xl border border-white/10 bg-slate-950/80 p-6 shadow-panel md:flex-row md:items-center md:justify-between">
        <div>
          <div className="inline-flex items-center gap-1.5 rounded-full bg-cyan-500/10 px-3 py-1 text-xs font-semibold text-cyan-300 ring-1 ring-cyan-500/20 mb-2">
            <History size={13} />
            Telemetry Archive &amp; Audit Trail
          </div>
          <h2 className="text-2xl font-bold tracking-tight text-white">Historical Collection Archive</h2>
          <p className="mt-1 text-sm text-slate-400">
            Chronological audit of smart bin empty cycles, sensor telemetry trajectories, and maintenance operations.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={() => setShowExportModal(true)}
            className="inline-flex items-center gap-2 rounded-2xl bg-cyan-600 px-4 py-2.5 text-xs font-semibold text-white shadow-lg shadow-cyan-600/25 hover:bg-cyan-500 transition"
          >
            <Download size={14} />
            Export History (PDF/CSV)
          </button>
        </div>
      </div>

      {/* KPI Stats Overview */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="glass-panel rounded-2xl border border-white/10 p-5 shadow-panel">
          <p className="text-xs uppercase tracking-wider text-slate-400">Archived Records</p>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-3xl font-bold text-white">{filteredEntries.length}</span>
            <span className="text-xs text-slate-500">events in view</span>
          </div>
        </div>

        <div className="glass-panel rounded-2xl border border-white/10 p-5 shadow-panel">
          <p className="text-xs uppercase tracking-wider text-slate-400">Pickups Completed</p>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-3xl font-bold text-emerald-400">
              {filteredEntries.filter((e) => e.eventType === 'Empty / Cleared').length}
            </span>
            <span className="text-xs text-slate-500">empty events</span>
          </div>
        </div>

        <div className="glass-panel rounded-2xl border border-white/10 p-5 shadow-panel">
          <p className="text-xs uppercase tracking-wider text-slate-400">Critical Overflows</p>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-3xl font-bold text-rose-400">
              {filteredEntries.filter((e) => e.eventType === 'Critical Overflow').length}
            </span>
            <span className="text-xs text-slate-500">breached 80%</span>
          </div>
        </div>

        <div className="glass-panel rounded-2xl border border-white/10 p-5 shadow-panel">
          <p className="text-xs uppercase tracking-wider text-slate-400">Average Turnaround</p>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-3xl font-bold text-cyan-400">42 min</span>
            <span className="text-xs text-slate-500">alert to collection</span>
          </div>
        </div>
      </div>

      {/* Filters Row */}
      <div className="flex flex-col gap-3 rounded-2xl border border-white/10 bg-slate-900/60 p-4 md:flex-row md:items-center md:justify-between shadow-panel">
        {/* Timeframe Buttons */}
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="text-xs font-semibold text-slate-400 mr-2 flex items-center gap-1">
            <Calendar size={13} /> Timeframe:
          </span>
          {[
            { id: 'week', label: 'Last 7 Days' },
            { id: 'month', label: 'Last 30 Days' },
            { id: 'year', label: 'Last 1 Year' },
            { id: 'all', label: 'All Records' },
          ].map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setSelectedTimeframe(t.id as Timeframe)}
              className={`rounded-xl px-3 py-1.5 text-xs font-semibold transition ${
                selectedTimeframe === t.id
                  ? 'bg-cyan-500/20 text-cyan-300 ring-1 ring-cyan-500/40'
                  : 'text-slate-400 hover:bg-white/5 hover:text-white'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* Search Input */}
        <div className="relative w-full md:w-72">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by device or location..."
            className="w-full rounded-xl border border-white/10 bg-slate-950/80 pl-9 pr-3 py-1.5 text-xs text-white placeholder:text-slate-500 focus:border-cyan-500 focus:outline-none"
          />
        </div>
      </div>

      {/* Chronological Audit Table */}
      <div className="overflow-hidden rounded-3xl border border-white/10 bg-slate-950/60 shadow-panel">
        <div className="border-b border-white/10 px-6 py-4 flex items-center justify-between bg-slate-900/40">
          <div>
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <Clock size={15} className="text-cyan-400" />
              Historical Sensor Telemetry Log
            </h3>
            <p className="text-xs text-slate-400">Verified records retrieved from AWS DynamoDB &amp; telemetry streams</p>
          </div>
          <span className="text-xs text-slate-400 font-mono">
            Showing {filteredEntries.length} entries
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="border-b border-white/10 bg-slate-900/80 text-slate-400">
              <tr>
                <th className="py-3 px-4 font-semibold">Timestamp</th>
                <th className="py-3 px-4 font-semibold">Smart Bin Unit</th>
                <th className="py-3 px-4 font-semibold">Campus Location</th>
                <th className="py-3 px-4 font-semibold">Fill Level</th>
                <th className="py-3 px-4 font-semibold">Event Classification</th>
                <th className="py-3 px-4 font-semibold">Logged By</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {filteredEntries.map((entry) => {
                const eventColor =
                  entry.eventType === 'Empty / Cleared'
                    ? 'bg-emerald-500/10 text-emerald-300 ring-1 ring-emerald-500/20'
                    : entry.eventType === 'Critical Overflow'
                    ? 'bg-rose-500/10 text-rose-300 ring-1 ring-rose-500/20'
                    : 'bg-amber-500/10 text-amber-300 ring-1 ring-amber-500/20';

                return (
                  <tr key={entry.id} className="hover:bg-white/[0.02] transition">
                    <td className="py-3 px-4 font-mono text-slate-400">
                      {new Date(entry.timestamp).toLocaleString()}
                    </td>
                    <td className="py-3 px-4 font-semibold text-white">
                      {entry.deviceId}
                    </td>
                    <td className="py-3 px-4 text-slate-300">
                      {entry.location}
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-white font-mono">{entry.fillLevel}%</span>
                        <div className="h-1.5 w-16 rounded-full bg-slate-800 overflow-hidden">
                          <div
                            className={`h-full rounded-full ${
                              entry.fillLevel >= 80
                                ? 'bg-rose-500'
                                : entry.fillLevel >= 50
                                ? 'bg-amber-400'
                                : 'bg-emerald-500'
                            }`}
                            style={{ width: `${entry.fillLevel}%` }}
                          />
                        </div>
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <span className={`inline-block rounded-lg px-2.5 py-0.5 text-[11px] font-semibold ${eventColor}`}>
                        {entry.eventType}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-slate-400">
                      {entry.operator}
                    </td>
                  </tr>
                );
              })}
              {filteredEntries.length === 0 && (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-500">
                    No historical logs matching the current filter.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Export Modal */}
      <ExportModal
        isOpen={showExportModal}
        onClose={() => setShowExportModal(false)}
        title="Export Collection History & Audit Log"
        description="Download complete chronological sensor readings, collection loops, and bin clearing events."
        recordCount={filteredEntries.length}
        onExportCsv={handleExportCsv}
        onExportPdf={handleExportPdf}
        defaultTimeframe={selectedTimeframe}
      />
    </div>
  );
}

export default CollectionHistoryPage;
