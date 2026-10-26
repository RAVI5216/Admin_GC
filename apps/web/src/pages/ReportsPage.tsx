import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  AlertCircle,
  CheckCircle2,
  FileText,
  LoaderCircle,
  RefreshCw,
  Sparkles,
  X,
  Send,
  Building2,
  Clock,
  ShieldAlert,
  ArrowRight,
  Brain,
  BarChart3,
  Award,
  Download,
  Bell,
} from 'lucide-react';
import { useNotifications } from '../context/NotificationContext';
import ExportModal from '../components/ExportModal';
import { exportToCsv, exportToPdf, filterItemsByDate, type Timeframe } from '../utils/exportUtils';
import {
  fetchReports,
  classifyReportText,
  fetchAIMetrics,
  type ReportRecord,
  type AIClassification,
  type AIMetricsPayload,
  unassignReport,
} from '../services/reportService';
import { dataCache } from '../services/dataCache';

const severityBadgeStyles: Record<string, string> = {
  critical: 'bg-rose-500/15 text-rose-300 ring-1 ring-rose-500/30',
  high: 'bg-amber-500/15 text-amber-300 ring-1 ring-amber-500/30',
  medium: 'bg-blue-500/15 text-blue-300 ring-1 ring-blue-500/30',
  low: 'bg-slate-500/15 text-slate-300 ring-1 ring-slate-500/30',
};

function ReportsPage() {
  const navigate = useNavigate();
  const { refreshNotifications } = useNotifications();
  const [alertSent, setAlertSent] = useState(false);
  const [reports, setReports] = useState<ReportRecord[]>(() => dataCache.getReports() || []);
  const [loading, setLoading] = useState(() => !dataCache.hasReports());
  const [error, setError] = useState<string | null>(null);
  const [selectedReport, setSelectedReport] = useState<ReportRecord | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const [updatingReportId, setUpdatingReportId] = useState<string | null>(null);
  const [statusError, setStatusError] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  // AI Playground Modal State
  const [showAiPlayground, setShowAiPlayground] = useState(false);
  const [playgroundText, setPlaygroundText] = useState('Garbage is overflowing near the college gate.');
  const [playgroundLocation, setPlaygroundLocation] = useState('College Main Gate');
  const [classifying, setClassifying] = useState(false);
  const [playgroundResult, setPlaygroundResult] = useState<AIClassification | null>(null);
  const [playgroundError, setPlaygroundError] = useState<string | null>(null);

  // Python ML Metrics Modal State
  const [showMetricsModal, setShowMetricsModal] = useState(false);
  const [aiMetrics, setAiMetrics] = useState<AIMetricsPayload | null>(null);
  const [loadingMetrics, setLoadingMetrics] = useState(false);
  const [metricsError, setMetricsError] = useState<string | null>(null);

  // Export Modal State
  const [showExportModal, setShowExportModal] = useState(false);

  const handleExportReportsCsv = (timeframe: Timeframe) => {
    const filtered = filterItemsByDate(reports, (r) => r.createdAt as string, timeframe);
    const headers = [
      'Report ID',
      'Location',
      'Description',
      'AI Category',
      'Severity',
      'Suggested Department',
      'AI Confidence (%)',
      'Status',
      'Created Date',
    ];
    const rows = filtered.map((r) => [
      r.reportId,
      r.location || 'Campus Unspecified',
      r.description || '',
      r.aiClassification?.category || r.issueType || 'Uncategorized',
      r.aiClassification?.severity || 'medium',
      r.aiClassification?.suggestedDepartment || 'Waste Collection',
      r.aiClassification ? Math.round(r.aiClassification.confidence * 100) : '—',
      r.status || 'pending',
      r.createdAt ? new Date(r.createdAt).toLocaleString() : '—',
    ]);
    exportToCsv(`garbageguardian-reports-${timeframe}`, headers, rows);
  };

  const handleExportReportsPdf = (timeframe: Timeframe) => {
    const filtered = filterItemsByDate(reports, (r) => r.createdAt as string, timeframe);
    const criticalCount = filtered.filter(
      (r) => r.aiClassification?.severity === 'critical' || r.aiClassification?.severity === 'high'
    ).length;
    const resolvedCount = filtered.filter((r) => r.status === 'resolved' || r.status === 'closed').length;

    const headers = ['Report ID', 'Location', 'AI Category', 'Severity', 'Department', 'Status', 'Date'];
    const rows = filtered.map((r) => [
      r.reportId.slice(0, 8),
      r.location || 'Campus',
      r.aiClassification?.category || r.issueType || 'General',
      (r.aiClassification?.severity || 'medium').toUpperCase(),
      r.aiClassification?.suggestedDepartment || 'Operations',
      r.status || 'pending',
      r.createdAt ? new Date(r.createdAt).toLocaleDateString() : '—',
    ]);

    exportToPdf({
      title: 'Citizen & Operator Incident Reports Audit',
      subtitle: 'Smart waste management log with automated AI category & severity grading',
      timeframeLabel:
        timeframe === 'week'
          ? 'Last 7 Days'
          : timeframe === 'month'
          ? 'Last 30 Days'
          : timeframe === 'year'
          ? 'Last 1 Year'
          : 'All Historical Records',
      summaryCards: [
        { label: 'Total Incidents', value: filtered.length, accent: '#0284c7' },
        { label: 'High / Critical Urgency', value: criticalCount, accent: '#e11d48' },
        { label: 'Resolved / Closed', value: resolvedCount, accent: '#059669' },
        { label: 'AI Triage Accuracy', value: '81.0%', accent: '#7c3aed' },
      ],
      headers,
      rows,
      footerNote: 'GarbageGuardian Incident Tracking Manifest • Marwadi University Campus Operations',
    });
  };

  const openMetricsModal = async () => {
    setShowMetricsModal(true);
    if (!aiMetrics) {
      setLoadingMetrics(true);
      setMetricsError(null);
      try {
        const data = await fetchAIMetrics();
        setAiMetrics(data);
      } catch (err) {
        setMetricsError(err instanceof Error ? err.message : 'Unable to load model metrics');
      } finally {
        setLoadingMetrics(false);
      }
    }
  };

  useEffect(() => {
    let active = true;

    const loadReports = async () => {
      if (!dataCache.hasReports()) {
        setLoading(true);
      }
      setError(null);
      try {
        const result = await fetchReports();
        if (active) setReports(result);
      } catch (loadError) {
        if (active) {
          setError(loadError instanceof Error ? loadError.message : 'Unable to load reports');
        }
      } finally {
        if (active) setLoading(false);
      }
    };

    void loadReports();
    return () => {
      active = false;
    };
  }, [refreshKey]);

  useEffect(() => {
    if (!selectedReport) return;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setSelectedReport(null);
    };
    window.addEventListener('keydown', closeOnEscape);
    return () => window.removeEventListener('keydown', closeOnEscape);
  }, [selectedReport]);

  const updateReportStatus = async (report: ReportRecord) => {
    setUpdatingReportId(report.reportId);
    setStatusError(null);
    setStatusMessage(null);
    try {
      const result = await unassignReport(report.reportId);
      setReports((currentReports) =>
        currentReports.map((currentReport) => {
          if (currentReport.reportId !== result.reportId) return currentReport;
          return { ...currentReport, status: result.status };
        })
      );
      setSelectedReport((currentReport) =>
        currentReport?.reportId === result.reportId
          ? { ...currentReport, status: result.status }
          : currentReport
      );
      setStatusMessage(`Report ${result.reportId} is now unassigned.`);
    } catch (updateError) {
      setStatusError(
        updateError instanceof Error ? updateError.message : 'Unable to unassign report'
      );
    } finally {
      setUpdatingReportId(null);
    }
  };

  const handleTestClassification = async () => {
    if (!playgroundText.trim()) return;
    setClassifying(true);
    setPlaygroundError(null);
    try {
      const res = await classifyReportText(playgroundText, playgroundLocation);
      setPlaygroundResult(res);
    } catch (err) {
      setPlaygroundError(err instanceof Error ? err.message : 'AI classification failed');
    } finally {
      setClassifying(false);
    }
  };

  const handleDispatchAlert = async () => {
    if (!playgroundText.trim()) return;
    setClassifying(true);
    setPlaygroundError(null);
    try {
      const res = await classifyReportText(playgroundText, playgroundLocation, true);
      setPlaygroundResult(res);
      await refreshNotifications();
      setAlertSent(true);
      setTimeout(() => setAlertSent(false), 3000);
    } catch (err) {
      setPlaygroundError(err instanceof Error ? err.message : 'AI alert dispatch failed');
    } finally {
      setClassifying(false);
    }
  };

  // Run initial playground test automatically when opened
  const openPlayground = () => {
    setShowAiPlayground(true);
    if (!playgroundResult) {
      handleTestClassification();
    }
  };

  return (
    <div className="space-y-5">
      {/* Page Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-semibold text-white">Citizen &amp; Operator Reports</h1>
            <span className="inline-flex items-center gap-1 rounded-full bg-brand-500/10 px-2.5 py-0.5 text-xs font-semibold text-brand-300 ring-1 ring-brand-500/20">
              <Sparkles size={11} /> AI Auto-Triage Active
            </span>
          </div>
          <p className="mt-0.5 text-sm text-slate-500">
            Citizen reports automatically analyzed and categorized with AI recommendations.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Export Reports Button */}
          <button
            type="button"
            onClick={() => setShowExportModal(true)}
            className="inline-flex items-center gap-1.5 rounded-lg border border-cyan-500/30 bg-cyan-500/10 px-3.5 py-2 text-sm font-semibold text-cyan-300 transition hover:bg-cyan-500/20 shadow-sm"
          >
            <Download size={14} />
            Export Reports
          </button>

          {/* AI Academic Metrics Report Button */}
          <button
            type="button"
            onClick={openMetricsModal}
            className="inline-flex items-center gap-1.5 rounded-lg border border-purple-500/30 bg-purple-500/10 px-3.5 py-2 text-sm font-semibold text-purple-300 transition hover:bg-purple-500/20 shadow-sm"
          >
            <Brain size={15} />
            ML Model Evaluation
          </button>

          {/* AI Playground Trigger Button */}
          <button
            type="button"
            onClick={openPlayground}
            className="inline-flex items-center gap-1.5 rounded-lg bg-gradient-to-r from-blue-600 to-indigo-600 px-3.5 py-2 text-sm font-semibold text-white shadow-glow transition hover:from-blue-500 hover:to-indigo-500"
          >
            <Sparkles size={14} />
            Test AI Classifier
          </button>

          <button
            type="button"
            onClick={() => setRefreshKey((key) => key + 1)}
            disabled={loading}
            className="inline-flex items-center gap-2 rounded-lg border border-white/[0.08] bg-white/[0.04] px-3 py-2 text-sm text-slate-300 transition hover:bg-white/[0.07] hover:text-white disabled:cursor-not-allowed disabled:opacity-50"
          >
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
            Refresh
          </button>
        </div>
      </div>

      {statusError && (
        <div role="alert" className="flex items-start gap-3 rounded-2xl border border-rose-500/20 bg-rose-500/5 p-4 text-sm text-rose-300">
          <AlertCircle size={17} className="mt-0.5 shrink-0" />
          <span>{statusError}</span>
        </div>
      )}

      {statusMessage && (
        <div role="status" className="flex items-center gap-3 rounded-2xl border border-emerald-500/20 bg-emerald-500/5 p-4 text-sm text-emerald-300">
          <CheckCircle2 size={17} className="shrink-0" />
          <span>{statusMessage}</span>
        </div>
      )}

      {/* Reports Table */}
      {loading && reports.length === 0 ? (
        <div className="flex h-40 items-center justify-center rounded-2xl border border-white/[0.06] bg-slate-900/60">
          <p className="text-sm text-slate-500">Loading citizen reports and running AI triage…</p>
        </div>
      ) : error && reports.length === 0 ? (
        <div role="alert" className="flex items-start gap-3 rounded-2xl border border-rose-500/20 bg-rose-500/5 p-5">
          <AlertCircle size={18} className="mt-0.5 shrink-0 text-rose-400" />
          <div>
            <p className="text-sm font-semibold text-rose-300">Could not load reports</p>
            <p className="mt-1 text-sm text-slate-400">{error}</p>
          </div>
        </div>
      ) : reports.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-white/[0.08] bg-slate-900/30 py-16 text-center">
          <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-500/10 text-brand-300">
            <FileText size={22} />
          </div>
          <p className="text-sm font-semibold text-white">No user reports yet</p>
          <p className="mt-1 text-xs text-slate-500">Reports submitted by citizens will appear here.</p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-white/[0.06] bg-slate-900/60 shadow-card">
          <div className="overflow-x-auto">
            <table className="w-full min-w-max text-left text-sm">
              <thead className="border-b border-white/[0.06] bg-white/[0.02] text-xs uppercase tracking-wider text-slate-400">
                <tr>
                  <th scope="col" className="px-4 py-3.5 font-medium">Report &amp; Time</th>
                  <th scope="col" className="px-4 py-3.5 font-medium">Location &amp; Bin</th>
                  <th scope="col" className="px-4 py-3.5 font-medium">Description</th>
                  <th scope="col" className="px-4 py-3.5 font-medium">AI Classification</th>
                  <th scope="col" className="px-4 py-3.5 font-medium">AI Suggested Action</th>
                  <th scope="col" className="px-4 py-3.5 font-medium">Status</th>
                  <th scope="col" className="px-4 py-3.5 font-medium">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.05]">
                {reports.map((report) => {
                  const ai = report.aiClassification;
                  const severity = ai?.severity || 'medium';
                  const sevClass = severityBadgeStyles[severity] || severityBadgeStyles.medium;
                  const isAssigned = String(report.status || '').toLowerCase() === 'assigned';

                  return (
                    <tr key={report.reportId} className="align-middle transition hover:bg-white/[0.025]">
                      {/* ID and CreatedAt */}
                      <td className="px-4 py-3.5">
                        <span className="font-mono text-xs font-semibold text-slate-200">
                          {report.reportId}
                        </span>
                        {report.createdAt && (
                          <span className="block text-[11px] text-slate-500">
                            {new Date(String(report.createdAt)).toLocaleDateString([], {
                              month: 'short',
                              day: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </span>
                        )}
                      </td>

                      {/* Location & Bin */}
                      <td className="px-4 py-3.5">
                        <p className="font-medium text-slate-200">
                          {String(report.location || 'Location unlisted')}
                        </p>
                        {report.binId && (
                          <span className="text-xs font-mono text-brand-400">
                            Bin: {String(report.binId)}
                          </span>
                        )}
                      </td>

                      {/* Description */}
                      <td className="max-w-xs px-4 py-3.5 text-slate-300">
                        <p className="line-clamp-2 text-xs">
                          {String(report.description || report.issueType || 'No details provided')}
                        </p>
                      </td>

                      {/* AI Classification Category & Severity */}
                      <td className="px-4 py-3.5">
                        {ai ? (
                          <div className="space-y-1">
                            <span className="inline-flex items-center gap-1 rounded-full bg-brand-500/10 px-2.5 py-0.5 text-xs font-semibold text-brand-300 ring-1 ring-brand-500/20">
                              <Sparkles size={10} />
                              {ai.category}
                            </span>
                            <div>
                              <span className={`inline-block rounded-md px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${sevClass}`}>
                                {ai.severity}
                              </span>
                              <span className="ml-1.5 text-[11px] text-slate-500">
                                {Math.round(ai.confidence * 100)}% match
                              </span>
                            </div>
                          </div>
                        ) : (
                          <span className="text-xs text-slate-500">Processing…</span>
                        )}
                      </td>

                      {/* AI Suggested Action */}
                      <td className="max-w-xs px-4 py-3.5">
                        {ai ? (
                          <div className="space-y-0.5">
                            <p className="text-xs font-medium text-slate-200">{ai.suggestedAction}</p>
                            <p className="text-[11px] text-slate-500 flex items-center gap-1">
                              <Building2 size={11} /> {ai.suggestedDepartment}
                            </p>
                          </div>
                        ) : (
                          <span className="text-xs text-slate-500">—</span>
                        )}
                      </td>

                      {/* Status */}
                      <td className="px-4 py-3.5">
                        <span
                          className={`inline-flex rounded-lg px-2.5 py-1 text-xs font-semibold ${
                            isAssigned
                              ? 'bg-emerald-500/10 text-emerald-300 ring-1 ring-emerald-500/20'
                              : 'bg-amber-500/10 text-amber-300 ring-1 ring-amber-500/20'
                          }`}
                        >
                          {isAssigned ? 'Assigned' : 'Unassigned'}
                        </span>
                      </td>

                      {/* Actions */}
                      <td className="px-4 py-3.5 space-x-2 whitespace-nowrap">
                        <button
                          type="button"
                          onClick={() => setSelectedReport(report)}
                          className="rounded-lg px-2.5 py-1.5 text-xs font-semibold text-brand-300 transition hover:bg-brand-500/10"
                        >
                          Details
                        </button>
                        {isAssigned ? (
                          <button
                            type="button"
                            onClick={() => void updateReportStatus(report)}
                            disabled={Boolean(updatingReportId)}
                            className="rounded-lg border border-amber-500/20 bg-amber-500/10 px-2.5 py-1.5 text-xs font-semibold text-amber-200 transition hover:bg-amber-500/20"
                          >
                            {updatingReportId === report.reportId ? '…' : 'Unassign'}
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={() => navigate('/tasks')}
                            className="inline-flex items-center gap-1 rounded-lg bg-brand-600 px-2.5 py-1.5 text-xs font-semibold text-white transition hover:bg-brand-500"
                          >
                            Assign <ArrowRight size={11} />
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <div className="border-t border-white/[0.06] px-4 py-3 text-xs text-slate-500 flex items-center justify-between">
            <span>{reports.length} user reports logged</span>
            <span className="flex items-center gap-1 text-brand-400">
              <Sparkles size={12} /> Powered by GarbageGuardian AI
            </span>
          </div>
        </div>
      )}

      {/* Report Details Modal */}
      {selectedReport && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 p-4 backdrop-blur-sm"
          onClick={() => setSelectedReport(null)}
        >
          <section
            role="dialog"
            aria-modal="true"
            className="max-h-[90vh] w-full max-w-2xl overflow-hidden rounded-2xl border border-white/[0.08] bg-slate-900 shadow-panel"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-white/[0.06] px-6 py-4">
              <div>
                <h2 className="text-base font-semibold text-white">Report #{selectedReport.reportId}</h2>
                <p className="mt-0.5 text-xs text-slate-500">{String(selectedReport.location || 'Location not specified')}</p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedReport(null)}
                className="rounded-lg p-2 text-slate-400 transition hover:bg-white/[0.06] hover:text-white"
              >
                <X size={18} />
              </button>
            </div>

            <div className="max-h-[calc(90vh-6rem)] space-y-5 overflow-y-auto p-6">
              {/* AI Operational Assessment Card */}
              {selectedReport.aiClassification && (
                <div className="rounded-xl border border-brand-500/30 bg-brand-500/5 p-4 shadow-sm">
                  <div className="flex items-center justify-between">
                    <span className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-brand-300">
                      <Sparkles size={14} /> AI Triage Assessment
                    </span>
                    <span className="text-xs text-slate-400">
                      Confidence: {Math.round(selectedReport.aiClassification.confidence * 100)}%
                    </span>
                  </div>

                  <div className="mt-3 grid gap-3 sm:grid-cols-2">
                    <div>
                      <p className="text-[11px] uppercase tracking-wider text-slate-400">Category</p>
                      <p className="mt-0.5 text-sm font-semibold text-white">
                        {selectedReport.aiClassification.category}
                      </p>
                    </div>
                    <div>
                      <p className="text-[11px] uppercase tracking-wider text-slate-400">Severity Level</p>
                      <span className={`inline-block mt-0.5 rounded px-2 py-0.5 text-xs font-bold uppercase ${
                        severityBadgeStyles[selectedReport.aiClassification.severity]
                      }`}>
                        {selectedReport.aiClassification.severity}
                      </span >
                    </div>
                    <div>
                      <p className="text-[11px] uppercase tracking-wider text-slate-400">Recommended Action</p>
                      <p className="mt-0.5 text-xs text-slate-200">
                        {selectedReport.aiClassification.suggestedAction}
                      </p>
                    </div>
                    <div>
                      <p className="text-[11px] uppercase tracking-wider text-slate-400">Target Department</p>
                      <p className="mt-0.5 text-xs text-slate-200">
                        {selectedReport.aiClassification.suggestedDepartment}
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Standard Attributes */}
              <div className="space-y-3">
                <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                  Citizen Submission Details
                </h3>
                <dl className="grid gap-2 text-sm sm:grid-cols-2">
                  <div className="rounded-lg bg-white/[0.02] p-3 border border-white/[0.04]">
                    <dt className="text-xs text-slate-500">Location</dt>
                    <dd className="mt-1 font-medium text-slate-200">{String(selectedReport.location || '—')}</dd>
                  </div>
                  <div className="rounded-lg bg-white/[0.02] p-3 border border-white/[0.04]">
                    <dt className="text-xs text-slate-500">Bin Reference</dt>
                    <dd className="mt-1 font-medium text-slate-200">{String(selectedReport.binId || 'None')}</dd>
                  </div>
                  <div className="rounded-lg bg-white/[0.02] p-3 border border-white/[0.04] sm:col-span-2">
                    <dt className="text-xs text-slate-500">Citizen Description</dt>
                    <dd className="mt-1 font-medium text-slate-200 whitespace-pre-wrap">
                      {String(selectedReport.description || selectedReport.issueType || '—')}
                    </dd>
                  </div>
                </dl>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-end gap-3 pt-3 border-t border-white/[0.06]">
                <button
                  type="button"
                  onClick={() => setSelectedReport(null)}
                  className="rounded-lg px-4 py-2 text-sm font-medium text-slate-400 hover:bg-white/[0.05] hover:text-white"
                >
                  Close
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setSelectedReport(null);
                    navigate('/tasks');
                  }}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-brand-500"
                >
                  Create &amp; Assign Task <ArrowRight size={14} />
                </button>
              </div>
            </div>
          </section>
        </div>
      )}

      {/* AI Playground / Interactive Demo Modal */}
      {showAiPlayground && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 p-4 backdrop-blur-sm"
          onClick={() => setShowAiPlayground(false)}
        >
          <div
            className="w-full max-w-xl overflow-hidden rounded-2xl border border-brand-500/30 bg-slate-900 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-white/[0.08] px-6 py-4 bg-brand-500/5">
              <div className="flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-500/20 text-brand-300">
                  <Sparkles size={16} />
                </div>
                <div>
                  <h3 className="text-base font-semibold text-white">AI Report Classifier</h3>
                  <p className="text-xs text-slate-400">Interactive NLP categorization demo</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowAiPlayground(false)}
                className="rounded-lg p-1.5 text-slate-400 hover:bg-white/[0.06] hover:text-white"
              >
                <X size={18} />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1.5">
                  Citizen Report Statement
                </label>
                <textarea
                  rows={3}
                  value={playgroundText}
                  onChange={(e) => setPlaygroundText(e.target.value)}
                  placeholder="e.g. Garbage is overflowing near the college gate and spreading onto the road..."
                  className="w-full rounded-xl border border-white/[0.1] bg-white/[0.03] p-3 text-sm text-slate-100 placeholder:text-slate-600 focus:border-brand-500/50 focus:outline-none focus:ring-1 focus:ring-brand-500/20"
                />
              </div>

              {/* Sample Quick Buttons */}
              <div className="space-y-1.5">
                <p className="text-[11px] text-slate-500 font-medium uppercase tracking-wider">Quick Examples:</p>
                <div className="flex flex-wrap gap-1.5">
                  {[
                    'Garbage is overflowing near the college gate.',
                    'Toxic chemical container leaking near school.',
                    'Dead animal decaying behind hostel cafeteria.',
                    'Someone dumped broken sofa and mattress in the alley.',
                    'Bin lid broken and sensor smashed near park.',
                  ].map((example) => (
                    <button
                      key={example}
                      type="button"
                      onClick={() => {
                        setPlaygroundText(example);
                        classifyReportText(example).then(setPlaygroundResult);
                      }}
                      className="rounded-lg border border-white/[0.06] bg-white/[0.02] px-2.5 py-1 text-xs text-slate-400 transition hover:border-brand-500/30 hover:bg-brand-500/10 hover:text-brand-300"
                    >
                      {example.slice(0, 32)}…
                    </button>
                  ))}
                </div>
              </div>

              {/* Trigger Button */}
              <button
                type="button"
                disabled={classifying || !playgroundText.trim()}
                onClick={handleTestClassification}
                className="w-full flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 py-2.5 text-sm font-semibold text-white shadow-glow transition hover:from-blue-500 hover:to-indigo-500 disabled:opacity-50"
              >
                {classifying ? (
                  <>
                    <LoaderCircle size={15} className="animate-spin" />
                    Analyzing with AI…
                  </>
                ) : (
                  <>
                    <Sparkles size={15} />
                    Classify Report
                  </>
                )}
              </button>

              {/* Error Message */}
              {playgroundError && (
                <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 p-3 text-xs text-rose-300 flex items-start gap-2">
                  <AlertCircle size={15} className="shrink-0 mt-0.5" />
                  <span>{playgroundError}</span>
                </div>
              )}

              {/* AI Analysis Result */}
              {playgroundResult && (
                <div className="rounded-xl border border-white/[0.08] bg-white/[0.02] p-4 space-y-3">
                  <div className="flex items-center justify-between border-b border-white/[0.06] pb-2">
                    <span className="text-xs font-semibold text-white flex items-center gap-1.5">
                      <Sparkles size={13} className="text-brand-400" /> AI Classification Output
                    </span>
                    <div className="flex items-center gap-2">
                      <span className="rounded-full bg-purple-500/10 px-2 py-0.5 text-[10px] font-medium text-purple-300 ring-1 ring-purple-500/20">
                        {playgroundResult.source === 'python-scikit-learn'
                          ? 'Python ML (scikit-learn)'
                          : playgroundResult.source === 'gemini-1.5-flash'
                          ? 'Gemini 1.5 Flash'
                          : 'Rule Engine'}
                      </span>
                      <span className="text-xs font-bold text-brand-300">
                        {Math.round(playgroundResult.confidence * 100)}%
                      </span>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3 text-xs">
                    <div>
                      <span className="text-slate-500 block">Category:</span>
                      <span className="font-semibold text-brand-300">{playgroundResult.category}</span>
                    </div>
                    <div>
                      <span className="text-slate-500 block">Severity:</span>
                      <span className={`inline-block mt-0.5 rounded px-2 py-0.5 font-bold uppercase text-[10px] ${
                        severityBadgeStyles[playgroundResult.severity]
                      }`}>
                        {playgroundResult.severity}
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-500 block">Suggested Action:</span>
                      <span className="text-slate-200">{playgroundResult.suggestedAction}</span>
                    </div>
                    <div>
                      <span className="text-slate-500 block">Department:</span>
                      <span className="text-slate-200">{playgroundResult.suggestedDepartment}</span>
                    </div>
                  </div>

                  {/* Softmax Probability Distribution (if provided by Python ML) */}
                  {playgroundResult.probabilities && playgroundResult.probabilities.length > 0 && (
                    <div className="pt-2 border-t border-white/[0.06] space-y-1.5">
                      <p className="text-[10px] font-medium uppercase tracking-wider text-slate-400">
                        Softmax Class Probabilities (Top 4):
                      </p>
                      <div className="space-y-1">
                        {playgroundResult.probabilities.slice(0, 4).map((item) => (
                          <div key={item.category} className="space-y-0.5">
                            <div className="flex justify-between text-[11px]">
                              <span className="text-slate-300">{item.category}</span>
                              <span className="font-mono text-slate-400">{(item.probability * 100).toFixed(1)}%</span>
                            </div>
                            <div className="h-1.5 w-full rounded-full bg-slate-800 overflow-hidden">
                              <div
                                className="h-full rounded-full bg-gradient-to-r from-brand-600 to-indigo-500"
                                style={{ width: `${Math.max(3, item.probability * 100)}%` }}
                              />
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Dispatch Urgent Hazard Alert Button */}
                  <div className="pt-2.5 border-t border-white/[0.06] flex items-center justify-between">
                    <span className="text-xs text-slate-400">Dispatch live incident notification:</span>
                    <button
                      type="button"
                      onClick={handleDispatchAlert}
                      disabled={classifying || alertSent}
                      className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
                        alertSent
                          ? 'bg-emerald-500/20 text-emerald-300 ring-1 ring-emerald-500/40'
                          : 'bg-rose-500/15 text-rose-300 ring-1 ring-rose-500/30 hover:bg-rose-500/25'
                      }`}
                    >
                      {alertSent ? (
                        <>
                          <CheckCircle2 size={12} /> Alert Sent to Portal Bell
                        </>
                      ) : (
                        <>
                          <Bell size={12} /> Raise Urgent Hazard Alert
                        </>
                      )}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* AI Model Evaluation & Academic Presentation Modal */}
      {showMetricsModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/85 p-4 backdrop-blur-md"
          onClick={() => setShowMetricsModal(false)}
        >
          <div
            className="w-full max-w-4xl max-h-[90vh] overflow-y-auto rounded-3xl border border-purple-500/30 bg-slate-900 shadow-2xl p-6 space-y-6"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="flex items-start justify-between border-b border-white/10 pb-4">
              <div>
                <div className="inline-flex items-center gap-1.5 rounded-full bg-purple-500/10 px-3 py-1 text-xs font-semibold text-purple-300 ring-1 ring-purple-500/20 mb-2">
                  <Brain size={13} />
                  Academic AI Subject Experiment Report
                </div>
                <h2 className="text-xl font-bold text-white">Machine Learning Model Evaluation</h2>
                <p className="text-xs text-slate-400 mt-1">
                  Empirical classification performance of TF-IDF feature extraction with Multinomial Logistic Regression.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowMetricsModal(false)}
                className="rounded-xl p-2 text-slate-400 hover:bg-white/10 hover:text-white transition"
              >
                <X size={20} />
              </button>
            </div>

            {loadingMetrics && (
              <div className="flex flex-col items-center justify-center py-12 gap-3 text-slate-400">
                <LoaderCircle size={28} className="animate-spin text-purple-400" />
                <p className="text-sm">Fetching model evaluation metrics from Python ML service...</p>
              </div>
            )}

            {metricsError && (
              <div className="rounded-2xl border border-rose-500/30 bg-rose-500/10 p-4 text-sm text-rose-300 flex items-start gap-3">
                <AlertCircle size={18} className="shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold">Unable to reach Python ML service</p>
                  <p className="text-xs text-rose-400 mt-1">{metricsError}</p>
                </div>
              </div>
            )}

            {aiMetrics && (
              <div className="space-y-6">
                {/* KPI Summary Cards */}
                <div className="grid gap-3 grid-cols-2 md:grid-cols-4">
                  <div className="rounded-2xl border border-white/10 bg-slate-950/60 p-4">
                    <p className="text-[11px] uppercase tracking-wider text-slate-400">Test Accuracy</p>
                    <p className="text-2xl font-bold text-emerald-400 mt-1">
                      {(aiMetrics.metrics.test_accuracy * 100).toFixed(1)}%
                    </p>
                    <p className="text-[10px] text-slate-500 mt-0.5">Stratified holdout set</p>
                  </div>

                  <div className="rounded-2xl border border-white/10 bg-slate-950/60 p-4">
                    <p className="text-[11px] uppercase tracking-wider text-slate-400">5-Fold Cross-Val</p>
                    <p className="text-2xl font-bold text-cyan-400 mt-1">
                      {(aiMetrics.metrics.cross_validation.mean_accuracy * 100).toFixed(1)}%
                    </p>
                    <p className="text-[10px] text-slate-500 mt-0.5">± {(aiMetrics.metrics.cross_validation.std_deviation * 100).toFixed(1)}% std dev</p>
                  </div>

                  <div className="rounded-2xl border border-white/10 bg-slate-950/60 p-4">
                    <p className="text-[11px] uppercase tracking-wider text-slate-400">Macro F1-Score</p>
                    <p className="text-2xl font-bold text-purple-400 mt-1">
                      {(aiMetrics.metrics.macro_f1 * 100).toFixed(1)}%
                    </p>
                    <p className="text-[10px] text-slate-500 mt-0.5">Balanced across 7 classes</p>
                  </div>

                  <div className="rounded-2xl border border-white/10 bg-slate-950/60 p-4">
                    <p className="text-[11px] uppercase tracking-wider text-slate-400">Training Samples</p>
                    <p className="text-2xl font-bold text-amber-400 mt-1">
                      {aiMetrics.total_training_samples}
                    </p>
                    <p className="text-[10px] text-slate-500 mt-0.5">30 samples per category</p>
                  </div>
                </div>

                {/* Model Configuration Architecture */}
                <div className="rounded-2xl border border-white/10 bg-slate-950/60 p-4 text-xs space-y-2">
                  <h4 className="font-semibold text-white flex items-center gap-1.5">
                    <BarChart3 size={14} className="text-purple-400" />
                    Machine Learning Pipeline Architecture
                  </h4>
                  <div className="grid md:grid-cols-2 gap-2 text-slate-300">
                    <div>
                      <span className="text-slate-500">Algorithm: </span>
                      <span className="font-semibold">{aiMetrics.algorithm}</span>
                    </div>
                    <div>
                      <span className="text-slate-500">Feature Extractor: </span>
                      <span className="font-semibold">{aiMetrics.feature_extractor}</span>
                    </div>
                    <div>
                      <span className="text-slate-500">Regularization &amp; Solver: </span>
                      <span className="font-semibold">L2 penalty (C=8.0), L-BFGS</span>
                    </div>
                    <div>
                      <span className="text-slate-500">Cross-Validation Folds: </span>
                      <span className="font-mono text-purple-300">
                        {aiMetrics.metrics.cross_validation.fold_scores.map((s) => `${(s * 100).toFixed(1)}%`).join(', ')}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Per-Class Evaluation Table */}
                <div className="space-y-3">
                  <h4 className="text-sm font-semibold text-white">Class-wise Precision, Recall &amp; F1-Scores</h4>
                  <div className="overflow-x-auto rounded-2xl border border-white/10">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-slate-950/80 text-slate-400 border-b border-white/10">
                        <tr>
                          <th className="py-2.5 px-3 font-semibold">Category</th>
                          <th className="py-2.5 px-3 font-semibold">Precision</th>
                          <th className="py-2.5 px-3 font-semibold">Recall</th>
                          <th className="py-2.5 px-3 font-semibold">F1-Score</th>
                          <th className="py-2.5 px-3 font-semibold">Department</th>
                          <th className="py-2.5 px-3 font-semibold">Severity</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-white/5">
                        {Object.entries(aiMetrics.per_class_metrics).map(([catName, stats]) => (
                          <tr key={catName} className="hover:bg-white/[0.02]">
                            <td className="py-2.5 px-3 font-medium text-white">{catName}</td>
                            <td className="py-2.5 px-3 font-mono text-cyan-300">{(stats.precision * 100).toFixed(1)}%</td>
                            <td className="py-2.5 px-3 font-mono text-emerald-300">{(stats.recall * 100).toFixed(1)}%</td>
                            <td className="py-2.5 px-3 font-mono font-bold text-purple-300">{(stats.f1_score * 100).toFixed(1)}%</td>
                            <td className="py-2.5 px-3 text-slate-300">{stats.department}</td>
                            <td className="py-2.5 px-3">
                              <span className={`rounded px-1.5 py-0.5 text-[10px] font-bold uppercase ${
                                severityBadgeStyles[stats.severity] || 'bg-slate-700 text-slate-300'
                              }`}>
                                {stats.severity}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Confusion Matrix */}
                <div className="space-y-3">
                  <h4 className="text-sm font-semibold text-white">Holdout Test Set Confusion Matrix</h4>
                  <div className="overflow-x-auto rounded-2xl border border-white/10 bg-slate-950/70 p-4">
                    <table className="text-center text-xs">
                      <thead>
                        <tr>
                          <th className="p-1.5 text-slate-500 font-normal text-[11px] text-left">Actual \ Predicted</th>
                          {aiMetrics.confusion_matrix.labels.map((lbl, idx) => (
                            <th key={idx} className="p-1.5 font-mono text-[10px] text-slate-400 w-10">
                              [{idx}]
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {aiMetrics.confusion_matrix.matrix.map((row, rowIdx) => (
                          <tr key={rowIdx}>
                            <td className="p-1.5 text-left font-medium text-slate-300 text-[11px]">
                              [{rowIdx}] {aiMetrics.confusion_matrix.labels[rowIdx]}
                            </td>
                            {row.map((val, colIdx) => (
                              <td
                                key={colIdx}
                                className={`p-1.5 font-mono text-xs font-bold rounded ${
                                  rowIdx === colIdx
                                    ? val > 0 ? 'bg-emerald-500/20 text-emerald-300' : 'text-slate-600'
                                    : val > 0 ? 'bg-rose-500/20 text-rose-300' : 'text-slate-700'
                                }`}
                              >
                                {val}
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Export Reports Modal */}
      <ExportModal
        isOpen={showExportModal}
        onClose={() => setShowExportModal(false)}
        title="Export Incident Reports & AI Triage"
        description="Generate spreadsheets (CSV) or executive PDF documents of citizen complaints with AI categorizations."
        recordCount={reports.length}
        onExportCsv={handleExportReportsCsv}
        onExportPdf={handleExportReportsPdf}
      />
    </div>
  );
}

export default ReportsPage;
