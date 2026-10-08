import { type FormEvent, useEffect, useMemo, useState } from 'react';
import { AlertCircle, CheckCircle2, LoaderCircle, Plus, RefreshCw, Users, X } from 'lucide-react';
import {
  createEmployer,
  createEmployerTask,
  fetchEmployers,
  generateEmployerIds,
} from '../services/employerService';
import { fetchReports, type ReportRecord, unassignReport } from '../services/reportService';
import type { EmployerUser } from '../types/employer';

const formatValue = (value: unknown) => {
  if (value === null || value === undefined || value === '') return '—';
  if (typeof value === 'object') return JSON.stringify(value);
  return String(value);
};

const formatLabel = (key: string) =>
  key === 'employerId'
    ? 'Employer ID (from userId)'
    : key === 'employeeId'
      ? 'Employee ID (stored)'
      : key
          .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
          .replace(/^./, (character) => character.toUpperCase());

const reportFieldAliases: Record<string, string[]> = {
  reportId: ['reportId', 'reportID'],
  location: ['location'],
  createdAt: ['createdAt'],
  binId: ['binId', 'deviceId'],
  issueType: ['issueType', 'issue', 'category'],
  status: ['status'],
};

const getReportField = (report: ReportRecord, field: string) => {
  const aliases = reportFieldAliases[field] ?? [field];
  const normalizedAliases = aliases.map((alias) => alias.toLowerCase().replace(/[^a-z0-9]/g, ''));
  const entry = Object.entries(report).find(([key]) =>
    normalizedAliases.includes(key.toLowerCase().replace(/[^a-z0-9]/g, ''))
  );
  return entry?.[1];
};

const isReportAssigned = (report: ReportRecord) =>
  typeof getReportField(report, 'status') === 'string' &&
  String(getReportField(report, 'status')).trim().toLowerCase() === 'assigned';

const withReportStatus = (report: ReportRecord, status: string): ReportRecord => {
  const statusKey =
    Object.keys(report).find(
      (key) => key.toLowerCase().replace(/[^a-z0-9]/g, '') === 'status'
    ) ?? 'status';
  return { ...report, [statusKey]: status };
};

function EmployersPage() {
  const [employers, setEmployers] = useState<EmployerUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const [assignmentEmployer, setAssignmentEmployer] = useState<EmployerUser | null>(null);
  const [reports, setReports] = useState<ReportRecord[]>([]);
  const [reportsLoading, setReportsLoading] = useState(false);
  const [reportsError, setReportsError] = useState<string | null>(null);
  const [updatingReportId, setUpdatingReportId] = useState<string | null>(null);
  const [assignmentError, setAssignmentError] = useState<string | null>(null);
  const [assignmentMessage, setAssignmentMessage] = useState<string | null>(null);
  const [addFormOpen, setAddFormOpen] = useState(false);
  const [savingEmployer, setSavingEmployer] = useState(false);
  const [generatingEmployerIds, setGeneratingEmployerIds] = useState(false);
  const [addEmployerError, setAddEmployerError] = useState<string | null>(null);
  const [addEmployerMessage, setAddEmployerMessage] = useState<string | null>(null);
  const [newEmployer, setNewEmployer] = useState({
    userId: '',
    employeeId: '',
    name: '',
    email: '',
    phone: '',
    department: '',
    password: '',
  });

  const refreshGeneratedEmployerIds = async () => {
    setGeneratingEmployerIds(true);
    setAddEmployerError(null);
    setNewEmployer((current) => ({ ...current, userId: '', employeeId: '' }));
    try {
      const ids = await generateEmployerIds();
      setNewEmployer((current) => ({ ...current, ...ids }));
    } catch (generateError) {
      setAddEmployerError(
        generateError instanceof Error ? generateError.message : 'Unable to generate employer IDs'
      );
    } finally {
      setGeneratingEmployerIds(false);
    }
  };

  const openAddEmployerForm = () => {
    setAddEmployerError(null);
    setAddEmployerMessage(null);
    setNewEmployer({
      userId: '',
      employeeId: '',
      name: '',
      email: '',
      phone: '',
      department: '',
      password: '',
    });
    setAddFormOpen(true);
    void refreshGeneratedEmployerIds();
  };

  useEffect(() => {
    let active = true;

    const loadEmployers = async () => {
      setLoading(true);
      setError(null);
      try {
        const users = await fetchEmployers();
        if (active) setEmployers(users);
      } catch (loadError) {
        if (active) {
          setError(loadError instanceof Error ? loadError.message : 'Unable to load employer users');
        }
      } finally {
        if (active) setLoading(false);
      }
    };

    void loadEmployers();
    return () => {
      active = false;
    };
  }, [refreshKey]);

  useEffect(() => {
    if (!assignmentEmployer) return undefined;

    let active = true;
    setReports([]);
    setReportsLoading(true);
    setReportsError(null);

    const loadReports = async () => {
      try {
        const result = await fetchReports();
        if (active) setReports(result);
      } catch (loadError) {
        if (active) {
          setReportsError(loadError instanceof Error ? loadError.message : 'Unable to load reports');
        }
      } finally {
        if (active) setReportsLoading(false);
      }
    };

    void loadReports();
    return () => {
      active = false;
    };
  }, [assignmentEmployer]);

  const columns = useMemo(
    () =>
      Array.from(
        new Set([
          'employerId',
          'name',
          'employeeId',
          ...employers.flatMap((employer) => Object.keys(employer)),
        ])
      ),
    [employers]
  );

  const openAssignmentForm = (employer: EmployerUser) => {
    setAssignmentEmployer(employer);
    setAssignmentError(null);
    setAssignmentMessage(null);
  };

  const submitNewEmployer = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSavingEmployer(true);
    setAddEmployerError(null);
    setAddEmployerMessage(null);
    try {
      const created = await createEmployer(newEmployer);
      setEmployers((currentEmployers) => [
        ...currentEmployers.filter((employer) => employer.userId !== created.userId),
        created,
      ]);
      setNewEmployer({
        userId: '',
        employeeId: '',
        name: '',
        email: '',
        phone: '',
        department: '',
        password: '',
      });
      setAddFormOpen(false);
      setAddEmployerMessage(`${created.name} was added to the employer roster.`);
    } catch (submitError) {
      setAddEmployerError(
        submitError instanceof Error ? submitError.message : 'Unable to add employer'
      );
    } finally {
      setSavingEmployer(false);
    }
  };

  const assignReport = async (report: ReportRecord) => {
    if (typeof assignmentEmployer?.userId !== 'string' || !assignmentEmployer.userId.trim()) {
      setAssignmentError('This employee record has no userId and cannot be assigned a task.');
      return;
    }
    const reportId = getReportField(report, 'reportId');
    if (typeof reportId !== 'string' || !reportId.trim()) {
      setAssignmentError('This report has no reportId and cannot be assigned.');
      return;
    }

    setUpdatingReportId(reportId);
    setAssignmentError(null);
    try {
      await createEmployerTask({
        assignedUserId: assignmentEmployer.userId,
        reportId,
      });
      setReports((currentReports) =>
        currentReports.map((currentReport) => {
          if (getReportField(currentReport, 'reportId') !== reportId) return currentReport;
          return withReportStatus(currentReport, 'assigned');
        })
      );
      setAssignmentMessage(
        `Report ${reportId} assigned to ${formatValue(assignmentEmployer.name)}.`
      );
    } catch (submitError) {
      setAssignmentError(submitError instanceof Error ? submitError.message : 'Unable to assign task');
    } finally {
      setUpdatingReportId(null);
    }
  };

  const unassignReportFromEmployer = async (report: ReportRecord) => {
    const reportId = getReportField(report, 'reportId');
    if (typeof reportId !== 'string' || !reportId.trim()) {
      setAssignmentError('This report has no reportId and cannot be unassigned.');
      return;
    }

    setUpdatingReportId(reportId);
    setAssignmentError(null);
    setAssignmentMessage(null);
    try {
      await unassignReport(reportId);
      setReports((currentReports) =>
        currentReports.map((currentReport) =>
          getReportField(currentReport, 'reportId') === reportId
            ? withReportStatus(currentReport, 'unassigned')
            : currentReport
        )
      );
      setAssignmentMessage(`Report ${reportId} is now unassigned.`);
    } catch (updateError) {
      setAssignmentError(
        updateError instanceof Error ? updateError.message : 'Unable to unassign report'
      );
    } finally {
      setUpdatingReportId(null);
    }
  };

  return (
    <div className="space-y-6">
      {assignmentMessage ? (
        <div role="status" className="flex items-center gap-3 rounded-3xl border border-emerald-500/20 bg-emerald-500/5 p-4 text-sm text-emerald-300">
          <CheckCircle2 size={17} className="shrink-0" />
          <span>{assignmentMessage}</span>
        </div>
      ) : null}
      {addEmployerMessage ? (
        <div role="status" className="flex items-center gap-3 rounded-3xl border border-emerald-500/20 bg-emerald-500/5 p-4 text-sm text-emerald-300">
          <CheckCircle2 size={17} className="shrink-0" />
          <span>{addEmployerMessage}</span>
        </div>
      ) : null}

      <div className="grid gap-5 md:grid-cols-4">
        <div className="rounded-[32px] border border-white/10 bg-slate-950/80 p-6 shadow-panel md:col-span-2">
          <div className="flex items-center gap-4 text-slate-300">
            <Users size={20} />
            <div>
              <p className="text-sm uppercase tracking-[0.24em] text-slate-400">Employer users</p>
              <p className="mt-2 text-3xl font-semibold text-white">{loading ? '—' : employers.length}</p>
            </div>
          </div>
        </div>
        <div className="rounded-[32px] border border-white/10 bg-slate-950/80 p-6 shadow-panel md:col-span-2">
          <p className="text-sm uppercase tracking-[0.24em] text-slate-400">Data source</p>
          <p className="mt-3 text-base font-semibold text-white">GarbageGuardianUsers</p>
          <p className="mt-1 text-sm text-slate-400">Users identified by employeeId, employee role, or EMP-prefixed userId are displayed. Stored Employee ID is shown separately from the ID derived from userId.</p>
        </div>
      </div>

      <div className="rounded-[32px] border border-white/10 bg-slate-950/80 p-6 shadow-panel">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h3 className="text-2xl font-semibold text-white">Field Workforce Management</h3>
            <p className="mt-2 text-sm text-slate-400">Employer users from the existing mobile-app user directory.</p>
          </div>
          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              onClick={openAddEmployerForm}
              className="inline-flex items-center justify-center gap-2 rounded-3xl bg-brand-500 px-4 py-3 text-sm font-semibold text-white transition hover:bg-brand-400"
            >
              <Plus size={15} />
              Add Employer
            </button>
            <button
              type="button"
              onClick={() => setRefreshKey((key) => key + 1)}
              disabled={loading}
              className="inline-flex items-center justify-center gap-2 rounded-3xl border border-white/10 bg-slate-900/80 px-4 py-3 text-sm text-white transition hover:border-brand-400/40 hover:bg-slate-900 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <RefreshCw size={15} className={loading ? 'animate-spin' : ''} />
              Refresh
            </button>
          </div>
        </div>
      </div>

      <div className="rounded-[32px] border border-white/10 bg-slate-950/80 p-6 shadow-panel">
        <div className="mb-6 flex items-center justify-between gap-4">
          <div>
            <h4 className="text-xl font-semibold text-white">Employer Roster</h4>
            <p className="mt-2 text-sm text-slate-400">Showing user records matching the employee fields in the existing directory.</p>
          </div>
          <span className="rounded-full bg-slate-900/70 px-4 py-2 text-xs uppercase tracking-[0.24em] text-slate-400">
            {loading ? 'Loading...' : `${employers.length} records`}
          </span>
        </div>

        {error ? (
          <div role="alert" className="mb-4 flex items-start gap-3 rounded-3xl border border-rose-500/20 bg-rose-500/5 p-4 text-sm text-rose-300">
            <AlertCircle size={17} className="mt-0.5 shrink-0" />
            <span>{error}</span>
          </div>
        ) : null}

        <div className="overflow-hidden rounded-[28px] border border-white/10">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-white/10 text-left text-sm text-slate-300">
              <thead className="bg-slate-950/80 text-slate-400">
                <tr>
                  {columns.map((column) => (
                    <th key={column} scope="col" className="whitespace-nowrap px-4 py-3">
                      {formatLabel(column)}
                    </th>
                  ))}
                  <th scope="col" className="whitespace-nowrap px-4 py-3">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/10 bg-slate-900/70">
                {loading ? (
                  <tr>
                    <td colSpan={columns.length + 1} className="px-4 py-6 text-center text-slate-400">
                      Fetching employer users...
                    </td>
                  </tr>
                ) : error ? (
                  <tr>
                    <td colSpan={columns.length + 1} className="px-4 py-6 text-center text-slate-400">
                      Employer data could not be loaded.
                    </td>
                  </tr>
                ) : employers.length === 0 ? (
                  <tr>
                    <td colSpan={columns.length + 1} className="px-4 py-6 text-center text-slate-400">
                      No employee records found in the directory.
                    </td>
                  </tr>
                ) : (
                  employers.map((employer, index) => (
                    <tr key={String(employer.userId ?? employer.name ?? index)} className="hover:bg-slate-900/90">
                      {columns.map((column) => (
                        <td key={column} className="max-w-sm px-4 py-4 text-slate-300">
                          <span className="block max-w-sm truncate" title={formatValue(employer[column])}>
                            {formatValue(employer[column])}
                          </span>
                        </td>
                      ))}
                      <td className="px-4 py-4">
                        <button
                          type="button"
                          onClick={() => openAssignmentForm(employer)}
                          disabled={typeof employer.userId !== 'string' || !employer.userId.trim()}
                          className="inline-flex items-center gap-2 rounded-2xl bg-brand-500/15 px-3 py-2 text-sm font-medium text-brand-200 transition hover:bg-brand-500/25 disabled:cursor-not-allowed disabled:opacity-50"
                          title={typeof employer.userId === 'string' ? 'Assign a task' : 'This record has no userId'}
                        >
                          <Plus size={15} />
                          Assign
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {addFormOpen ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 p-4 backdrop-blur-sm"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget && !savingEmployer) setAddFormOpen(false);
          }}
        >
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="add-employer-title"
            className="w-full max-w-2xl rounded-[32px] border border-white/10 bg-slate-950 p-6 shadow-panel"
          >
            <div className="mb-6 flex items-start justify-between gap-4">
              <div>
                <p className="text-sm uppercase tracking-[0.24em] text-slate-400">Employer directory</p>
                <h3 id="add-employer-title" className="mt-2 text-2xl font-semibold text-white">Add Employer</h3>
                <p className="mt-2 text-sm text-slate-400">
                  This employee record will be saved to GarbageGuardianUsers.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setAddFormOpen(false)}
                disabled={savingEmployer}
                aria-label="Close add employer form"
                className="rounded-xl p-2 text-slate-400 transition hover:bg-white/5 hover:text-white disabled:opacity-50"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={(event) => void submitNewEmployer(event)} className="space-y-5">
              <div className="grid gap-4 sm:grid-cols-2">
                {([
                  ['userId', 'User ID *'],
                  ['employeeId', 'Employee ID *'],
                ] as const).map(([field, label]) => (
                  <label key={field} className="block space-y-2">
                    <span className="text-sm text-slate-300">{label} (auto-generated)</span>
                    <input
                      type="text"
                      value={
                        generatingEmployerIds
                          ? 'Generating...'
                          : newEmployer[field] || 'Unable to generate'
                      }
                      readOnly
                      required
                      aria-readonly="true"
                      className="w-full cursor-not-allowed rounded-2xl border border-white/10 bg-slate-900/60 px-4 py-3 text-sm text-slate-300 outline-none"
                    />
                  </label>
                ))}
                {([
                  ['name', 'Name'],
                  ['email', 'Email'],
                  ['phone', 'Phone'],
                  ['department', 'Department'],
                  ['password', 'Initial password'],
                ] as const).map(([field, label]) => (
                  <label key={field} className={`block space-y-2 ${field === 'password' ? 'sm:col-span-2' : ''}`}>
                    <span className="text-sm text-slate-300">{label}{['name', 'email', 'password'].includes(field) ? ' *' : ''}</span>
                    <input
                      type={field === 'email' ? 'email' : field === 'password' ? 'password' : 'text'}
                      value={newEmployer[field]}
                      onChange={(event) =>
                        setNewEmployer((current) => ({ ...current, [field]: event.target.value }))
                      }
                      required={['name', 'email', 'password'].includes(field)}
                      minLength={field === 'password' ? 8 : undefined}
                      autoComplete={field === 'password' ? 'new-password' : field === 'email' ? 'email' : 'off'}
                      className="w-full rounded-2xl border border-white/10 bg-slate-900 px-4 py-3 text-sm text-white outline-none transition placeholder:text-slate-500 focus:border-brand-400/50"
                    />
                  </label>
                ))}
              </div>

              {addEmployerError ? (
                <div role="alert" className="flex items-start gap-3 rounded-2xl border border-rose-500/20 bg-rose-500/5 p-4 text-sm text-rose-300">
                  <AlertCircle size={17} className="mt-0.5 shrink-0" />
                  <span>{addEmployerError}</span>
                </div>
              ) : null}

              <div className="flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => void refreshGeneratedEmployerIds()}
                  disabled={savingEmployer || generatingEmployerIds}
                  className="mr-auto rounded-2xl border border-white/10 px-4 py-3 text-sm text-slate-300 transition hover:bg-white/5 disabled:opacity-50"
                >
                  {generatingEmployerIds ? 'Generating IDs...' : 'Generate new IDs'}
                </button>
                <button
                  type="button"
                  onClick={() => setAddFormOpen(false)}
                  disabled={savingEmployer}
                  className="rounded-2xl border border-white/10 px-4 py-3 text-sm text-slate-300 transition hover:bg-white/5 disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={
                    savingEmployer ||
                    generatingEmployerIds ||
                    !newEmployer.userId ||
                    !newEmployer.employeeId
                  }
                  className="inline-flex items-center gap-2 rounded-2xl bg-brand-500 px-4 py-3 text-sm font-semibold text-white transition hover:bg-brand-400 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {savingEmployer ? <LoaderCircle size={15} className="animate-spin" /> : <Plus size={15} />}
                  {savingEmployer ? 'Adding...' : 'Add Employer'}
                </button>
              </div>
            </form>
          </section>
        </div>
      ) : null}

      {assignmentEmployer ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 p-4 backdrop-blur-sm"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget && !updatingReportId) setAssignmentEmployer(null);
          }}
        >
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="assign-task-title"
            className="w-full max-w-xl rounded-[32px] border border-white/10 bg-slate-950 p-6 shadow-panel"
          >
            <div className="mb-6 flex items-start justify-between gap-4">
              <div>
                <p className="text-sm uppercase tracking-[0.24em] text-slate-400">Employer assignment</p>
                <h3 id="assign-task-title" className="mt-2 text-2xl font-semibold text-white">Assign a report</h3>
                <p className="mt-2 text-sm text-slate-400">
                  For {formatValue(assignmentEmployer.name)} · {assignmentEmployer.userId}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setAssignmentEmployer(null)}
                disabled={Boolean(updatingReportId)}
                aria-label="Close report assignment form"
                className="rounded-xl p-2 text-slate-400 transition hover:bg-white/5 hover:text-white disabled:opacity-50"
              >
                <X size={18} />
              </button>
            </div>

            <div className="space-y-5">
              <p className="text-sm text-slate-400">
                Select a report to create an assigned task for this employer.
              </p>
              {reportsLoading ? (
                <div className="flex items-center justify-center gap-2 rounded-2xl border border-white/10 bg-slate-900/60 p-8 text-sm text-slate-400">
                  <LoaderCircle size={16} className="animate-spin" />
                  Loading reports...
                </div>
              ) : reportsError ? (
                <div role="alert" className="flex items-start gap-3 rounded-2xl border border-rose-500/20 bg-rose-500/5 p-4 text-sm text-rose-300">
                  <AlertCircle size={17} className="mt-0.5 shrink-0" />
                  <span>{reportsError}</span>
                </div>
              ) : reports.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-white/10 p-8 text-center text-sm text-slate-400">
                  No reports are available to assign.
                </div>
              ) : (
                <div className="max-h-[50vh] overflow-auto rounded-2xl border border-white/10">
                  <table className="min-w-full divide-y divide-white/10 text-left text-sm text-slate-300">
                    <thead className="sticky top-0 bg-slate-950 text-xs uppercase tracking-wider text-slate-400">
                      <tr>
                        {['reportId', 'location', 'createdAt', 'binId', 'issueType', 'status'].map((field) => (
                          <th key={field} scope="col" className="whitespace-nowrap px-4 py-3">
                            {field === 'reportId'
                              ? 'Report ID'
                              : field === 'binId'
                                ? 'Bin ID'
                                : field === 'issueType'
                                  ? 'Issue Type'
                                  : formatLabel(field)}
                          </th>
                        ))}
                        <th scope="col" className="whitespace-nowrap px-4 py-3">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/10 bg-slate-900/70">
                      {reports.map((report, index) => {
                        const reportId = getReportField(report, 'reportId');
                        const alreadyAssigned = isReportAssigned(report);
                        const rowIsAssigning =
                          typeof reportId === 'string' && updatingReportId === reportId;
                        return (
                          <tr key={typeof reportId === 'string' ? reportId : index}>
                            {['reportId', 'location', 'createdAt', 'binId', 'issueType', 'status'].map((field) => (
                              <td key={field} className="max-w-xs whitespace-nowrap px-4 py-3">
                                <span className="block max-w-xs truncate" title={formatValue(getReportField(report, field))}>
                                  {formatValue(getReportField(report, field))}
                                </span>
                              </td>
                            ))}
                            <td className="px-4 py-3">
                              <button
                                type="button"
                                onClick={() =>
                                  void (alreadyAssigned
                                    ? unassignReportFromEmployer(report)
                                    : assignReport(report))
                                }
                                disabled={
                                  Boolean(updatingReportId) ||
                                  typeof reportId !== 'string' ||
                                  !reportId.trim()
                                }
                                className={`inline-flex items-center gap-2 rounded-xl px-3 py-2 text-xs font-semibold transition disabled:cursor-not-allowed disabled:opacity-50 ${
                                  alreadyAssigned
                                    ? 'border border-amber-500/20 bg-amber-500/10 text-amber-200 hover:bg-amber-500/20'
                                    : 'bg-brand-500/15 text-brand-200 hover:bg-brand-500/25'
                                }`}
                              >
                                {rowIsAssigning ? <LoaderCircle size={14} className="animate-spin" /> : null}
                                {rowIsAssigning
                                  ? alreadyAssigned
                                    ? 'Unassigning...'
                                    : 'Assigning...'
                                  : alreadyAssigned
                                    ? 'Unassign'
                                    : 'Assign'}
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
              {assignmentError ? (
                <div role="alert" className="flex items-start gap-3 rounded-2xl border border-rose-500/20 bg-rose-500/5 p-4 text-sm text-rose-300">
                  <AlertCircle size={17} className="mt-0.5 shrink-0" />
                  <span>{assignmentError}</span>
                </div>
              ) : null}
              {assignmentMessage ? (
                <div role="status" className="flex items-center gap-3 rounded-2xl border border-emerald-500/20 bg-emerald-500/5 p-4 text-sm text-emerald-300">
                  <CheckCircle2 size={17} className="shrink-0" />
                  <span>{assignmentMessage}</span>
                </div>
              ) : null}
              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={() => setAssignmentEmployer(null)}
                  disabled={Boolean(updatingReportId)}
                  className="rounded-2xl border border-white/10 px-4 py-3 text-sm text-slate-300 transition hover:bg-white/5 disabled:opacity-50"
                >
                  Close
                </button>
              </div>
            </div>
          </section>
        </div>
      ) : null}
    </div>
  );
}

export default EmployersPage;
