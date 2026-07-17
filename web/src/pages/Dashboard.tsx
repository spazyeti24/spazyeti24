import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import type { ApplicationStage, DashboardStats } from '@shared/types';
import { api } from '@/lib/api';
import { EmptyState, useToast } from '@/components/common';
import { cn, formatDate } from '@/lib/utils';
import { Card, CardContent, CardHeader, CardTitle, Spinner } from '@/components/ui/primitives';

const STAGE_ORDER: ApplicationStage[] = ['interested', 'applied', 'screening', 'interview', 'offer'];

export default function DashboardPage() {
  const toast = useToast();
  const [stats, setStats] = useState<DashboardStats | null>(null);

  useEffect(() => {
    api
      .get<DashboardStats>('/api/dashboard')
      .then(setStats)
      .catch((e: Error) => toast('error', `Failed to load dashboard: ${e.message}`));
  }, [toast]);

  if (!stats) {
    return <div className="flex justify-center p-10"><Spinner /></div>;
  }

  const totalActive = Object.values(stats.activeApplicationsByStage).reduce((a, b) => a + (b ?? 0), 0);

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <h2 className="text-2xl font-bold">Dashboard</h2>

      <div className="grid grid-cols-3 gap-4">
        <Link to="/jobs">
          <Card className="transition-colors hover:border-slate-400">
            <CardContent className="p-4">
              <div className="text-3xl font-bold">{stats.newJobs}</div>
              <div className="text-sm text-slate-500">new jobs awaiting review</div>
            </CardContent>
          </Card>
        </Link>
        <Link to="/jobs">
          <Card className="transition-colors hover:border-slate-400">
            <CardContent className="p-4">
              <div className="text-3xl font-bold">{stats.highScorersThisWeek}</div>
              <div className="text-sm text-slate-500">high scorers this week</div>
            </CardContent>
          </Card>
        </Link>
        <Link to="/tracker">
          <Card className="transition-colors hover:border-slate-400">
            <CardContent className="p-4">
              <div className="text-3xl font-bold">{totalActive}</div>
              <div className="text-sm text-slate-500">active applications</div>
            </CardContent>
          </Card>
        </Link>
      </div>

      <Card>
        <CardHeader><CardTitle>Pipeline</CardTitle></CardHeader>
        <CardContent>
          {totalActive === 0 ? (
            <p className="text-sm text-slate-400">No active applications yet.</p>
          ) : (
            <div className="flex gap-2">
              {STAGE_ORDER.map((stage) => {
                const count = stats.activeApplicationsByStage[stage] ?? 0;
                return (
                  <div key={stage} className="flex-1 rounded-md bg-slate-50 p-3 text-center">
                    <div className="text-xl font-semibold">{count}</div>
                    <div className="text-xs capitalize text-slate-500">{stage}</div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Upcoming next actions</CardTitle></CardHeader>
        <CardContent>
          {stats.upcomingActions.length === 0 ? (
            <EmptyState title="Nothing scheduled" hint="Set next actions on applications in the tracker." />
          ) : (
            <ul className="divide-y divide-slate-100">
              {stats.upcomingActions.map((a) => (
                <li key={a.applicationId} className="flex items-center gap-3 py-2 text-sm">
                  <span
                    className={cn(
                      'w-24 shrink-0 text-xs',
                      a.overdue ? 'font-semibold text-red-600' : 'text-slate-400',
                    )}
                  >
                    {a.overdue ? '⚠ overdue' : formatDate(a.nextActionDate)}
                  </span>
                  <span className="min-w-0 flex-1 truncate">
                    <span className="font-medium">{a.nextAction}</span>
                    <span className="text-slate-400"> — {a.company}, {a.jobTitle}</span>
                  </span>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
