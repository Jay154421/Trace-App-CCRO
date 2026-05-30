import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';

const nav = [
  { to: '/', label: 'Dashboard', icon: 'dashboard' },
  { to: '/children', label: 'Late Registration', icon: 'clipboardDocumentList' },
  { to: '/colb-brap', label: 'Late Registration (BRAP)', icon: 'documentText' },
];

const icons = {
  dashboard: (
    <svg className="w-5 h-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
    </svg>
  ),
  clipboardDocumentList: (
    <svg className="w-5 h-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01"
      />
    </svg>
  ),
  documentText: (
    <svg className="w-5 h-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
      />
    </svg>
  ),
  logout: (
    <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H9m4 4v1a2 2 0 01-2 2H6a2 2 0 01-2-2V7a2 2 0 012-2h5a2 2 0 012 2v1" />
    </svg>
  ),
};

export function Sidebar() {
  const navigate = useNavigate();
  const { logout } = useAuth();

  const handleLogout = () => {
    logout();
    navigate('/login', { replace: true });
  };

  return (
    <aside
      className="w-64 bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/80 border-r border-slate-200/80 flex flex-col shrink-0 print:hidden sticky top-0 h-screen"
      role="navigation"
      aria-label="Main navigation"
    >
      <div className="px-4 pt-5 pb-4 border-b border-slate-200/80">
        <div className="flex items-center gap-3">
          <img
            src="/ccro-logo.png"
            alt=""
            width={44}
            height={44}
            decoding="async"
            className="w-11 h-11 ring-slate-200 shrink-0 object-contain"
          />
          <div className="min-w-0 text-left">
            <h1 className="font-semibold text-lg tracking-tight text-slate-900">B-TRACE</h1>
            <p className="text-[10px] text-slate-500 leading-tight">
             Birth Tracking for Registration and Certificate Entries
            </p>
          </div>
        </div>
        <p className="mt-3 inline-flex items-center rounded-full border border-emerald-100 bg-emerald-50 px-2.5 py-1 text-[11px] font-medium text-emerald-700">
          Document Requirements
        </p>
      </div>

      <nav className="px-3 py-4 flex-1">
        <p className="px-3 text-[11px] font-semibold uppercase tracking-wide text-slate-400 mb-2">Main menu</p>
        <ul className="space-y-1">
          {nav.map(({ to, label, icon }) => (
            <li key={to}>
              <NavLink
                to={to}
                className={({ isActive }) =>
                  `group relative flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400 focus-visible:ring-offset-2 ${
                    isActive
                      ? 'bg-gradient-to-r from-emerald-50 to-emerald-100/60 text-emerald-800 shadow-sm hover:from-emerald-100/90 hover:to-emerald-100/80 hover:text-emerald-900'
                      : 'text-slate-600 hover:bg-slate-100/80 hover:text-slate-900'
                  }`
                }
                end={to === '/'}
              >
                {({ isActive }) => (
                  <>
                    {isActive && (
                      <span
                        className="absolute left-0 top-1/2 -translate-y-1/2 h-6 w-1 rounded-r-full bg-emerald-500"
                        aria-hidden="true"
                      />
                    )}
                    <span className={isActive ? 'text-emerald-700' : 'text-slate-400 group-hover:text-slate-600'}>
                      {icons[icon]}
                    </span>
                    <span>{label}</span>
                  </>
                )}
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>

      <div className="p-3 border-t border-slate-200/80">
        <button
          type="button"
          onClick={handleLogout}
          className="w-full inline-flex items-center justify-center gap-2 px-3 py-2 rounded-xl text-sm font-medium text-slate-600 bg-white border border-slate-200 hover:bg-slate-100 hover:text-slate-900 transition-colors"
        >
          {icons.logout}
          <span>Logout</span>
        </button>
      </div>
    </aside>
  );
}
