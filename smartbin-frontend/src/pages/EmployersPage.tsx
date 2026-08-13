import { useEffect, useMemo, useState } from 'react';
import { Briefcase, CheckCircle2, CircleDashed, Edit3, Plus, Trash2, Users } from 'lucide-react';
import { createEmployer, deleteEmployer, fetchEmployers, updateEmployer } from '../services/employerService';
import type { Employer, EmployerRequest } from '../types/employer';
import { employerRoles, employerStatusOptions } from '../types/employer';

const defaultForm: EmployerRequest = {
  name: '',
  role: employerRoles[0],
  email: '',
  phone: '',
  location: '',
  status: 'available',
  notes: '',
};

const statusLabel = (status: Employer['status']) => {
  switch (status) {
    case 'available':
      return 'Available';
    case 'assigned':
      return 'Assigned';
    case 'off-duty':
      return 'Off Duty';
    default:
      return status;
  }
};

const statusClasses = (status: Employer['status']) => {
  switch (status) {
    case 'available':
      return 'bg-emerald-500/10 text-emerald-300 ring-1 ring-emerald-500/20';
    case 'assigned':
      return 'bg-amber-500/10 text-amber-300 ring-1 ring-amber-500/20';
    case 'off-duty':
      return 'bg-slate-700/60 text-slate-200 ring-1 ring-slate-500/20';
    default:
      return 'bg-slate-700/60 text-slate-200 ring-1 ring-slate-500/20';
  }
};

function EmployersPage() {
  const [employers, setEmployers] = useState<Employer[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [formState, setFormState] = useState<EmployerRequest>(defaultForm);
  const [editingId, setEditingId] = useState<string | null>(null);

  const loadEmployers = async () => {
    setLoading(true);
    try {
      const data = await fetchEmployers();
      setEmployers(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadEmployers();
  }, []);

  const summary = useMemo(
    () => ({
      total: employers.length,
      available: employers.filter((item) => item.status === 'available').length,
      assigned: employers.filter((item) => item.status === 'assigned').length,
      offDuty: employers.filter((item) => item.status === 'off-duty').length,
    }),
    [employers]
  );

  const resetForm = () => {
    setEditingId(null);
    setFormState(defaultForm);
    setMessage(null);
    setError(null);
  };

  const handleSave = async () => {
    setError(null);
    setMessage(null);
    if (!formState.name.trim() || !formState.email.trim() || !formState.phone.trim()) {
      setError('Name, email, and phone are required.');
      return;
    }

    setSaving(true);
    try {
      const payload: EmployerRequest = {
        name: formState.name,
        role: formState.role,
        email: formState.email,
        phone: formState.phone,
        location: formState.location,
        status: formState.status,
        notes: formState.notes,
      };

      const updated = editingId
        ? await updateEmployer(editingId, payload)
        : await createEmployer(payload);

      setMessage(editingId ? 'Employer updated successfully.' : 'Employer added successfully.');
      setEmployers((current) => {
        if (editingId) {
          return current.map((item) => (item._id === updated._id ? updated : item));
        }
        return [updated, ...current];
      });
      resetForm();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = (employer: Employer) => {
    setEditingId(employer._id);
    setFormState({
      name: employer.name,
      role: employer.role,
      email: employer.email,
      phone: employer.phone,
      location: employer.location ?? '',
      status: employer.status,
      notes: employer.notes ?? '',
    });
    setMessage(null);
    setError(null);
  };

  const handleDelete = async (id: string) => {
    const confirmed = window.confirm('Remove this employer from the workforce list?');
    if (!confirmed) return;
    try {
      await deleteEmployer(id);
      setEmployers((current) => current.filter((item) => item._id !== id));
      setMessage('Employer removed successfully.');
      if (editingId === id) {
        resetForm();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    }
  };

  return (
    <div className="space-y-6">
      <div className="grid gap-5 md:grid-cols-4">
        <div className="rounded-[32px] border border-white/10 bg-slate-950/80 p-6 shadow-panel">
          <div className="flex items-center gap-4 text-slate-300">
            <Users size={20} />
            <div>
              <p className="text-sm uppercase tracking-[0.24em] text-slate-400">Workforce</p>
              <p className="mt-2 text-3xl font-semibold text-white">{summary.total}</p>
            </div>
          </div>
        </div>
        <div className="rounded-[32px] border border-white/10 bg-slate-950/80 p-6 shadow-panel">
          <div className="flex items-center gap-4 text-slate-300">
            <CheckCircle2 size={20} />
            <div>
              <p className="text-sm uppercase tracking-[0.24em] text-slate-400">Available</p>
              <p className="mt-2 text-3xl font-semibold text-white">{summary.available}</p>
            </div>
          </div>
        </div>
        <div className="rounded-[32px] border border-white/10 bg-slate-950/80 p-6 shadow-panel">
          <div className="flex items-center gap-4 text-slate-300">
            <Briefcase size={20} />
            <div>
              <p className="text-sm uppercase tracking-[0.24em] text-slate-400">Assigned</p>
              <p className="mt-2 text-3xl font-semibold text-white">{summary.assigned}</p>
            </div>
          </div>
        </div>
        <div className="rounded-[32px] border border-white/10 bg-slate-950/80 p-6 shadow-panel">
          <div className="flex items-center gap-4 text-slate-300">
            <CircleDashed size={20} />
            <div>
              <p className="text-sm uppercase tracking-[0.24em] text-slate-400">Off Duty</p>
              <p className="mt-2 text-3xl font-semibold text-white">{summary.offDuty}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="rounded-[32px] border border-white/10 bg-slate-950/80 p-6 shadow-panel">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h3 className="text-2xl font-semibold text-white">Field Workforce Management</h3>
            <p className="mt-2 text-sm text-slate-400">Add, update, and view your on-field workers with real-time status and assignment details.</p>
          </div>
          <button
            type="button"
            onClick={resetForm}
            className="inline-flex items-center justify-center gap-2 rounded-3xl border border-white/10 bg-slate-900/80 px-4 py-3 text-sm text-white transition hover:border-brand-400/40 hover:bg-slate-900"
          >
            <Plus size={16} /> New Employer
          </button>
        </div>
      </div>

      <div className="grid gap-5 xl:grid-cols-[1.4fr_0.85fr]">
        <div className="rounded-[32px] border border-white/10 bg-slate-950/80 p-6 shadow-panel">
          <div className="mb-6 flex items-center justify-between gap-4">
            <div>
              <h4 className="text-xl font-semibold text-white">Employer Roster</h4>
              <p className="mt-2 text-sm text-slate-400">Track who is free for work, assigned to routes, or currently off duty.</p>
            </div>
            <span className="rounded-full bg-slate-900/70 px-4 py-2 text-xs uppercase tracking-[0.24em] text-slate-400">{loading ? 'Loading...' : `${employers.length} records`}</span>
          </div>

          {message || error ? (
            <div className="mb-4 rounded-3xl border border-white/10 bg-slate-900/80 p-4 text-sm text-slate-200">
              {message ? <p className="text-emerald-300">{message}</p> : null}
              {error ? <p className="text-rose-300">{error}</p> : null}
            </div>
          ) : null}

          <div className="overflow-hidden rounded-[28px] border border-white/10">
            <table className="min-w-full divide-y divide-white/10 text-sm text-left text-slate-300">
              <thead className="bg-slate-950/80 text-slate-400">
                <tr>
                  <th className="px-4 py-3">Name</th>
                  <th className="px-4 py-3">Role</th>
                  <th className="px-4 py-3">Email</th>
                  <th className="px-4 py-3">Phone</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/10 bg-slate-900/70">
                {loading ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-6 text-center text-slate-400">Fetching employer data...</td>
                  </tr>
                ) : employers.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-6 text-center text-slate-400">No employers have been added yet.</td>
                  </tr>
                ) : (
                  employers.map((employer) => (
                    <tr key={employer._id} className="hover:bg-slate-900/90">
                      <td className="px-4 py-4 font-medium text-white">{employer.name}</td>
                      <td className="px-4 py-4 text-slate-300">{employer.role}</td>
                      <td className="px-4 py-4 text-slate-300">{employer.email}</td>
                      <td className="px-4 py-4 text-slate-300">{employer.phone}</td>
                      <td className="px-4 py-4">
                        <span className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${statusClasses(employer.status)}`}>
                          {statusLabel(employer.status)}
                        </span>
                      </td>
                      <td className="px-4 py-4">
                        <div className="flex flex-wrap gap-2">
                          <button
                            type="button"
                            onClick={() => handleEdit(employer)}
                            className="inline-flex items-center rounded-3xl bg-white/5 px-3 py-2 text-xs text-slate-200 transition hover:bg-white/10"
                          >
                            <Edit3 size={14} /> Edit
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDelete(employer._id)}
                            className="inline-flex items-center rounded-3xl bg-rose-500/10 px-3 py-2 text-xs text-rose-300 transition hover:bg-rose-500/15"
                          >
                            <Trash2 size={14} /> Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="rounded-[32px] border border-white/10 bg-slate-950/80 p-6 shadow-panel">
          <div className="flex items-center justify-between gap-4">
            <div>
              <h4 className="text-xl font-semibold text-white">Add / Edit Employer</h4>
              <p className="mt-2 text-sm text-slate-400">Save workforce records that can be used for route planning and field assignments.</p>
            </div>
            <span className="rounded-full bg-slate-900/70 px-3 py-2 text-xs uppercase tracking-[0.24em] text-slate-400">{editingId ? 'Edit' : 'Create'}</span>
          </div>

          <div className="mt-6 space-y-4">
            <div>
              <label className="block text-sm text-slate-400">Full Name</label>
              <input
                value={formState.name}
                onChange={(e) => setFormState({ ...formState, name: e.target.value })}
                className="mt-2 w-full rounded-3xl border border-white/10 bg-slate-900/80 px-4 py-3 text-white outline-none focus:border-brand-400 focus:ring-2 focus:ring-brand-500/20"
              />
            </div>
            <div>
              <label className="block text-sm text-slate-400">Role</label>
              <select
                value={formState.role}
                onChange={(e) => setFormState({ ...formState, role: e.target.value as EmployerRequest['role'] })}
                className="mt-2 w-full rounded-3xl border border-white/10 bg-slate-900/80 px-4 py-3 text-white outline-none focus:border-brand-400 focus:ring-2 focus:ring-brand-500/20"
              >
                {employerRoles.map((role) => (
                  <option key={role} value={role}>{role}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm text-slate-400">Email</label>
              <input
                type="email"
                value={formState.email}
                onChange={(e) => setFormState({ ...formState, email: e.target.value })}
                className="mt-2 w-full rounded-3xl border border-white/10 bg-slate-900/80 px-4 py-3 text-white outline-none focus:border-brand-400 focus:ring-2 focus:ring-brand-500/20"
              />
            </div>
            <div>
              <label className="block text-sm text-slate-400">Phone</label>
              <input
                value={formState.phone}
                onChange={(e) => setFormState({ ...formState, phone: e.target.value })}
                className="mt-2 w-full rounded-3xl border border-white/10 bg-slate-900/80 px-4 py-3 text-white outline-none focus:border-brand-400 focus:ring-2 focus:ring-brand-500/20"
              />
            </div>
            <div>
              <label className="block text-sm text-slate-400">Location</label>
              <input
                value={formState.location}
                onChange={(e) => setFormState({ ...formState, location: e.target.value })}
                placeholder="Optional area or district"
                className="mt-2 w-full rounded-3xl border border-white/10 bg-slate-900/80 px-4 py-3 text-white outline-none focus:border-brand-400 focus:ring-2 focus:ring-brand-500/20"
              />
            </div>
            <div>
              <label className="block text-sm text-slate-400">Current Status</label>
              <select
                value={formState.status}
                onChange={(e) => setFormState({ ...formState, status: e.target.value as Employer['status'] })}
                className="mt-2 w-full rounded-3xl border border-white/10 bg-slate-900/80 px-4 py-3 text-white outline-none focus:border-brand-400 focus:ring-2 focus:ring-brand-500/20"
              >
                {employerStatusOptions.map((status) => (
                  <option key={status} value={status}>{statusLabel(status)}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm text-slate-400">Notes</label>
              <textarea
                value={formState.notes}
                onChange={(e) => setFormState({ ...formState, notes: e.target.value })}
                rows={4}
                className="mt-2 w-full rounded-3xl border border-white/10 bg-slate-900/80 px-4 py-3 text-white outline-none focus:border-brand-400 focus:ring-2 focus:ring-brand-500/20"
              />
            </div>
            <div className="flex flex-wrap gap-3">
              <button
                type="button"
                onClick={handleSave}
                disabled={saving}
                className="inline-flex items-center justify-center gap-2 rounded-3xl bg-brand-500 px-4 py-3 text-sm font-semibold text-white transition hover:bg-brand-400 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {saving ? 'Saving...' : editingId ? 'Save Changes' : 'Add Employer'}
              </button>
              <button
                type="button"
                onClick={resetForm}
                className="inline-flex items-center justify-center rounded-3xl border border-white/10 bg-slate-900/80 px-4 py-3 text-sm text-slate-200 transition hover:border-brand-400/40 hover:bg-slate-900"
              >
                Reset Form
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default EmployersPage;
