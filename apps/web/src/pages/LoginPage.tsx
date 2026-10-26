import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, KeyRound, Lock, Mail, Layers } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

type LoginMode = 'login' | 'verify-login' | 'request-reset' | 'confirm-reset';

function LoginPage() {
  const navigate = useNavigate();
  const {
    user,
    login,
    verifyLoginOtp,
    loading,
    requestPasswordReset,
    resetPassword,
  } = useAuth();

  useEffect(() => {
    if (user) {
      navigate('/', { replace: true });
    }
  }, [user, navigate]);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [code, setCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [mode, setMode] = useState<LoginMode>('login');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setNotice(null);

    if (!email.trim()) {
      setError('Please enter your email address.');
      return;
    }

    if (mode === 'login') {
      if (!password.trim()) {
        setError('Please enter your password.');
        return;
      }
      try {
        const challenge = await login(email, password);
        setEmail(challenge.email);
        setCode('');
        setMode('verify-login');
        setNotice(challenge.message);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Login failed');
      }
      return;
    }

    setSubmitting(true);
    try {
      if (mode === 'verify-login') {
        await verifyLoginOtp(email, code);
        navigate('/');
      } else if (mode === 'request-reset') {
        const message = await requestPasswordReset(email);
        setMode('confirm-reset');
        setNotice(message);
      } else {
        const message = await resetPassword(email, code, newPassword);
        setMode('login');
        setPassword('');
        setCode('');
        setNewPassword('');
        setNotice(message);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to complete password reset');
    } finally {
      setSubmitting(false);
    }
  };

  const showLogin = () => {
    setMode('login');
    setError(null);
    setNotice(null);
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-950 px-4 py-10">
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -top-32 left-1/2 h-[600px] w-[600px] -translate-x-1/2 rounded-full bg-brand-500/5 blur-[120px]" />
      </div>

      <div className="relative w-full max-w-md">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-500 shadow-glow">
            <Layers size={22} className="text-white" />
          </div>
          <h1 className="text-2xl font-bold text-white">GarbageGuardian</h1>
          <p className="mt-1.5 text-sm text-slate-500">City Waste Management Portal</p>
        </div>

        <div className="glass-panel shadow-panel rounded-2xl p-7">
          {mode !== 'login' && (
            <button
              type="button"
              onClick={showLogin}
              className="mb-4 inline-flex items-center gap-1.5 text-xs font-medium text-slate-400 transition hover:text-white"
            >
              <ArrowLeft size={14} />
              Back to sign in
            </button>
          )}
          <h2 className="text-lg font-semibold text-white">
            {mode === 'login'
              ? 'Sign in to your account'
              : mode === 'verify-login'
                ? 'Verify your email'
                : mode === 'request-reset'
                  ? 'Forgot password?'
                  : 'Reset your password'}
          </h2>
          <p className="mt-1 text-sm text-slate-500">
            {mode === 'login'
              ? 'Secure access for admin and collector management.'
              : mode === 'verify-login'
                ? 'Enter the six-digit sign-in code sent to your admin email.'
                : mode === 'request-reset'
                  ? 'We’ll email a one-time reset code to your admin account.'
                  : 'Enter the six-digit code from your email and choose a new password.'}
          </p>

          {error && (
            <div role="alert" className="mt-4 flex items-start gap-2.5 rounded-xl border border-rose-500/20 bg-rose-500/10 px-4 py-3 text-sm text-rose-300">
              <span className="mt-0.5 shrink-0">⚠</span>
              <span>{error}</span>
            </div>
          )}
          {notice && (
            <div role="status" className="mt-4 rounded-xl border border-emerald-500/20 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-300">
              {notice}
            </div>
          )}

          <form onSubmit={handleSubmit} className="mt-5 space-y-4">
            <div>
              <label className="mb-1.5 block text-xs font-medium text-slate-400" htmlFor="email">
                Email address
              </label>
              <div className="flex items-center gap-2.5 rounded-xl border border-white/[0.08] bg-white/[0.04] px-3.5 py-2.5 transition focus-within:border-brand-500/60 focus-within:ring-1 focus-within:ring-brand-500/20">
                <Mail size={15} className="shrink-0 text-slate-500" />
                <input
                  id="email"
                  type="email"
                  required
                  autoComplete="email"
                  value={email}
                  readOnly={mode === 'verify-login'}
                  onChange={(event) => setEmail(event.target.value)}
                  placeholder="collector@city.gov"
                  className="w-full bg-transparent text-sm text-slate-100 outline-none placeholder:text-slate-600"
                />
              </div>
            </div>

            {mode === 'login' && (
              <div>
                <label className="mb-1.5 block text-xs font-medium text-slate-400" htmlFor="password">
                  Password
                </label>
                <div className="flex items-center gap-2.5 rounded-xl border border-white/[0.08] bg-white/[0.04] px-3.5 py-2.5 transition focus-within:border-brand-500/60 focus-within:ring-1 focus-within:ring-brand-500/20">
                  <Lock size={15} className="shrink-0 text-slate-500" />
                  <input
                    id="password"
                    type="password"
                    required
                    autoComplete="current-password"
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    placeholder="Enter your password"
                    className="w-full bg-transparent text-sm text-slate-100 outline-none placeholder:text-slate-600"
                  />
                </div>
                <div className="mt-2 text-right">
                  <button
                    type="button"
                    onClick={() => {
                      setMode('request-reset');
                      setError(null);
                      setNotice(null);
                    }}
                    className="text-xs font-medium text-brand-300 transition hover:text-brand-200"
                  >
                    Forgot password?
                  </button>
                </div>
              </div>
            )}

            {mode === 'confirm-reset' && (
              <>
                <div>
                  <label className="mb-1.5 block text-xs font-medium text-slate-400" htmlFor="reset-code">
                    Email reset code
                  </label>
                  <div className="flex items-center gap-2.5 rounded-xl border border-white/[0.08] bg-white/[0.04] px-3.5 py-2.5 transition focus-within:border-brand-500/60 focus-within:ring-1 focus-within:ring-brand-500/20">
                    <KeyRound size={15} className="shrink-0 text-slate-500" />
                    <input
                      id="reset-code"
                      type="text"
                      inputMode="numeric"
                      autoComplete="one-time-code"
                      pattern="[0-9]{6}"
                      maxLength={6}
                      required
                      value={code}
                      onChange={(event) => setCode(event.target.value.replace(/\D/g, '').slice(0, 6))}
                      placeholder="6-digit code"
                      className="w-full bg-transparent text-sm text-slate-100 outline-none placeholder:text-slate-600"
                    />
                  </div>
                </div>
                <div>
                  <label className="mb-1.5 block text-xs font-medium text-slate-400" htmlFor="new-password">
                    New password
                  </label>
                  <div className="flex items-center gap-2.5 rounded-xl border border-white/[0.08] bg-white/[0.04] px-3.5 py-2.5 transition focus-within:border-brand-500/60 focus-within:ring-1 focus-within:ring-brand-500/20">
                    <Lock size={15} className="shrink-0 text-slate-500" />
                    <input
                      id="new-password"
                      type="password"
                      autoComplete="new-password"
                      minLength={8}
                      required
                      value={newPassword}
                      onChange={(event) => setNewPassword(event.target.value)}
                      placeholder="At least 8 characters"
                      className="w-full bg-transparent text-sm text-slate-100 outline-none placeholder:text-slate-600"
                    />
                  </div>
                </div>
              </>
            )}

            {mode === 'verify-login' && (
              <div>
                <label className="mb-1.5 block text-xs font-medium text-slate-400" htmlFor="login-code">
                  Sign-in verification code
                </label>
                <div className="flex items-center gap-2.5 rounded-xl border border-white/[0.08] bg-white/[0.04] px-3.5 py-2.5 transition focus-within:border-brand-500/60 focus-within:ring-1 focus-within:ring-brand-500/20">
                  <KeyRound size={15} className="shrink-0 text-slate-500" />
                  <input
                    id="login-code"
                    type="text"
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    pattern="[0-9]{6}"
                    maxLength={6}
                    required
                    value={code}
                    onChange={(event) => setCode(event.target.value.replace(/\D/g, '').slice(0, 6))}
                    placeholder="6-digit code"
                    className="w-full bg-transparent text-sm text-slate-100 outline-none placeholder:text-slate-600"
                  />
                </div>
              </div>
            )}

            <button
              type="submit"
              disabled={loading || submitting}
              className="mt-2 w-full rounded-xl bg-brand-500 py-2.5 text-sm font-semibold text-white shadow-glow transition hover:bg-brand-400 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loading || submitting
                ? 'Please wait…'
                : mode === 'login'
                  ? 'Sign in'
                  : mode === 'verify-login'
                    ? 'Verify and sign in'
                    : mode === 'request-reset'
                      ? 'Send reset code'
                      : 'Update password'}
            </button>
          </form>

          {mode === 'verify-login' && (
            <button
              type="button"
              disabled={loading || submitting}
              onClick={async () => {
                setError(null);
                setNotice(null);
                setSubmitting(true);
                try {
                  const challenge = await login(email, password);
                  setNotice(challenge.message);
                } catch (err) {
                  setError(err instanceof Error ? err.message : 'Unable to resend sign-in code');
                } finally {
                  setSubmitting(false);
                }
              }}
              className="mt-4 w-full text-center text-xs font-medium text-brand-300 transition hover:text-brand-200 disabled:opacity-50"
            >
              Resend sign-in code
            </button>
          )}

          {mode === 'confirm-reset' && (
            <button
              type="button"
              disabled={submitting}
              onClick={async () => {
                setError(null);
                setNotice(null);
                setSubmitting(true);
                try {
                  setNotice(await requestPasswordReset(email));
                } catch (err) {
                  setError(err instanceof Error ? err.message : 'Unable to send reset code');
                } finally {
                  setSubmitting(false);
                }
              }}
              className="mt-4 w-full text-center text-xs font-medium text-brand-300 transition hover:text-brand-200 disabled:opacity-50"
            >
              Resend reset code
            </button>
          )}
        </div>

        <p className="mt-6 text-center text-xs text-slate-600">
          Garbage Guardian Admin Portal · All rights reserved
        </p>
      </div>
    </div>
  );
}

export default LoginPage;
