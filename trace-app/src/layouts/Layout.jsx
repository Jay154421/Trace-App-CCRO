import { Outlet } from 'react-router-dom';
import { Sidebar } from '../components/Sidebar';

export function Layout() {
  return (
    <div className="min-h-screen flex">
      <Sidebar />
      <main className="flex-1 p-6 overflow-auto" aria-label="Main content">
        <Outlet />
      </main>
    </div>
  );
}
