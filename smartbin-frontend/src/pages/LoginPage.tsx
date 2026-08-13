import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Lock, Mail } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

function LoginPage() {
  const navigate = useNavigate();
  const { login, loading, savedEmail, savedPassword, user } = useAuth();
  const [email, setEmail] = useState(() => savedEmail ?? user?.email ?? 'Megha123@gmail.com');
  const [password, setPassword] = useState(() => savedPassword ?? 'Megha123');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (savedEmail !== null) {
      setEmail(savedEmail);
    } else if (user?.email) {
      setEmail(user.email);
    }
  }, [savedEmail, user?.email]);

  useEffect(() => {
    if (savedPassword !== null) {
      setPassword(savedPassword);
    }
  }, [savedPassword]);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);

    if (!email.trim() || !password.trim()) {
      setError('Please enter both email and password.');
      return;
    }

    try {
      await login(email, password);
      navigate('/');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed');
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center px-4 py-10">
      <div className="w-full max-w-2xl rounded-[32px] border border-white/10 bg-slate-900/90 p-10 shadow-2xl shadow-slate-950/40 backdrop-blur-xl">
        <div className="mb-10 text-center">
          <p className="text-sm uppercase tracking-[0.3em] text-brand-300/80">SmartBin Admin</p>
          <h1 className="mt-4 text-4xl font-semibold text-white">Collector Portal Login</h1>
          <p className="mt-3 text-slate-400">Secure access for admin and collector management.</p>
        </div>
        {error ? (
          <div className="mb-6 rounded-3xl border border-rose-500/20 bg-rose-500/10 p-4 text-sm text-rose-200">{error}</div>
        ) : null}
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="rounded-3xl border border-white/10 bg-slate-950/80 p-5">
            <label className="mb-3 block text-sm text-slate-400">Email</label>
            <div className="flex items-center gap-3 rounded-3xl border border-white/10 bg-slate-900/80 px-4 py-3 focus-within:border-brand-400 focus-within:ring-2 focus-within:ring-brand-500/20">
              <Mail size={18} className="text-brand-300" />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-transparent text-sm text-slate-100 outline-none"
                placeholder="Megha123@gmail.com"
              />
            </div>
          </div>
          <div className="rounded-3xl border border-white/10 bg-slate-950/80 p-5">
            <label className="mb-3 block text-sm text-slate-400">Password</label>
            <div className="flex items-center gap-3 rounded-3xl border border-white/10 bg-slate-900/80 px-4 py-3 focus-within:border-brand-400 focus-within:ring-2 focus-within:ring-brand-500/20">
              <Lock size={18} className="text-brand-300" />
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-transparent text-sm text-slate-100 outline-none"
                placeholder="Megha123"
              />
            </div>
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-3xl bg-brand-500 px-6 py-4 text-sm font-semibold text-white shadow-lg shadow-brand-500/20 transition hover:bg-brand-400 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loading ? 'Signing in...' : 'Sign In'}
          </button>
        </form>
      </div>
    </div>
  );
}

export default LoginPage;
