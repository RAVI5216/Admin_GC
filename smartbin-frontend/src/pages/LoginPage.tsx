import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Lock, Mail, Layers } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

function LoginPage() {
  const navigate = useNavigate();
  const { login, loading, savedEmail, savedPassword, user } = useAuth();
  const [email,    setEmail]    = useState(() => savedEmail ?? user?.email ?? 'Megha123@gmail.com');
  const [password, setPassword] = useState(() => savedPassword ?? 'Megha123');
  const [error,    setError]    = useState<string | null>(null);

  useEffect(() => {
    if (savedEmail !== null) setEmail(savedEmail);
    else if (user?.email)    setEmail(user.email);
  }, [savedEmail, user?.email]);

  useEffect(() => {
    if (savedPassword !== null) setPassword(savedPassword);
  }, [savedPassword]);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
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
    <div className="flex min-h-screen items-center justify-center bg-slate-950 px-4 py-10">

      {/* Background glow */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -top-32 left-1/2 h-[600px] w-[600px] -translate-x-1/2 rounded-full bg-brand-500/5 blur-[120px]" />
      </div>

      <div className="relative w-full max-w-md">

        {/* Brand mark */}
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-500 shadow-glow">
            <Layers size={22} className="text-white" />
          </div>
          <h1 className="text-2xl font-bold text-white">GarbageGuardian</h1>
          <p className="mt-1.5 text-sm text-slate-500">City Waste Management Portal</p>
        </div>

        {/* Card */}
        <div className="glass-panel shadow-panel rounded-2xl p-7">
          <h2 className="text-lg font-semibold text-white">Sign in to your account</h2>
          <p className="mt-1 text-sm text-slate-500">Secure access for admin and collector management.</p>

          {error && (
            <div className="mt-4 flex items-start gap-2.5 rounded-xl border border-rose-500/20 bg-rose-500/10 px-4 py-3 text-sm text-rose-300">
              <span className="mt-0.5 shrink-0">⚠</span>
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="mt-5 space-y-4">

            {/* Email field */}
            <div>
              <label className="mb-1.5 block text-xs font-medium text-slate-400" htmlFor="email">
                Email address
              </label>
              <div className="flex items-center gap-2.5 rounded-xl border border-white/[0.08] bg-white/[0.04] px-3.5 py-2.5 transition focus-within:border-brand-500/60 focus-within:ring-1 focus-within:ring-brand-500/20">
                <Mail size={15} className="shrink-0 text-slate-500" />
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="collector@city.gov"
                  className="w-full bg-transparent text-sm text-slate-100 outline-none placeholder:text-slate-600"
                />
              </div>
            </div>

            {/* Password field */}
            <div>
              <label className="mb-1.5 block text-xs font-medium text-slate-400" htmlFor="password">
                Password
              </label>
              <div className="flex items-center gap-2.5 rounded-xl border border-white/[0.08] bg-white/[0.04] px-3.5 py-2.5 transition focus-within:border-brand-500/60 focus-within:ring-1 focus-within:ring-brand-500/20">
                <Lock size={15} className="shrink-0 text-slate-500" />
                <input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full bg-transparent text-sm text-slate-100 outline-none placeholder:text-slate-600"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="mt-2 w-full rounded-xl bg-brand-500 py-2.5 text-sm font-semibold text-white shadow-glow transition hover:bg-brand-400 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loading ? 'Signing in…' : 'Sign in'}
            </button>
          </form>
        </div>

        <p className="mt-6 text-center text-xs text-slate-600">
          Garbage Guardian Admin Portal · All rights reserved
        </p>
      </div>
    </div>
  );
}

export default LoginPage;
