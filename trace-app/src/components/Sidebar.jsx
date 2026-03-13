import { NavLink } from 'react-router-dom';

const nav = [
  { to: '/', label: 'Dashboard' },
  { to: '/children', label: 'Applicants' },
];

export function Sidebar() {
  return (
    <aside
      className="w-56 bg-slate-800 text-white flex flex-col shrink-0 print:hidden"
      role="navigation"
      aria-label="Main navigation"
    >
      <div className="p-4 border-b border-slate-700">
        <h1 className="font-semibold text-lg tracking-tight">TRACE System</h1>
        <p className="text-slate-400 text-xs mt-0.5">Document requirements</p>
      </div>
      <nav className="p-2 flex-1">
        <ul className="space-y-0.5">
          {nav.map(({ to, label }) => (
            <li key={to}>
              <NavLink
                to={to}
                className={({ isActive }) =>
                  `block px-3 py-2 rounded-md text-sm font-medium transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-400 ${
                    isActive ? 'bg-slate-700 text-white' : 'text-slate-300 hover:bg-slate-700/70 hover:text-white'
                  }`
                }
                end={to === '/'}
              >
                {label}
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>
    </aside>
  );
}
