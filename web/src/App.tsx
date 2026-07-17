import { useEffect, useState } from 'react';
import { NavLink, Navigate, Route, Routes } from 'react-router-dom';
import type { StatusResponse } from '@shared/types';
import { api } from '@/lib/api';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/primitives';
import { ToastProvider } from '@/components/common';
import DashboardPage from '@/pages/Dashboard';
import ProfilePage from '@/pages/Profile';
import SearchesPage from '@/pages/Searches';
import JobsPage from '@/pages/Jobs';
import TrackerPage from '@/pages/Tracker';

const NAV = [
  { to: '/dashboard', label: 'Dashboard' },
  { to: '/jobs', label: 'Jobs' },
  { to: '/searches', label: 'Searches' },
  { to: '/tracker', label: 'Tracker' },
  { to: '/profile', label: 'Profile' },
];

function StatusPanel() {
  const [status, setStatus] = useState<StatusResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api
      .get<StatusResponse>('/api/status')
      .then(setStatus)
      .catch((e: Error) => setError(e.message));
  }, []);

  if (error) {
    return (
      <div className="rounded-md border border-red-300 bg-red-50 p-2 text-xs text-red-800">
        Server unreachable: {error}
      </div>
    );
  }
  if (!status) return null;
  const items: [string, boolean][] = [
    ['Claude', status.integrations.anthropic],
    ['JSearch', status.integrations.jsearch],
    ['Adzuna', status.integrations.adzuna],
  ];
  return (
    <div className="space-y-1.5">
      <div className="text-xs font-semibold uppercase tracking-wide text-slate-400">Integrations</div>
      <div className="flex flex-wrap gap-1.5">
        {items.map(([name, active]) => (
          <Badge key={name} variant={active ? 'green' : 'red'} title={active ? 'Configured' : 'Missing API key(s) in .env'}>
            {name} {active ? '✓' : '✗'}
          </Badge>
        ))}
      </div>
      {(!status.integrations.jsearch && !status.integrations.adzuna) && (
        <p className="text-xs text-red-600">No job sources configured — fetching is disabled.</p>
      )}
      {!status.integrations.anthropic && (
        <p className="text-xs text-red-600">No Anthropic key — scoring &amp; tailoring disabled.</p>
      )}
      <p className="text-xs text-slate-400">Model: {status.model}</p>
    </div>
  );
}

export default function App() {
  return (
    <ToastProvider>
      <div className="flex min-h-screen">
        <aside className="flex w-52 flex-col border-r border-slate-200 bg-white p-4">
          <h1 className="mb-6 text-lg font-bold">JobHunt OS</h1>
          <nav className="flex flex-col gap-1">
            {NAV.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) =>
                  cn(
                    'rounded-md px-3 py-2 text-sm font-medium',
                    isActive ? 'bg-slate-900 text-white' : 'text-slate-600 hover:bg-slate-100',
                  )
                }
              >
                {item.label}
              </NavLink>
            ))}
          </nav>
          <div className="mt-auto pt-6">
            <StatusPanel />
          </div>
        </aside>
        <main className="flex-1 overflow-x-hidden p-6">
          <Routes>
            <Route path="/" element={<Navigate to="/dashboard" replace />} />
            <Route path="/dashboard" element={<DashboardPage />} />
            <Route path="/jobs" element={<JobsPage />} />
            <Route path="/searches" element={<SearchesPage />} />
            <Route path="/tracker" element={<TrackerPage />} />
            <Route path="/profile" element={<ProfilePage />} />
          </Routes>
        </main>
      </div>
    </ToastProvider>
  );
}
