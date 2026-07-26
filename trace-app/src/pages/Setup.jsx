import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { authApi } from '../services/api';

export function Setup() {
  const navigate = useNavigate();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    let cancelled = false;
    authApi
      .hasUsers()
      .then((data) => {
        if (cancelled) return;
        if (data.hasUsers) {
          navigate('/login', { replace: true });
        } else {
          setChecking(false);
        }
      })
      .catch(() => {
        if (cancelled) return;
        setChecking(false);
      });
    return () => {
      cancelled = true;
    };
  }, [navigate]);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError('');

    const trimmedUsername = username.trim();
    if (!trimmedUsername) {
      setError('Username is required.');
      return;
    }

    if (!password) {
      setError('Password is required.');
      return;
    }

    if (password.length < 4) {
      setError('Password must be at least 4 characters.');
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    setIsSubmitting(true);

    try {
      const result = await authApi.register(trimmedUsername, password);
      if (result.ok) {
        navigate('/login', { replace: true });
      }
    } catch (err) {
      setError(err.message || 'Failed to create account.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (checking) {
    return (
      <div className="min-h-screen w-full bg-white flex items-center justify-center">
        <p className="text-emerald-600 text-sm">Checking setup...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen w-full bg-white">
      <div className="grid min-h-screen w-full md:grid-cols-[1.15fr_1fr]">
        <div className="relative bg-gradient-to-br from-emerald-700 via-emerald-600 to-emerald-500 text-white p-8 md:p-12">
          <div className="min-h-full flex flex-col items-center justify-center text-center gap-3">
            <div className="flex h-[320px] w-[320px] items-center justify-center drop-shadow-lg">
              <img
                src="/logo-no-background.png"
                alt="City Civil Registrar Office Logo"
                className="h-full w-full object-contain"
              />
            </div>
            <div className="space-y-1">
              <p className="text-[24px] font-semibold tracking-[0.22em] text-white">B-TRACE SYSTEM</p>
              <p className="text-[16px] font-semibold tracking-[0.10em] text-white/90">Birth Tracking for Registration and Certificate Entries</p>
            </div>
          </div>
          <p className="text-xs text-center text-white/80">
            {`© ${new Date().getFullYear()} City Civil Registrar Office • B-TRACE System`}
          </p>
          <p className="text-xs text-center text-white/60">
            Developed by CS students, St. Peter's College
          </p>
        </div>

        <div className="bg-white p-8 md:p-12 flex items-center justify-center">
          <div className="w-full max-w-md">
            <div className="space-y-2 mb-8">
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-emerald-700">First-time Setup</p>
              <h3 className="text-2xl font-semibold text-emerald-900">Create Admin Account</h3>
              <p className="text-sm text-emerald-600">
                No accounts found. Set up your admin credentials to get started.
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="space-y-1.5">
                <label
                  htmlFor="setup-username"
                  className="text-[11px] font-semibold text-emerald-700 uppercase tracking-[0.18em]"
                >
                  Username
                </label>
                <input
                  id="setup-username"
                  type="text"
                  value={username}
                  onChange={(event) => setUsername(event.target.value)}
                  autoComplete="username"
                  className="w-full rounded-lg border border-emerald-200 bg-white px-3 py-2.5 text-sm text-emerald-900 placeholder:text-emerald-400 focus:outline-none focus:ring-2 focus:ring-emerald-400/60 focus:border-emerald-400"
                  placeholder="Enter admin username"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <label
                  htmlFor="setup-password"
                  className="text-[11px] font-semibold text-emerald-700 uppercase tracking-[0.18em]"
                >
                  Password
                </label>
                <input
                  id="setup-password"
                  type="password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  autoComplete="new-password"
                  className="w-full rounded-lg border border-emerald-200 bg-white px-3 py-2.5 text-sm text-emerald-900 placeholder:text-emerald-400 focus:outline-none focus:ring-2 focus:ring-emerald-400/60 focus:border-emerald-400"
                  placeholder="Enter password (min. 4 characters)"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <label
                  htmlFor="setup-confirm-password"
                  className="text-[11px] font-semibold text-emerald-700 uppercase tracking-[0.18em]"
                >
                  Confirm Password
                </label>
                <input
                  id="setup-confirm-password"
                  type="password"
                  value={confirmPassword}
                  onChange={(event) => setConfirmPassword(event.target.value)}
                  autoComplete="new-password"
                  className="w-full rounded-lg border border-emerald-200 bg-white px-3 py-2.5 text-sm text-emerald-900 placeholder:text-emerald-400 focus:outline-none focus:ring-2 focus:ring-emerald-400/60 focus:border-emerald-400"
                  placeholder="Re-enter password"
                  required
                />
              </div>

              {error && (
                <p
                  className="text-xs text-emerald-800 bg-emerald-50 border border-emerald-200 rounded-lg px-3 py-2"
                  role="alert"
                >
                  {error}
                </p>
              )}

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full inline-flex items-center justify-center rounded-lg bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white shadow-md hover:bg-emerald-700 disabled:opacity-60 disabled:cursor-not-allowed transition"
              >
                {isSubmitting ? 'Creating account...' : 'Create Account'}
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}