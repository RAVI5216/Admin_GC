import { useEffect, useMemo, useState } from 'react';
import { AlertCircle, CheckCircle2, FileText, LoaderCircle, RefreshCw, X } from 'lucide-react';
import { fetchReports, type ReportRecord, unassignReport } from '../services/reportService';

const formatLabel = (key: string) =>
  key
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
    .replace(/^./, (character) => character.toUpperCase());

const formatValue = (value: unknown) => {
  if (value === null || value === undefined || value === '') return '—';
  if (typeof value === 'object') return JSON.stringify(value, null, 2);
  return String(value);
};

const getStatusKey = (report: ReportRecord) =>
  Object.keys(report).find((key) => key.toLowerCase().replace(/[^a-z0-9]/g, '') === 'status') ??
  'status';

const isReportAssigned = (report: ReportRecord) =>
  String(report[getStatusKey(report)] ?? '').trim().toLowerCase() === 'assigned';

const withReportStatus = (report: ReportRecord, status: string): ReportRecord => ({
  ...report,
  [getStatusKey(report)]: status,
});

function ReportsPage() {
  const [reports, setReports] = useState<ReportRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedReport, setSelectedReport] = useState<ReportRecord | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const [updatingReportId, setUpdatingReportId] = useState<string | null>(null);
  const [statusError, setStatusError] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    const loadReports = async () => {
      setLoading(true);
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

  const columns = useMemo(
    () =>
      Array.from(
        new Set([
          'reportId',
          'location',
          'createdAt',
          'binId',
          'issueType',
          'status',
          ...reports.flatMap((report) => Object.keys(report)),
        ])
      ),
    [reports]
  );

  const updateReportStatus = async (report: ReportRecord) => {
    setUpdatingReportId(report.reportId);
    setStatusError(null);
    setStatusMessage(null);
    try {
      const result = await unassignReport(report.reportId);
      setReports((currentReports) =>
        currentReports.map((currentReport) => {
          if (currentReport.reportId !== result.reportId) return currentReport;
          return withReportStatus(currentReport, result.status);
        })
      );
      setSelectedReport((currentReport) =>
        currentReport?.reportId === result.reportId
          ? withReportStatus(currentReport, result.status)
          : currentReport
      );
      setStatusMessage(`Report ${result.reportId} and its linked task are now unassigned.`);
    } catch (updateError) {
      setStatusError(
        updateError instanceof Error ? updateError.message : 'Unable to unassign report'
      );
    } finally {
      setUpdatingReportId(null);
    }
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-semibold text-white">User Reports</h1>
          <p className="mt-0.5 text-sm text-slate-500">Reports submitted by users of the mobile application.</p>
        </div>
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

      {statusError ? (
        <div role="alert" className="flex items-start gap-3 rounded-2xl border border-rose-500/20 bg-rose-500/5 p-4 text-sm text-rose-300">
          <AlertCircle size={17} className="mt-0.5 shrink-0" />
          <span>{statusError}</span>
        </div>
      ) : null}
      {statusMessage ? (
        <div role="status" className="flex items-center gap-3 rounded-2xl border border-emerald-500/20 bg-emerald-500/5 p-4 text-sm text-emerald-300">
          <CheckCircle2 size={17} className="shrink-0" />
          <span>{statusMessage}</span>
        </div>
      ) : null}

      {loading ? (
        <div className="flex h-40 items-center justify-center rounded-2xl border border-white/[0.06] bg-slate-900/60">
          <p className="text-sm text-slate-500">Loading user reports…</p>
        </div>
      ) : error ? (
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
          <p className="mt-1 text-xs text-slate-500">Reports submitted through the mobile application will appear here.</p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-white/[0.06] bg-slate-900/60 shadow-card">
          <div className="overflow-x-auto">
            <table className="w-full min-w-max text-left text-sm">
              <thead className="border-b border-white/[0.06] bg-white/[0.02] text-xs uppercase tracking-wider text-slate-500">
                <tr>
                  {columns.map((column) => (
                    <th key={column} scope="col" className="px-4 py-3 font-medium">
                      {formatLabel(column)}
                    </th>
                  ))}
                  <th scope="col" className="px-4 py-3 font-medium">Assignment</th>
                  <th scope="col" className="px-4 py-3 font-medium">Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.05]">
                {reports.map((report, index) => (
                  <tr key={report.reportId ?? index} className="align-top transition hover:bg-white/[0.025]">
                    {columns.map((column) => (
                      <td key={column} className="max-w-xs px-4 py-3 text-slate-300">
                        <span className="block max-w-xs truncate" title={formatValue(report[column])}>
                          {formatValue(report[column])}
                        </span>
                      </td>
                    ))}
                    <td className="px-4 py-3">
                      {isReportAssigned(report) ? (
                        <button
                          type="button"
                          onClick={() => void updateReportStatus(report)}
                          disabled={Boolean(updatingReportId)}
                          className="inline-flex items-center gap-2 rounded-lg border border-amber-500/20 bg-amber-500/10 px-3 py-1.5 text-xs font-semibold text-amber-200 transition hover:bg-amber-500/20 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          {updatingReportId === report.reportId ? (
                            <LoaderCircle size={14} className="animate-spin" />
                          ) : null}
                          {updatingReportId === report.reportId ? 'Unassigning...' : 'Unassign'}
                        </button>
                      ) : (
                        <span className="inline-flex rounded-lg border border-white/[0.08] bg-white/[0.03] px-3 py-1.5 text-xs font-medium text-slate-400">
                          Unassigned
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <button
                        type="button"
                        onClick={() => setSelectedReport(report)}
                        className="rounded-lg px-2.5 py-1.5 text-xs font-semibold text-brand-300 transition hover:bg-brand-500/10 hover:text-brand-200"
                      >
                        View details
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="border-t border-white/[0.06] px-4 py-3 text-xs text-slate-500">
            {reports.length} {reports.length === 1 ? 'report' : 'reports'}
          </div>
        </div>
      )}

      {selectedReport && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 p-4 backdrop-blur-sm"
          onClick={() => setSelectedReport(null)}
        >
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="report-details-title"
            className="max-h-[85vh] w-full max-w-2xl overflow-hidden rounded-2xl border border-white/[0.08] bg-slate-900 shadow-panel"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-white/[0.06] px-5 py-4">
              <div>
                <h2 id="report-details-title" className="text-base font-semibold text-white">Report details</h2>
                <p className="mt-0.5 text-xs text-slate-500">{selectedReport.reportId}</p>
              </div>
              <button
                type="button"
                aria-label="Close report details"
                onClick={() => setSelectedReport(null)}
                className="rounded-lg p-2 text-slate-400 transition hover:bg-white/[0.06] hover:text-white"
              >
                <X size={18} />
              </button>
            </div>
            <dl className="max-h-[calc(85vh-5rem)] space-y-4 overflow-y-auto p-5">
              {Object.entries(selectedReport).map(([key, value]) => (
                <div key={key} className="grid gap-1 sm:grid-cols-[minmax(8rem,0.35fr)_1fr] sm:gap-4">
                  <dt className="text-xs font-medium uppercase tracking-wider text-slate-500">{formatLabel(key)}</dt>
                  <dd className="whitespace-pre-wrap break-words text-sm text-slate-200">{formatValue(value)}</dd>
                </div>
              ))}
            </dl>
          </section>
        </div>
      )}
    </div>
  );
}

export default ReportsPage;
