import { useEffect, useState } from 'react';
import { useProfile } from '../context/ProfileContext';
import { useAuth } from '../context/AuthContext';
import { User, Mail, Phone, Lock, Shield, Camera } from 'lucide-react';

function ProfilePage() {
  const profileCtx  = useProfile();
  const { profile, loading: ctxLoading, updateProfile } = profileCtx;
  const { user, updateUser } = useAuth();

  const [collectorName,   setCollectorName]   = useState(user?.name ?? '');
  const [role,            setRole]            = useState('Admin');
  const [email,           setEmail]           = useState('');
  const [phone,           setPhone]           = useState('');
  const [avatar,          setAvatar]          = useState<string | null>(null);
  const [password,        setPassword]        = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [saving,          setSaving]          = useState(false);
  const [message,         setMessage]         = useState<string | null>(null);
  const [error,           setError]           = useState<string | null>(null);

  useEffect(() => {
    if (profile) {
      setCollectorName(profile.collectorName ?? '');
      setRole(profile.role ?? '');
      setEmail(profile.email ?? user?.email ?? '');
      setPhone(profile.phone ?? '');
      setAvatar(profile.avatar ?? null);
    } else {
      setEmail(user?.email ?? '');
    }
  }, [profile, user]);

  const loading = ctxLoading;

  const saveProfile = async () => {
    setMessage(null);
    setError(null);
    if (!collectorName.trim() || !role.trim() || !email.trim() || !phone.trim()) {
      setError('Name, role, email, and phone are required.');
      return;
    }
    if (password || confirmPassword) {
      if (password !== confirmPassword) { setError('Passwords do not match.'); return; }
      if (password.length > 0 && password.length < 8) { setError('Password must be at least 8 characters.'); return; }
    }
    setSaving(true);
    try {
      const updated = await updateProfile({ collectorName, role, email, phone, avatar, password: password || undefined });
      setCollectorName(updated.collectorName);
      setRole(updated.role);
      setEmail(updated.email);
      setPhone(updated.phone);
      setAvatar(updated.avatar ?? null);
      if (updated.email && updated.email !== user?.email) {
        updateUser({ name: updated.collectorName, email: updated.email });
      }
      setPassword('');
      setConfirmPassword('');
      setMessage('Profile saved successfully.');
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-[400px] items-center justify-center rounded-2xl border border-white/[0.06] bg-slate-900/60">
        <p className="text-sm text-slate-500">Loading profile…</p>
      </div>
    );
  }

  /* ── Field component ──────────────────────────────────────────── */
  const Field = ({
    label, id, type = 'text', value, onChange, placeholder, hint,
    icon,
  }: {
    label: string; id: string; type?: string; value: string;
    onChange: (v: string) => void; placeholder?: string; hint?: string;
    icon?: React.ReactNode;
  }) => (
    <div>
      <label htmlFor={id} className="mb-1.5 block text-xs font-medium text-slate-400">{label}</label>
      <div className="flex items-center gap-2.5 rounded-xl border border-white/[0.08] bg-white/[0.03] px-3.5 py-2.5 transition focus-within:border-brand-500/50 focus-within:ring-1 focus-within:ring-brand-500/20">
        {icon && <span className="shrink-0 text-slate-500">{icon}</span>}
        <input
          id={id}
          type={type}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className="w-full bg-transparent text-sm text-slate-100 outline-none placeholder:text-slate-600"
        />
      </div>
      {hint && <p className="mt-1 text-xs text-slate-600">{hint}</p>}
    </div>
  );

  return (
    <div className="space-y-5">

      {/* Page header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-semibold text-white">Profile</h1>
          <p className="mt-0.5 text-sm text-slate-500">Manage your collector profile and account settings.</p>
        </div>
        <button
          onClick={saveProfile}
          disabled={saving}
          className="inline-flex items-center justify-center rounded-xl bg-brand-500 px-5 py-2.5 text-sm font-semibold text-white shadow-glow transition hover:bg-brand-400 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {saving ? 'Saving…' : 'Save changes'}
        </button>
      </div>

      {/* Feedback banner */}
      {(message || error) && (
        <div className={`rounded-xl border px-4 py-3 text-sm ${
          message
            ? 'border-emerald-500/20 bg-emerald-500/5 text-emerald-300'
            : 'border-rose-500/20 bg-rose-500/5 text-rose-300'
        }`}>
          {message || error}
        </div>
      )}

      <div className="grid gap-5 xl:grid-cols-[260px_1fr]">

        {/* Avatar card */}
        <div className="glass-panel shadow-card flex flex-col items-center rounded-2xl p-6">
          <div className="relative">
            <div className="h-24 w-24 overflow-hidden rounded-2xl bg-slate-800 ring-2 ring-brand-500/30">
              {avatar ? (
                <img src={avatar} alt="avatar" className="h-full w-full object-cover" />
              ) : (
                <div className="flex h-full w-full items-center justify-center text-slate-500">
                  <User size={32} />
                </div>
              )}
            </div>
            <label
              className="absolute -bottom-2 -right-2 flex h-8 w-8 cursor-pointer items-center justify-center rounded-full bg-brand-500 text-white shadow-lg transition hover:bg-brand-400"
              title="Upload photo"
            >
              <Camera size={13} />
              <input
                type="file"
                accept="image/*"
                className="sr-only"
                onChange={async (e) => {
                  const file = e.target.files?.[0];
                  if (!file) return;
                  const reader = new FileReader();
                  reader.onload = () => setAvatar(reader.result as string);
                  reader.readAsDataURL(file);
                }}
              />
            </label>
          </div>

          <p className="mt-4 text-center text-sm font-semibold text-white">{collectorName || 'Your Name'}</p>
          <p className="mt-0.5 text-center text-xs text-slate-500">{role || 'Role'}</p>

          <div className="mt-5 w-full">
            <label className="mb-1 block text-[10px] font-semibold uppercase tracking-wider text-slate-600">
              Or paste image URL
            </label>
            <input
              type="text"
              placeholder="https://…"
              value={avatar ?? ''}
              onChange={(e) => setAvatar(e.target.value)}
              className="w-full rounded-xl border border-white/[0.08] bg-white/[0.03] px-3 py-2 text-xs text-slate-200 outline-none placeholder:text-slate-600 focus:border-brand-500/50 focus:ring-1 focus:ring-brand-500/20"
            />
          </div>
        </div>

        {/* Form fields */}
        <div className="glass-panel shadow-card rounded-2xl p-6">
          <div className="mb-5">
            <h2 className="text-sm font-semibold text-white">Account information</h2>
            <p className="mt-0.5 text-xs text-slate-500">Update your name, contact details, and credentials.</p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field
              label="Full name" id="name"
              value={collectorName} onChange={setCollectorName}
              placeholder="Your full name"
              icon={<User size={14} />}
            />
            <Field
              label="Role" id="role"
              value={role} onChange={setRole}
              placeholder="e.g. Field Collector"
              icon={<Shield size={14} />}
            />
            <Field
              label="Email address" id="email" type="email"
              value={email} onChange={setEmail}
              placeholder="you@city.gov"
              hint="This is your login email."
              icon={<Mail size={14} />}
            />
            <Field
              label="Phone number" id="phone"
              value={phone} onChange={setPhone}
              placeholder="+91 00000 00000"
              icon={<Phone size={14} />}
            />

            {/* Divider */}
            <div className="col-span-full my-1 flex items-center gap-3">
              <div className="h-px flex-1 bg-white/[0.05]" />
              <span className="text-[10px] font-semibold uppercase tracking-widest text-slate-600">Change password</span>
              <div className="h-px flex-1 bg-white/[0.05]" />
            </div>

            <Field
              label="New password" id="password" type="password"
              value={password} onChange={setPassword}
              placeholder="Leave blank to keep current"
              icon={<Lock size={14} />}
            />
            <Field
              label="Confirm new password" id="confirm" type="password"
              value={confirmPassword} onChange={setConfirmPassword}
              placeholder="Repeat new password"
              icon={<Lock size={14} />}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

export default ProfilePage;
