import { useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  ChevronDown,
  CircleDashed,
  ClipboardList,
  Clock,
  FileText,
  Filter,
  Loader2,
  Plus,
  Trash2,
  User,
  X,
  XCircle,
} from 'lucide-react';
import { createTask, deleteTask, fetchTasks, updateTaskStatus } from '../services/taskService';
import { fetchEmployers } from '../services/employerService';
import { fetchReports } from '../services/reportService';
import { useSmartBinContext } from '../context/SmartBinContext';
import { useNotifications } from '../context/NotificationContext';
import { dataCache } from '../services/dataCache';
import type { Task, TaskPriority } from '../types/task';
import type { Employer } from '../types/employer';
import type { ReportRecord } from '../services/reportService';

/* ── Helpers ────────────────────────────────────────────────────── */

const priorityOrder: TaskPriority[] = ['critical', 'high', 'medium', 'low'];

const priorityMeta: Record<string, { label: string; classes: string; dot: string }> = {
  critical: {
    label: 'Critical',
    classes: 'bg-rose-500/10 text-rose-300 ring-1 ring-rose-500/20',
    dot: 'bg-rose-400',
  },
  high: {
    label: 'High',
    classes: 'bg-amber-500/10 text-amber-300 ring-1 ring-amber-500/20',
    dot: 'bg-amber-400',
  },
  medium: {
    label: 'Medium',
    classes: 'bg-brand-500/10 text-brand-300 ring-1 ring-brand-500/20',
    dot: 'bg-brand-400',
  },
  low: {
    label: 'Low',
    classes: 'bg-slate-500/10 text-slate-400 ring-1 ring-slate-500/20',
    dot: 'bg-slate-500',
  },
};

const statusMeta: Record<string, { label: string; classes: string; icon: JSX.Element }> = {
  pending: {
    label: 'Pending',
    classes: 'bg-slate-700/60 text-slate-300 ring-1 ring-slate-500/20',
    icon: <CircleDashed size={12} />,
  },
  unassigned: {
    label: 'Unassigned',
    classes: 'bg-slate-700/60 text-slate-300 ring-1 ring-slate-500/20',
    icon: <CircleDashed size={12} />,
  },
  assigned: {
    label: 'Assigned',
    classes: 'bg-indigo-500/10 text-indigo-300 ring-1 ring-indigo-500/20',
    icon: <User size={12} />,
  },
  'in-progress': {
    label: 'In Progress',
    classes: 'bg-blue-500/10 text-blue-300 ring-1 ring-blue-500/20',
    icon: <Loader2 size={12} className="animate-spin" />,
  },
  completed: {
    label: 'Completed',
    classes: 'bg-emerald-500/10 text-emerald-300 ring-1 ring-emerald-500/20',
    icon: <CheckCircle2 size={12} />,
  },
  cancelled: {
    label: 'Cancelled',
    classes: 'bg-rose-500/10 text-rose-300 ring-1 ring-rose-500/20',
    icon: <XCircle size={12} />,
  },
};

const getPriorityMeta = (priority?: string) => {
  const p = String(priority || '').toLowerCase().trim();
  return priorityMeta[p] ?? priorityMeta.medium;
};

const getStatusMeta = (status?: string) => {
  const s = String(status || '').toLowerCase().trim();
  return statusMeta[s] ?? statusMeta.pending;
};

const binStatusMeta: Record<string, { label: string; color: string }> = {
  full: { label: 'Full', color: 'text-rose-400' },
  warning: { label: 'Warning', color: 'text-amber-400' },
  offline: { label: 'Offline', color: 'text-slate-400' },
  online: { label: 'Online', color: 'text-emerald-400' },
  normal: { label: 'Normal', color: 'text-emerald-400' },
};

function fmtDate(iso: string | null): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

/* ── Sub-components ─────────────────────────────────────────────── */

function Badge({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold ${className ?? ''}`}>
      {children}
    </span>
  );
}

function StatCard({
  label,
  value,
  icon,
  color,
}: {
  label: string;
  value: number;
  icon: React.ReactNode;
  color: string;
}) {
  return (
    <div className="flex items-center gap-4 rounded-xl border border-white/[0.06] bg-slate-900 p-4">
      <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${color}`}>
        {icon}
      </div>
      <div>
        <p className="text-2xl font-bold text-white">{value}</p>
        <p className="text-xs text-slate-400">{label}</p>
      </div>
    </div>
  );
}

/* ── Assign Task Modal ──────────────────────────────────────────── */

type AssignMode = 'report' | 'bin' | 'none';

interface AssignModalProps {
  employees: Employer[];
  reports: ReportRecord[];
  bins: import('../types/smartbin').SmartBinData[];
  onClose: () => void;
  onAssigned: (task: Task) => void;
}

function AssignTaskModal({ employees, reports, bins, onClose, onAssigned }: AssignModalProps) {
  const [mode, setMode] = useState<AssignMode>('none');
  const [selectedEmployee, setSelectedEmployee] = useState('');
  const [selectedReport, setSelectedReport] = useState('');
  const [selectedBin, setSelectedBin] = useState('');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState<TaskPriority>('medium');
  const [dueDate, setDueDate] = useState('');
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Derive selected objects
  const getEmpId = (e: Employer) => (e._id || e.userId || e.employeeId || '');
  const employee = employees.find((e) => getEmpId(e) === selectedEmployee);
  const report = reports.find((r) => r.reportId === selectedReport);
  const bin = bins.find((b) => b.deviceId === selectedBin);

  // Auto-fill title based on selection
  useEffect(() => {
    if (mode === 'report' && report) {
      setTitle(`Inspect report: ${String(report.reportId)}`);
    } else if (mode === 'bin' && bin) {
      setTitle(`Service bin at ${bin.location}`);
    }
  }, [mode, report, bin]);

  const availableEmployees = employees.filter((e) => !e.status || e.status === 'available');

  const handleSubmit = async () => {
    if (!title.trim()) return setError('Title is required');
    if (!selectedEmployee) return setError('Please select an employee');

    setSaving(true);
    setError(null);

    try {
      const payload = {
        title: title.trim(),
        description: description.trim(),
        employeeId: getEmpId(employee!),
        employeeName: employee!.name || 'Employee',
        employeeEmail: employee!.email || '',
        employeeRole: employee!.role || 'employee',
        reportId: mode === 'report' && report ? String(report.reportId) : null,
        reportTitle: mode === 'report' && report ? String(report.reportId) : null,
        binId: mode === 'bin' && bin ? bin.deviceId : null,
        binLocation: mode === 'bin' && bin ? bin.location : null,
        binStatus: mode === 'bin' && bin ? bin.status : null,
        binFillLevel: mode === 'bin' && bin ? bin.fillLevel : null,
        priority,
        dueDate: dueDate || null,
        notes: notes.trim(),
      };
      const created = await createTask(payload);
      onAssigned(created);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setSaving(false);
    }
  };

  const inputCls =
    'w-full rounded-lg border border-white/[0.08] bg-white/[0.04] px-3 py-2 text-sm text-slate-200 outline-none placeholder:text-slate-600 focus:border-brand-500/50 focus:ring-1 focus:ring-brand-500/20 transition';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="relative w-full max-w-xl overflow-hidden rounded-2xl border border-white/[0.08] bg-slate-900 shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-white/[0.06] px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand-500/10">
              <ClipboardList size={18} className="text-brand-400" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-white">Assign Task</h2>
              <p className="text-xs text-slate-400">Create and assign a task to an employee</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 transition hover:bg-white/[0.06] hover:text-slate-200"
          >
            <X size={16} />
          </button>
        </div>

        {/* Body */}
        <div className="max-h-[75vh] overflow-y-auto px-6 py-5 space-y-5">
          {/* Assignment mode */}
          <div>
            <label className="mb-1.5 block text-xs font-medium text-slate-400">Assignment Type</label>
            <div className="grid grid-cols-3 gap-2">
              {(
                [
                  { value: 'none', label: 'Manual', icon: <User size={14} /> },
                  { value: 'report', label: 'Based on Report', icon: <FileText size={14} /> },
                  { value: 'bin', label: 'Based on Bin Status', icon: <AlertTriangle size={14} /> },
                ] as { value: AssignMode; label: string; icon: React.ReactNode }[]
              ).map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setMode(opt.value)}
                  className={`flex flex-col items-center gap-1.5 rounded-lg border py-3 text-xs font-medium transition ${
                    mode === opt.value
                      ? 'border-brand-500/60 bg-brand-500/10 text-brand-300'
                      : 'border-white/[0.06] bg-white/[0.02] text-slate-400 hover:border-white/[0.12] hover:text-slate-200'
                  }`}
                >
                  {opt.icon}
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* Employee selector */}
          <div>
            <label className="mb-1.5 block text-xs font-medium text-slate-400">
              Assign To <span className="text-rose-400">*</span>
            </label>
            <select
              value={selectedEmployee}
              onChange={(e) => setSelectedEmployee(e.target.value)}
              className={inputCls}
            >
              <option value="">— Select employee —</option>
              {availableEmployees.map((emp) => {
                const id = getEmpId(emp);
                return (
                  <option key={id} value={id}>
                    {emp.name || id} · {emp.role || 'Employee'}
                  </option>
                );
              })}
              {availableEmployees.length === 0 && (
                <option disabled>No available employees</option>
              )}
            </select>
            {availableEmployees.length === 0 && (
              <p className="mt-1 text-xs text-amber-400">All employees are currently assigned or off-duty.</p>
            )}
          </div>

          {/* Report selector */}
          {mode === 'report' && (
            <div>
              <label className="mb-1.5 block text-xs font-medium text-slate-400">
                Select Report <span className="text-rose-400">*</span>
              </label>
              <select
                value={selectedReport}
                onChange={(e) => setSelectedReport(e.target.value)}
                className={inputCls}
              >
                <option value="">— Select report —</option>
                {reports.map((r) => (
                  <option key={r.reportId} value={r.reportId}>
                    {String(r.reportId)}{r.location ? ` · ${String(r.location)}` : ''}
                    {r.deviceId ? ` · ${String(r.deviceId)}` : ''}
                  </option>
                ))}
              </select>
              {report && (
                <div className="mt-2 rounded-lg border border-white/[0.06] bg-white/[0.02] p-3 space-y-1 text-xs text-slate-400">
                  {report.deviceId != null && <p><span className="text-slate-300">Device:</span> {String(report.deviceId)}</p>}
                  {report.location != null && <p><span className="text-slate-300">Location:</span> {String(report.location)}</p>}
                  {report.level != null && <p><span className="text-slate-300">Fill Level:</span> {String(report.level)}%</p>}
                  {report.timestamp != null && <p><span className="text-slate-300">Time:</span> {fmtDate(String(report.timestamp))}</p>}
                </div>
              )}
            </div>
          )}

          {/* Bin selector */}
          {mode === 'bin' && (
            <div>
              <label className="mb-1.5 block text-xs font-medium text-slate-400">
                Select Bin <span className="text-rose-400">*</span>
              </label>
              <select
                value={selectedBin}
                onChange={(e) => setSelectedBin(e.target.value)}
                className={inputCls}
              >
                <option value="">— Select bin —</option>
                {bins.map((b) => (
                  <option key={b.deviceId} value={b.deviceId}>
                    {b.deviceId} · {b.location} · {b.fillLevel}% ({b.status})
                  </option>
                ))}
              </select>
              {bin && (
                <div className="mt-2 rounded-lg border border-white/[0.06] bg-white/[0.02] p-3 space-y-1 text-xs text-slate-400">
                  <p>
                    <span className="text-slate-300">Status:</span>{' '}
                    <span className={binStatusMeta[bin.status]?.color ?? 'text-slate-300'}>
                      {binStatusMeta[bin.status]?.label ?? bin.status}
                    </span>
                  </p>
                  <p><span className="text-slate-300">Fill Level:</span> {bin.fillLevel}%</p>
                  <p><span className="text-slate-300">Location:</span> {bin.location}</p>
                  {bin.temperature !== undefined && (
                    <p><span className="text-slate-300">Temp:</span> {bin.temperature}°C</p>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Title */}
          <div>
            <label className="mb-1.5 block text-xs font-medium text-slate-400">
              Task Title <span className="text-rose-400">*</span>
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Collect waste from Sector 4"
              className={inputCls}
            />
          </div>

          {/* Description */}
          <div>
            <label className="mb-1.5 block text-xs font-medium text-slate-400">Description</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Provide details about this task…"
              rows={3}
              className={`${inputCls} resize-none`}
            />
          </div>

          {/* Priority + Due Date row */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1.5 block text-xs font-medium text-slate-400">Priority</label>
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value as TaskPriority)}
                className={inputCls}
              >
                {priorityOrder.map((p) => (
                  <option key={p} value={p}>
                    {priorityMeta[p].label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-medium text-slate-400">Due Date</label>
              <input
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className={inputCls}
              />
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="mb-1.5 block text-xs font-medium text-slate-400">Additional Notes</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Any extra instructions or context…"
              rows={2}
              className={`${inputCls} resize-none`}
            />
          </div>

          {/* Error */}
          {error && (
            <div className="rounded-lg border border-rose-500/20 bg-rose-500/5 px-3 py-2 text-sm text-rose-300">
              {error}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-3 border-t border-white/[0.06] px-6 py-4">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg px-4 py-2 text-sm text-slate-400 transition hover:bg-white/[0.06] hover:text-slate-200"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={saving}
            className="flex items-center gap-2 rounded-lg bg-brand-500 px-5 py-2 text-sm font-semibold text-white transition hover:bg-brand-400 disabled:opacity-60"
          >
            {saving ? <Loader2 size={14} className="animate-spin" /> : <ClipboardList size={14} />}
            {saving ? 'Assigning…' : 'Assign Task'}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ── Task Card ──────────────────────────────────────────────────── */

function TaskCard({
  task,
  onStatusChange,
  onDelete,
}: {
  task: Task;
  onStatusChange: (id: string, status: Task['status']) => void;
  onDelete: (id: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const pm = getPriorityMeta(task.priority);
  const sm = getStatusMeta(task.status);

  return (
    <div className="rounded-xl border border-white/[0.06] bg-slate-900 p-4 transition hover:border-white/[0.10]">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2 mb-1.5">
            <Badge className={pm.classes}>
              <span className={`h-1.5 w-1.5 rounded-full ${pm.dot}`} />
              {pm.label}
            </Badge>
            <Badge className={sm.classes}>
              {sm.icon}
              {sm.label}
            </Badge>
          </div>
          <h3 className="truncate text-sm font-semibold text-white">{task.title}</h3>
          {task.description && (
            <p className="mt-1 text-xs text-slate-400 line-clamp-2">{task.description}</p>
          )}
        </div>

        <div className="flex shrink-0 items-center gap-1">
          {/* Status dropdown */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setOpen((o) => !o)}
              className="flex items-center gap-1 rounded-lg border border-white/[0.06] bg-white/[0.04] px-2.5 py-1.5 text-xs text-slate-300 transition hover:bg-white/[0.08]"
            >
              Update <ChevronDown size={11} />
            </button>
            {open && (
              <div className="absolute right-0 top-full z-20 mt-1 w-36 rounded-xl border border-white/[0.08] bg-slate-800 shadow-xl">
                {(['pending', 'in-progress', 'completed', 'cancelled'] as Task['status'][]).map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => { onStatusChange(task._id, s); setOpen(false); }}
                    className={`flex w-full items-center gap-2 px-3 py-2 text-xs transition hover:bg-white/[0.06] ${
                      task.status === s ? 'text-brand-300' : 'text-slate-300'
                    }`}
                  >
                    {statusMeta[s]?.icon ?? statusMeta.pending.icon}
                    {statusMeta[s]?.label ?? s}
                  </button>
                ))}
              </div>
            )}
          </div>
          <button
            type="button"
            onClick={() => onDelete(task._id)}
            className="rounded-lg p-1.5 text-slate-500 transition hover:bg-rose-500/10 hover:text-rose-400"
            title="Delete task"
          >
            <Trash2 size={13} />
          </button>
        </div>
      </div>

      {/* Meta row */}
      <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-slate-500">
        <span className="flex items-center gap-1">
          <User size={11} />
          {task.employeeName}
          {task.employeeRole && ` · ${task.employeeRole}`}
        </span>
        {task.binLocation && (
          <span className="flex items-center gap-1">
            <AlertTriangle size={11} />
            {task.binLocation}
            {task.binFillLevel !== null && ` · ${task.binFillLevel}%`}
          </span>
        )}
        {task.reportId && (
          <span className="flex items-center gap-1">
            <FileText size={11} />
            Report: {task.reportId}
          </span>
        )}
        {task.dueDate && (
          <span className="flex items-center gap-1">
            <Clock size={11} />
            Due: {fmtDate(task.dueDate)}
          </span>
        )}
      </div>
    </div>
  );
}

/* ── Main Page ──────────────────────────────────────────────────── */

function TasksPage() {
  const { refreshNotifications } = useNotifications();
  const { state: binState } = useSmartBinContext();
  const bins = binState.data?.bins ?? [];

  const [tasks, setTasks] = useState<Task[]>(() => dataCache.getTasks() || []);
  const [employees, setEmployees] = useState<Employer[]>(() => dataCache.getEmployers() || []);
  const [reports, setReports] = useState<ReportRecord[]>(() => dataCache.getReports() || []);
  const [loading, setLoading] = useState(() => !dataCache.hasTasks());
  const [error, setError] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [filterStatus, setFilterStatus] = useState<Task['status'] | 'all'>('all');
  const [filterPriority, setFilterPriority] = useState<TaskPriority | 'all'>('all');

  /* load */
  const loadAll = async () => {
    if (!dataCache.hasTasks()) {
      setLoading(true);
    }
    try {
      const [t, e, r] = await Promise.all([fetchTasks(), fetchEmployers(), fetchReports()]);
      setTasks(Array.isArray(t) ? t : []);
      setEmployees(Array.isArray(e) ? e : []);
      setReports(Array.isArray(r) ? r : []);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadAll(); }, []);

  const safeTasks = Array.isArray(tasks) ? tasks : [];

  /* derived */
  const summary = useMemo(
    () => ({
      total: safeTasks.length,
      pending: safeTasks.filter((t) => t.status === 'pending' || t.status === 'unassigned').length,
      inProgress: safeTasks.filter((t) => t.status === 'in-progress' || t.status === 'assigned').length,
      completed: safeTasks.filter((t) => t.status === 'completed').length,
    }),
    [safeTasks]
  );

  const filtered = useMemo(() => {
    return safeTasks.filter((t) => {
      const normStatus = t.status === 'unassigned' ? 'pending' : t.status === 'assigned' ? 'in-progress' : t.status;
      const matchStatus = filterStatus === 'all' || t.status === filterStatus || normStatus === filterStatus;
      const matchPriority = filterPriority === 'all' || (t.priority || 'medium').toLowerCase() === filterPriority;
      return matchStatus && matchPriority;
    });
  }, [safeTasks, filterStatus, filterPriority]);

  /* handlers */
  const handleAssigned = (task: Task) => {
    setTasks((prev) => [task, ...prev]);
    setShowModal(false);
    void refreshNotifications();
  };

  const handleStatusChange = async (id: string, status: Task['status']) => {
    try {
      const updated = await updateTaskStatus(id, status);
      setTasks((prev) => prev.map((t) => (t._id === id ? updated : t)));
      void refreshNotifications();
    } catch {
      /* silently ignore */
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Delete this task?')) return;
    try {
      await deleteTask(id);
      setTasks((prev) => prev.filter((t) => t._id !== id));
    } catch {
      /* silently ignore */
    }
  };

  const selectCls =
    'rounded-lg border border-white/[0.08] bg-white/[0.04] px-3 py-1.5 text-xs text-slate-300 outline-none focus:border-brand-500/50 transition';

  return (
    <div className="space-y-6">
      {/* ── Header ─────────────────────────────────────────────── */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-white">Task Management</h1>
          <p className="mt-0.5 text-sm text-slate-400">
            Assign and track field tasks for your workforce
          </p>
        </div>
        <button
          type="button"
          onClick={() => setShowModal(true)}
          className="flex items-center gap-2 rounded-xl bg-brand-500 px-4 py-2.5 text-sm font-semibold text-white shadow-glow transition hover:bg-brand-400"
        >
          <Plus size={16} />
          Assign Task
        </button>
      </div>

      {/* ── Stat Cards ─────────────────────────────────────────── */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatCard label="Total Tasks" value={summary.total} icon={<ClipboardList size={18} className="text-brand-400" />} color="bg-brand-500/10" />
        <StatCard label="Pending" value={summary.pending} icon={<CircleDashed size={18} className="text-slate-400" />} color="bg-slate-700/40" />
        <StatCard label="In Progress" value={summary.inProgress} icon={<Loader2 size={18} className="text-blue-400" />} color="bg-blue-500/10" />
        <StatCard label="Completed" value={summary.completed} icon={<CheckCircle2 size={18} className="text-emerald-400" />} color="bg-emerald-500/10" />
      </div>

      {/* ── Filters ────────────────────────────────────────────── */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2 text-xs text-slate-400">
          <Filter size={13} />
          Filters:
        </div>
        <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value as Task['status'] | 'all')} className={selectCls}>
          <option value="all">All Statuses</option>
          {(Object.keys(statusMeta) as Task['status'][]).map((s) => (
            <option key={s} value={s}>{statusMeta[s].label}</option>
          ))}
        </select>
        <select value={filterPriority} onChange={(e) => setFilterPriority(e.target.value as TaskPriority | 'all')} className={selectCls}>
          <option value="all">All Priorities</option>
          {priorityOrder.map((p) => (
            <option key={p} value={p}>{priorityMeta[p].label}</option>
          ))}
        </select>
        {(filterStatus !== 'all' || filterPriority !== 'all') && (
          <button
            type="button"
            onClick={() => { setFilterStatus('all'); setFilterPriority('all'); }}
            className="flex items-center gap-1 text-xs text-slate-500 transition hover:text-slate-300"
          >
            <X size={12} /> Clear
          </button>
        )}
        <span className="ml-auto text-xs text-slate-500">{filtered.length} task{filtered.length !== 1 ? 's' : ''}</span>
      </div>

      {/* ── Content ────────────────────────────────────────────── */}
      {loading && tasks.length === 0 ? (
        <div className="flex items-center justify-center py-20 text-slate-500">
          <Loader2 size={24} className="animate-spin mr-3" />
          Loading tasks…
        </div>
      ) : error && tasks.length === 0 ? (
        <div className="rounded-xl border border-rose-500/20 bg-rose-500/5 p-6 text-center text-sm text-rose-300">
          {error}
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-white/[0.08] py-20 text-slate-500">
          <ClipboardList size={36} className="mb-3 opacity-30" />
          <p className="text-sm font-medium">No tasks found</p>
          <p className="mt-1 text-xs">
            {tasks.length === 0
              ? 'Click "Assign Task" to create your first task.'
              : 'Try clearing the filters.'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
          {filtered.map((task) => (
            <TaskCard
              key={task._id}
              task={task}
              onStatusChange={handleStatusChange}
              onDelete={handleDelete}
            />
          ))}
        </div>
      )}

      {/* ── Assign Modal ────────────────────────────────────────── */}
      {showModal && (
        <AssignTaskModal
          employees={employees}
          reports={reports}
          bins={bins}
          onClose={() => setShowModal(false)}
          onAssigned={handleAssigned}
        />
      )}
    </div>
  );
}

export default TasksPage;
