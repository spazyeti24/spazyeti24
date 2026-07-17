import { useEffect, useState } from 'react';
import type { FetchRunSummary, SavedSearch } from '@shared/types';
import { api } from '@/lib/api';
import { EmptyState, useToast } from '@/components/common';
import { formatDate } from '@/lib/utils';
import { Badge, Button, Card, CardContent, CardHeader, CardTitle, Input, Label, Spinner } from '@/components/ui/primitives';

const AUTO_SCORE_KEY = 'jobhunt.autoScoreAfterFetch';

function SummaryView({ summaries }: { summaries: FetchRunSummary[] }) {
  return (
    <Card>
      <CardHeader><CardTitle>Last fetch results</CardTitle></CardHeader>
      <CardContent className="space-y-3">
        {summaries.map((s) => (
          <div key={`${s.searchId}`} className="text-sm">
            <div className="font-medium">“{s.query}”</div>
            <ul className="mt-1 space-y-1">
              {s.results.map((r) => (
                <li key={r.source} className="flex flex-wrap items-center gap-2">
                  <Badge variant="blue">{r.source}</Badge>
                  {r.error ? (
                    <span className="text-red-700">Error: {r.error}</span>
                  ) : (
                    <span className="text-slate-600">
                      {r.inserted} new · {r.duplicates} duplicates · {r.fetched} fetched
                    </span>
                  )}
                </li>
              ))}
            </ul>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

export default function SearchesPage() {
  const toast = useToast();
  const [searches, setSearches] = useState<SavedSearch[] | null>(null);
  const [summaries, setSummaries] = useState<FetchRunSummary[]>([]);
  const [runningId, setRunningId] = useState<number | 'all' | null>(null);
  const [autoScore, setAutoScore] = useState(() => localStorage.getItem(AUTO_SCORE_KEY) === '1');

  // New-search form
  const [query, setQuery] = useState('');
  const [location, setLocation] = useState('');
  const [sources, setSources] = useState<('jsearch' | 'adzuna')[]>(['jsearch', 'adzuna']);

  const load = () =>
    api
      .get<SavedSearch[]>('/api/searches')
      .then(setSearches)
      .catch((e: Error) => toast('error', `Failed to load searches: ${e.message}`));

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const toggleAutoScore = (on: boolean) => {
    setAutoScore(on);
    localStorage.setItem(AUTO_SCORE_KEY, on ? '1' : '0');
  };

  const maybeAutoScore = async (results: FetchRunSummary[]) => {
    const inserted = results.flatMap((s) => s.results).reduce((n, r) => n + r.inserted, 0);
    if (autoScore && inserted > 0) {
      try {
        await api.post('/api/jobs/score-new');
        toast('success', `Auto-scoring ${inserted} new job(s) — watch progress on the Jobs page.`);
      } catch (e) {
        toast('error', `Auto-score failed to start: ${(e as Error).message}`);
      }
    }
  };

  const runOne = async (id: number) => {
    setRunningId(id);
    try {
      const summary = await api.post<FetchRunSummary>(`/api/searches/${id}/run`);
      setSummaries([summary]);
      await load();
      await maybeAutoScore([summary]);
    } catch (e) {
      toast('error', `Fetch failed: ${(e as Error).message}`);
    } finally {
      setRunningId(null);
    }
  };

  const runAll = async () => {
    setRunningId('all');
    try {
      const all = await api.post<FetchRunSummary[]>('/api/searches/run-all');
      setSummaries(all);
      await load();
      await maybeAutoScore(all);
    } catch (e) {
      toast('error', `Fetch failed: ${(e as Error).message}`);
    } finally {
      setRunningId(null);
    }
  };

  const create = async () => {
    if (!query.trim()) {
      toast('error', 'Search query is required');
      return;
    }
    try {
      await api.post<SavedSearch>('/api/searches', { query: query.trim(), location: location.trim(), sources });
      setQuery('');
      setLocation('');
      await load();
    } catch (e) {
      toast('error', `Could not create search: ${(e as Error).message}`);
    }
  };

  const update = async (id: number, patch: Partial<SavedSearch>) => {
    try {
      await api.put<SavedSearch>(`/api/searches/${id}`, patch);
      await load();
    } catch (e) {
      toast('error', `Update failed: ${(e as Error).message}`);
    }
  };

  const remove = async (id: number) => {
    try {
      await api.delete(`/api/searches/${id}`);
      await load();
    } catch (e) {
      toast('error', `Delete failed: ${(e as Error).message}`);
    }
  };

  const toggleSource = (s: 'jsearch' | 'adzuna') =>
    setSources((cur) => (cur.includes(s) ? cur.filter((x) => x !== s) : [...cur, s]));

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Saved Searches</h2>
        <div className="flex items-center gap-4">
          <label className="flex items-center gap-2 text-sm text-slate-600">
            <input
              type="checkbox"
              checked={autoScore}
              onChange={(e) => toggleAutoScore(e.target.checked)}
            />
            Auto-score after fetch
          </label>
          <Button onClick={() => void runAll()} disabled={runningId !== null}>
            {runningId === 'all' ? <Spinner className="border-white/40 border-t-white" /> : null}
            Run all
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader><CardTitle>New search</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="q">Query</Label>
              <Input id="q" placeholder="e.g. product manager fintech" value={query} onChange={(e) => setQuery(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="loc">Location (optional)</Label>
              <Input id="loc" placeholder="e.g. Chicago, IL" value={location} onChange={(e) => setLocation(e.target.value)} />
            </div>
          </div>
          <div className="flex items-center gap-4">
            {(['jsearch', 'adzuna'] as const).map((s) => (
              <label key={s} className="flex items-center gap-1.5 text-sm">
                <input type="checkbox" checked={sources.includes(s)} onChange={() => toggleSource(s)} />
                {s}
              </label>
            ))}
            <Button size="sm" className="ml-auto" onClick={() => void create()}>Add search</Button>
          </div>
        </CardContent>
      </Card>

      {searches === null ? (
        <div className="flex justify-center p-10"><Spinner /></div>
      ) : searches.length === 0 ? (
        <EmptyState title="No saved searches yet" hint="Add one above, then run it to fetch jobs." />
      ) : (
        <div className="space-y-3">
          {searches.map((s) => (
            <Card key={s.id}>
              <CardContent className="flex items-center gap-3 p-4">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{s.query}</span>
                    {s.location && <span className="text-sm text-slate-500">in {s.location}</span>}
                    {!s.enabled && <Badge variant="gray">disabled</Badge>}
                  </div>
                  <div className="mt-1 flex items-center gap-2 text-xs text-slate-400">
                    <span>Sources: {s.sources.length ? s.sources.join(', ') : 'all configured'}</span>
                    <span>· Last run: {formatDate(s.lastRunAt)}</span>
                  </div>
                </div>
                <Button size="sm" variant="outline" onClick={() => void update(s.id, { enabled: !s.enabled })}>
                  {s.enabled ? 'Disable' : 'Enable'}
                </Button>
                <Button size="sm" onClick={() => void runOne(s.id)} disabled={runningId !== null}>
                  {runningId === s.id ? <Spinner className="border-white/40 border-t-white" /> : null}
                  Run now
                </Button>
                <Button size="sm" variant="destructive" onClick={() => void remove(s.id)}>Delete</Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {summaries.length > 0 && <SummaryView summaries={summaries} />}
    </div>
  );
}
