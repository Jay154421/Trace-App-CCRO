import { useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';

export function Login() {
  const navigate = useNavigate();
  const { isAuthenticated, login } = useAuth();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (isAuthenticated) {
    return <Navigate to="/" replace />;
  }

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError('');
    setIsSubmitting(true);

    try {
      const loggedInUser = login(username.trim(), password);
      if (!loggedInUser) {
        setError('Invalid credentials.');
        return;
      }
      navigate('/', { replace: true });
    } finally {
      setIsSubmitting(false);
    }
  };

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
              <p className="text-[16px] font-semibold  tracking-[0.10em] text-white/90">Birth Tracking for Registration and Certificate Entries</p>
            </div>
          </div>
          <p className="text-xs text-center text-white/80">
            {`© ${new Date().getFullYear()} City Civil Registrar Office • B-TRACE System`}
          </p>
          <p className="text-xs text-center text-white/60">
            Developed by CS students, St. Peter&apos;s College
          </p>
        </div>

        <div className="bg-white p-8 md:p-12 flex items-center justify-center">
          <div className="w-full max-w-md">
            <div className="space-y-2 mb-8">
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-emerald-700">Login</p>
              <h3 className="text-2xl font-semibold text-emerald-900">Welcome back!</h3>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5"> 
              <div className="space-y-1.5">
                <label
                  htmlFor="username"
                  className="text-[11px] font-semibold text-emerald-700 uppercase tracking-[0.18em]"
                >
                  Username
                </label>
                <input
                  id="username"
                  type="text"
                  value={username}
                  onChange={(event) => setUsername(event.target.value)}
                  autoComplete="username"
                  className="w-full rounded-lg border border-emerald-200 bg-white px-3 py-2.5 text-sm text-emerald-900 placeholder:text-emerald-400 focus:outline-none focus:ring-2 focus:ring-emerald-400/60 focus:border-emerald-400"
                  placeholder="Enter your username"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <label
                  htmlFor="password"
                  className="text-[11px] font-semibold text-emerald-700 uppercase tracking-[0.18em]"
                >
                  Password
                </label>
                <input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  autoComplete="current-password"
                  className="w-full rounded-lg border border-emerald-200 bg-white px-3 py-2.5 text-sm text-emerald-900 placeholder:text-emerald-400 focus:outline-none focus:ring-2 focus:ring-emerald-400/60 focus:border-emerald-400"
                  placeholder="Enter your password"
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
                {isSubmitting ? 'Signing in...' : 'Login'}
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
