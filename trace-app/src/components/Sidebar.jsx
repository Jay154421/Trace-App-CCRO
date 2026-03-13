import { NavLink } from 'react-router-dom';

const nav = [
  { to: '/', label: 'Dashboard', icon: 'dashboard' },
  { to: '/children', label: 'Applicants', icon: 'people' },
];

const icons = {
  dashboard: (
    <svg className="w-5 h-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
    </svg>
  ),
  people: (
    <svg className="w-5 h-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
    </svg>
  ),
};

export function Sidebar() {
  return (
    <aside
      className="w-56 bg-white border-r border-slate-200 flex flex-col shrink-0 print:hidden sticky top-0 h-screen"
      role="navigation"
      aria-label="Main navigation"
    >
      <div className="p-4 border-b border-slate-200 flex items-center gap-3">
        <img src="/icon.jpg" alt="" className="w-10 h-10 rounded-full object-cover shrink-0" />
        <div className="min-w-0 text-left">
          <h1 className="font-semibold text-lg tracking-tight text-slate-800">TRACE</h1>
          <p className="text-slate-500 text-xs mt-0.5">Document requirements</p>
        </div>
      </div>

      <nav className="px-3 flex-1 mt-3">
        <ul className="space-y-0.5">
          {nav.map(({ to, label, icon }) => (
            <li key={to}>
              <NavLink
                to={to}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400 focus-visible:ring-offset-2 ${
                    isActive
                      ? 'bg-emerald-50 text-emerald-700'
                      : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                  }`
                }
                end={to === '/'}
              >
                {icons[icon]}
                {label}
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>
    </aside>
  );
}
