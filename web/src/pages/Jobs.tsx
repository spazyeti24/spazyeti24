import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import type { JobWithScore, Profile, ScoreProgress } from '@shared/types';
import { api } from '@/lib/api';
import { EmptyState, ScoreBadge, ScoreBreakdown, useToast } from '@/components/common';
import { formatDate } from '@/lib/utils';
import { Badge, Button, Card, CardContent, Input, Select, Spinner } from '@/components/ui/primitives';

type SortKey = 'score' | 'date' | 'company';

function JobDrawer({
  job,
  threshold,
  onClose,
  onDismiss,
  onScore,
  onTrack,
  busy,
}: {
  job: JobWithScore;
  threshold: number;
  onClose: () => void;
  onDismiss: () => void;
  onScore: () => void;
  onTrack: () => void;
  busy: boolean;
}) {
  return (
    <div className="fixed inset-0 z-40 flex justify-end bg-black/30" onClick={onClose}>
      <div
        className="h-full w-full max-w-2xl overflow-y-auto bg-white p-6 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <h3 className="text-xl font-bold">{job.title}</h3>
            <p className="text-slate-600">
              {job.company} · {job.location || 'Location n/a'} {job.remote && <Badge variant="blue">remote</Badge>}
            </p>
            {job.salaryText && <p className="mt-1 text-sm text-slate-500">{job.salaryText}</p>}
            <p className="mt-1 text-xs text-slate-400">
              {job.source} · posted {formatDate(job.postedAt)} · fetched {formatDate(job.fetchedAt)}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <ScoreBadge score={job.score} threshold={threshold} />
            <Button variant="ghost" size="sm" onClick={onClose}>✕</Button>
          </div>
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          {job.url && (
            <a href={job.url} target="_blank" rel="noreferrer">
              <Button size="sm" variant="outline">Open posting ↗</Button>
            </a>
          )}
          <Button size="sm" onClick={onScore} disabled={busy}>
            {job.score ? 'Re-score' : 'Score'}
          </Button>
          {job.score && !job.applicationId && (
            <Button size="sm" variant="secondary" onClick={onTrack} disabled={busy}>
              Add to tracker
            </Button>
          )}
          {job.applicationId && <Badge variant="green">In tracker</Badge>}
          {job.status !== 'dismissed' && (
            <Button size="sm" variant="destructive" onClick={onDismiss} disabled={busy}>
              Dismiss
            </Button>
          )}
        </div>

        {job.score && (
          <div className="mt-6">
            <h4 className="mb-2 font-semibold">Score breakdown</h4>
            <ScoreBreakdown score={job.score} />
          </div>
        )}

        <div className="mt-6">
          <h4 className="mb-2 font-semibold">Full description</h4>
          <p className="whitespace-pre-wrap text-sm leading-relaxed text-slate-700">{job.description}</p>
        </div>
      </div>
    </div>
  );
}

export default function JobsPage() {
  const toast = useToast();
  const navigate = useNavigate();
  const [jobs, setJobs] = useState<JobWithScore[] | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [progress, setProgress] = useState<ScoreProgress | null>(null);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);
  const pollRef = useRef<number | null>(null);

  const [sortKey, setSortKey] = useState<SortKey>('score');
  const [sourceFilter, setSourceFilter] = useState('all');
  const [remoteOnly, setRemoteOnly] = useState(false);
  const [hideDismissed, setHideDismissed] = useState(true);
  const [search, setSearch] = useState('');

  const load = useCallback(async () => {
    try {
      const [j, p] = await Promise.all([
        api.get<JobWithScore[]>('/api/jobs'),
        api.get<Profile>('/api/profile'),
      ]);
      setJobs(j);
      setProfile(p);
    } catch (e) {
      toast('error', `Failed to load jobs: ${(e as Error).message}`);
    }
  }, [toast]);

  useEffect(() => {
    void load();
    return () => {
      if (pollRef.current) window.clearInterval(pollRef.current);
    };
  }, [load]);

  const startPolling = () => {
    if (pollRef.current) window.clearInterval(pollRef.current);
    pollRef.current = window.setInterval(async () => {
      try {
        const p = await api.get<ScoreProgress>('/api/jobs/score-progress');
        setProgress(p);
        if (!p.running) {
          if (pollRef.current) window.clearInterval(pollRef.current);
          pollRef.current = null;
          await load();
          if (p.errors.length > 0) {
            toast('error', `Scoring finished with ${p.errors.length} error(s): ${p.errors[0].message}`);
          } else if (p.total > 0) {
            toast('success', `Scored ${p.total} job(s).`);
          }
        }
      } catch {
        // transient poll failure — keep trying until the run reports done
      }
    }, 1200);
  };

  const scoreNew = async () => {
    try {
      const res = await api.post<{ started: boolean; total: number }>('/api/jobs/score-new');
      if (!res.started) {
        toast('success', 'No new jobs to score.');
        return;
      }
      setProgress({ running: true, total: res.total, done: 0, errors: [] });
      startPolling();
    } catch (e) {
      toast('error', `Could not start scoring: ${(e as Error).message}`);
    }
  };

  const scoreOne = async (id: number) => {
    setBusy(true);
    try {
      await api.post(`/api/jobs/${id}/score`);
      await load();
      toast('success', 'Job scored.');
    } catch (e) {
      toast('error', `Scoring failed: ${(e as Error).message}`);
    } finally {
      setBusy(false);
    }
  };

  const dismiss = async (id: number) => {
    setBusy(true);
    try {
      await api.post(`/api/jobs/${id}/dismiss`);
      setSelectedId(null);
      await load();
    } catch (e) {
      toast('error', `Dismiss failed: ${(e as Error).message}`);
    } finally {
      setBusy(false);
    }
  };

  const track = async (jobId: number) => {
    setBusy(true);
    try {
      await api.post('/api/applications', { jobId });
      await load();
      toast('success', 'Added to tracker.');
      navigate('/tracker');
    } catch (e) {
      toast('error', `Could not add to tracker: ${(e as Error).message}`);
    } finally {
      setBusy(false);
    }
  };

  if (jobs === null || profile === null) {
    return <div className="flex justify-center p-10"><Spinner /></div>;
  }

  const threshold = profile.scoreThreshold;
  const sources = Array.from(new Set(jobs.map((j) => j.source)));

  const visible = jobs
    .filter((j) => (hideDismissed ? j.status !== 'dismissed' : true))
    .filter((j) => (sourceFilter === 'all' ? true : j.source === sourceFilter))
    .filter((j) => (remoteOnly ? j.remote : true))
    .filter((j) =>
      search
        ? `${j.title} ${j.company} ${j.location}`.toLowerCase().includes(search.toLowerCase())
        : true,
    )
    .sort((a, b) => {
      if (sortKey === 'score') return (b.score?.overall ?? -1) - (a.score?.overall ?? -1);
      if (sortKey === 'company') return a.company.localeCompare(b.company);
      return (b.postedAt ?? b.fetchedAt).localeCompare(a.postedAt ?? a.fetchedAt);
    });

  const selected = selectedId !== null ? jobs.find((j) => j.id === selectedId) ?? null : null;
  const newCount = jobs.filter((j) => j.status === 'new').length;

  return (
    <div className="mx-auto max-w-5xl space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Jobs</h2>
        <Button onClick={() => void scoreNew()} disabled={progress?.running || newCount === 0}>
          Score new jobs{newCount > 0 ? ` (${newCount})` : ''}
        </Button>
      </div>

      {progress?.running && (
        <Card>
          <CardContent className="flex items-center gap-3 p-4">
            <Spinner />
            <div className="flex-1">
              <div className="text-sm font-medium">
                Scoring {progress.done}/{progress.total}…
              </div>
              <div className="mt-1 h-2 overflow-hidden rounded-full bg-slate-200">
                <div
                  className="h-full bg-slate-900 transition-all"
                  style={{ width: `${progress.total ? (progress.done / progress.total) * 100 : 0}%` }}
                />
              </div>
            </div>
            {progress.errors.length > 0 && (
              <Badge variant="red">{progress.errors.length} error(s)</Badge>
            )}
          </CardContent>
        </Card>
      )}

      <div className="flex flex-wrap items-center gap-3">
        <Input
          placeholder="Filter by title, company, location…"
          className="max-w-xs"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <Select className="w-36" value={sourceFilter} onChange={(e) => setSourceFilter(e.target.value)}>
          <option value="all">All sources</option>
          {sources.map((s) => (
            <option key={s} value={s}>{s}</option>
          ))}
        </Select>
        <Select className="w-40" value={sortKey} onChange={(e) => setSortKey(e.target.value as SortKey)}>
          <option value="score">Sort: score</option>
          <option value="date">Sort: date</option>
          <option value="company">Sort: company</option>
        </Select>
        <label className="flex items-center gap-1.5 text-sm">
          <input type="checkbox" checked={remoteOnly} onChange={(e) => setRemoteOnly(e.target.checked)} />
          Remote only
        </label>
        <label className="flex items-center gap-1.5 text-sm">
          <input type="checkbox" checked={hideDismissed} onChange={(e) => setHideDismissed(e.target.checked)} />
          Hide dismissed
        </label>
        <span className="ml-auto text-sm text-slate-400">{visible.length} job(s)</span>
      </div>

      {visible.length === 0 ? (
        <EmptyState
          title="No jobs match"
          hint={jobs.length === 0 ? 'Run a saved search to fetch listings, or run the seed script.' : 'Try loosening the filters.'}
        />
      ) : (
        <div className="space-y-2">
          {visible.map((job) => (
            <Card
              key={job.id}
              className="cursor-pointer transition-colors hover:border-slate-400"
              onClick={() => setSelectedId(job.id)}
            >
              <CardContent className="flex items-center gap-3 p-3">
                <ScoreBadge score={job.score} threshold={threshold} />
                <div className="min-w-0 flex-1">
                  <div className="truncate font-medium">{job.title}</div>
                  <div className="truncate text-sm text-slate-500">
                    {job.company} · {job.location || '—'}
                  </div>
                </div>
                {job.remote && <Badge variant="blue">remote</Badge>}
                {job.status === 'dismissed' && <Badge variant="gray">dismissed</Badge>}
                {job.applicationId && <Badge variant="green">tracked</Badge>}
                <Badge variant="gray">{job.source}</Badge>
                <span className="w-24 text-right text-xs text-slate-400">{formatDate(job.postedAt ?? job.fetchedAt)}</span>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={(e) => {
                    e.stopPropagation();
                    void dismiss(job.id);
                  }}
                  title="Dismiss"
                >
                  ✕
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {selected && (
        <JobDrawer
          job={selected}
          threshold={threshold}
          busy={busy}
          onClose={() => setSelectedId(null)}
          onDismiss={() => void dismiss(selected.id)}
          onScore={() => void scoreOne(selected.id)}
          onTrack={() => void track(selected.id)}
        />
      )}
    </div>
  );
}
