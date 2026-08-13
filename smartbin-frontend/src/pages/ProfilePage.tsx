import { useEffect, useState } from 'react';
import { useProfile } from '../context/ProfileContext';
import { useAuth } from '../context/AuthContext';

function ProfilePage() {
  const profileCtx = useProfile();
  const { profile, loading: ctxLoading, updateProfile } = profileCtx;
  const { user, updateUser, updateSavedPassword } = useAuth();

  const [collectorName, setCollectorName] = useState('Pankaj Mudholkar');
  const [role, setRole] = useState('Field Collector');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [avatar, setAvatar] = useState<string | null>(null);
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

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
      setError('Name, role, email, and phone are required. Please fill in all fields.');
      return;
    }
    if (password || confirmPassword) {
      if (password !== confirmPassword) {
        setError('Password and confirm password must match.');
        return;
      }
      if (password.length > 0 && password.length < 6) {
        setError('Password must be at least 6 characters long.');
        return;
      }
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
      if (updated.email) {
        updateSavedEmail(updated.email);
      }
      if (password) {
        updateSavedPassword(password);
      }
      setPassword('');
      setConfirmPassword('');
      setMessage('Profile saved successfully');
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-[520px] rounded-[32px] border border-white/10 bg-slate-950/70 p-10 text-slate-300">
        <p className="text-lg font-medium text-white">Loading profile...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="rounded-[32px] border border-white/10 bg-slate-950/80 p-6 shadow-panel">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h3 className="text-2xl font-semibold text-white">Profile</h3>
            <p className="mt-2 text-sm text-slate-400">Manage the collector profile and access settings for the dashboard experience.</p>
          </div>
          <button
            onClick={saveProfile}
            disabled={saving}
            className="inline-flex items-center justify-center rounded-3xl bg-brand-500 px-4 py-3 text-sm font-semibold text-white transition hover:bg-brand-400 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {saving ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </div>

      <div className="glass-panel rounded-[28px] border border-white/10 p-6 shadow-panel">
        <h4 className="text-lg font-semibold text-white">Collector Profile</h4>
        {(message || error) && (
          <div className="mt-4 rounded-3xl border border-white/10 bg-slate-900/80 p-4 text-sm text-slate-200">
            {message ? <p className="text-emerald-300">{message}</p> : null}
            {error ? <p className="text-rose-300">{error}</p> : null}
          </div>
        )}
        <div className="mt-6 grid gap-5 lg:grid-cols-3">
          <div className="rounded-3xl bg-slate-950/70 p-6 flex flex-col items-center">
            <p className="text-sm text-slate-400">Avatar</p>
            <div className="mt-3 flex items-center gap-4">
              {avatar ? (
                <img src={avatar} alt="avatar" className="h-20 w-20 rounded-full object-cover" />
              ) : (
                <div className="h-20 w-20 rounded-full bg-slate-900/70 flex items-center justify-center text-slate-400">
                  No image
                </div>
              )}
            </div>
            <div className="mt-3 w-full">
              <input
                type="file"
                accept="image/*"
                onChange={async (e) => {
                  const file = e.target.files && e.target.files[0];
                  if (!file) return;
                  const reader = new FileReader();
                  reader.onload = () => {
                    const result = reader.result as string;
                    setAvatar(result);
                  };
                  reader.readAsDataURL(file);
                }}
                className="w-full text-sm text-slate-200"
              />
              <input
                type="text"
                placeholder="Or paste image URL"
                value={avatar ?? ''}
                onChange={(e) => setAvatar(e.target.value)}
                className="mt-2 w-full rounded-3xl border border-white/10 bg-slate-900/80 px-4 py-2 text-white outline-none focus:border-brand-400 focus:ring-2 focus:ring-brand-500/20"
              />
            </div>
          </div>
          <div className="rounded-3xl bg-slate-950/70 p-6">
            <p className="text-sm text-slate-400">Name</p>
            <input
              value={collectorName}
              onChange={(event) => setCollectorName(event.target.value)}
              className="mt-2 w-full rounded-3xl border border-white/10 bg-slate-900/80 px-4 py-3 text-white outline-none focus:border-brand-400 focus:ring-2 focus:ring-brand-500/20"
            />
          </div>
          <div className="rounded-3xl bg-slate-950/70 p-6">
            <p className="text-sm text-slate-400">Role</p>
            <input
              value={role}
              onChange={(event) => setRole(event.target.value)}
              className="mt-2 w-full rounded-3xl border border-white/10 bg-slate-900/80 px-4 py-3 text-white outline-none focus:border-brand-400 focus:ring-2 focus:ring-brand-500/20"
            />
          </div>
          <div className="rounded-3xl bg-slate-950/70 p-6">
            <p className="text-sm text-slate-400">Email</p>
            <input
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              className="mt-2 w-full rounded-3xl border border-white/10 bg-slate-900/80 px-4 py-3 text-white outline-none focus:border-brand-400 focus:ring-2 focus:ring-brand-500/20"
            />
            <p className="mt-2 text-xs text-slate-500">Update the email used to log in.</p>
          </div>
          <div className="rounded-3xl bg-slate-950/70 p-6">
            <p className="text-sm text-slate-400">New Password</p>
            <input
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="Leave blank to keep current password"
              className="mt-2 w-full rounded-3xl border border-white/10 bg-slate-900/80 px-4 py-3 text-white outline-none focus:border-brand-400 focus:ring-2 focus:ring-brand-500/20"
            />
          </div>
          <div className="rounded-3xl bg-slate-950/70 p-6">
            <p className="text-sm text-slate-400">Confirm Password</p>
            <input
              type="password"
              value={confirmPassword}
              onChange={(event) => setConfirmPassword(event.target.value)}
              placeholder="Confirm new password"
              className="mt-2 w-full rounded-3xl border border-white/10 bg-slate-900/80 px-4 py-3 text-white outline-none focus:border-brand-400 focus:ring-2 focus:ring-brand-500/20"
            />
          </div>
          <div className="rounded-3xl bg-slate-950/70 p-6">
            <p className="text-sm text-slate-400">Phone</p>
            <input
              value={phone}
              onChange={(event) => setPhone(event.target.value)}
              className="mt-2 w-full rounded-3xl border border-white/10 bg-slate-900/80 px-4 py-3 text-white outline-none focus:border-brand-400 focus:ring-2 focus:ring-brand-500/20"
            />
          </div>
        </div>

        <div className="mt-6 flex flex-wrap items-center gap-3">
          <p className="text-sm text-slate-400">Collector details are ready to be synced with live profile settings.</p>
        </div>
      </div>
    </div>
  );
}

export default ProfilePage;
