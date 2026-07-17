import { useCallback, useEffect, useState } from 'react';
import type { ApplicationStage, ApplicationWithJob, MaterialType, Profile } from '@shared/types';
import { APPLICATION_STAGES } from '@shared/types';
import { api } from '@/lib/api';
import { EmptyState, MarkdownBlock, ScoreBadge, ScoreBreakdown, useToast } from '@/components/common';
import { cn, formatDate } from '@/lib/utils';
import { Badge, Button, Card, CardContent, Input, Label, Spinner, Textarea } from '@/components/ui/primitives';

const STAGE_LABELS: Record<ApplicationStage, string> = {
  interested: 'Interested',
  applied: 'Applied',
  screening: 'Screening',
  interview: 'Interview',
  offer: 'Offer',
  rejected: 'Rejected',
  withdrawn: 'Withdrawn',
};

const MATERIAL_LABELS: Record<MaterialType, string> = {
  resume_bullets: 'Resume bullets',
  cover_letter: 'Cover letter',
  outreach_message: 'Outreach message',
};

function isOverdue(dateIso: string | null): boolean {
  if (!dateIso) return false;
  return dateIso.slice(0, 10) < new Date().toISOString().slice(0, 10);
}

function DetailDrawer({
  app,
  threshold,
  onClose,
  onChanged,
}: {
  app: ApplicationWithJob;
  threshold: number;
  onClose: () => void;
  onChanged: () => Promise<void>;
}) {
  const toast = useToast();
  const [notes, setNotes] = useState(app.notes);
  const [nextAction, setNextAction] = useState(app.nextAction ?? '');
  const [nextActionDate, setNextActionDate] = useState(app.nextActionDate?.slice(0, 10) ?? '');
  const [generating, setGenerating] = useState<MaterialType | null>(null);
  const [regenNote, setRegenNote] = useState('');
  const [tab, setTab] = useState<'overview' | 'materials' | 'description'>('overview');

  const saveDetails = async () => {
    try {
      await api.put(`/api/applications/${app.id}`, {
        notes,
        nextAction: nextAction || null,
        nextActionDate: nextActionDate || null,
      });
      await onChanged();
      toast('success', 'Saved.');
    } catch (e) {
      toast('error', `Save failed: ${(e as Error).message}`);
    }
  };

  const generate = async (type: MaterialType) => {
    setGenerating(type);
    try {
      await api.post(`/api/applications/${app.id}/materials`, {
        type,
        note: regenNote || undefined,
      });
      setRegenNote('');
      await onChanged();
      setTab('materials');
      toast('success', `${MATERIAL_LABELS[type]} generated.`);
    } catch (e) {
      toast('error', `Generation failed: ${(e as Error).message}`);
    } finally {
      setGenerating(null);
    }
  };

  return (
    <div className="fixed inset-0 z-40 flex justify-end bg-black/30" onClick={onClose}>
      <div
        className="h-full w-full max-w-2xl overflow-y-auto bg-white p-6 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <h3 className="text-xl font-bold">{app.job.title}</h3>
            <p className="text-slate-600">{app.job.company} · {app.job.location || '—'}</p>
            <div className="mt-1 flex items-center gap-2 text-xs text-slate-400">
              <Badge variant="blue">{STAGE_LABELS[app.stage]}</Badge>
              {app.appliedAt && <span>applied {formatDate(app.appliedAt)}</span>}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <ScoreBadge score={app.score} threshold={threshold} />
            <Button variant="ghost" size="sm" onClick={onClose}>✕</Button>
          </div>
        </div>

        <div className="mt-4 flex gap-1 border-b border-slate-200">
          {(['overview', 'materials', 'description'] as const).map((t) => (
            <button
              key={t}
              className={cn(
                'px-3 py-2 text-sm font-medium capitalize',
                tab === t ? 'border-b-2 border-slate-900 text-slate-900' : 'text-slate-400 hover:text-slate-600',
              )}
              onClick={() => setTab(t)}
            >
              {t} {t === 'materials' && app.materials.length > 0 ? `(${app.materials.length})` : ''}
            </button>
          ))}
        </div>

        {tab === 'overview' && (
          <div className="mt-4 space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Next action</Label>
                <Input value={nextAction} placeholder="e.g. Follow up with recruiter" onChange={(e) => setNextAction(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label>Next action date</Label>
                <Input type="date" value={nextActionDate} onChange={(e) => setNextActionDate(e.target.value)} />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Notes</Label>
              <Textarea rows={6} value={notes} onChange={(e) => setNotes(e.target.value)} />
            </div>
            <Button onClick={() => void saveDetails()}>Save</Button>
            {app.score && (
              <div className="pt-2">
                <h4 className="mb-2 font-semibold">Score breakdown</h4>
                <ScoreBreakdown score={app.score} />
              </div>
            )}
          </div>
        )}

        {tab === 'materials' && (
          <div className="mt-4 space-y-4">
            <div className="space-y-2 rounded-md border border-slate-200 p-3">
              <div className="flex flex-wrap gap-2">
                {(Object.keys(MATERIAL_LABELS) as MaterialType[]).map((type) => (
                  <Button
                    key={type}
                    size="sm"
                    variant="secondary"
                    disabled={generating !== null}
                    onClick={() => void generate(type)}
                  >
                    {generating === type ? <Spinner /> : null}
                    Generate {MATERIAL_LABELS[type].toLowerCase()}
                  </Button>
                ))}
              </div>
              <Input
                placeholder="Optional note, e.g. “emphasize measurement experience”"
                value={regenNote}
                onChange={(e) => setRegenNote(e.target.value)}
              />
            </div>
            {app.materials.length === 0 ? (
              <EmptyState title="No materials yet" hint="Generate tailored bullets, a cover letter, or an outreach message above." />
            ) : (
              app.materials.map((m) => (
                <div key={m.id} className="space-y-1">
                  <div className="flex items-center gap-2 text-sm">
                    <span className="font-semibold">{MATERIAL_LABELS[m.type]}</span>
                    <span className="text-xs text-slate-400">{new Date(m.createdAt).toLocaleString()}</span>
                  </div>
                  <MarkdownBlock content={m.content} />
                </div>
              ))
            )}
          </div>
        )}

        {tab === 'description' && (
          <p className="mt-4 whitespace-pre-wrap text-sm leading-relaxed text-slate-700">
            {app.job.description}
          </p>
        )}
      </div>
    </div>
  );
}

export default function TrackerPage() {
  const toast = useToast();
  const [apps, setApps] = useState<ApplicationWithJob[] | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [dragId, setDragId] = useState<number | null>(null);
  const [dragOverStage, setDragOverStage] = useState<ApplicationStage | null>(null);

  const load = useCallback(async () => {
    try {
      const [a, p] = await Promise.all([
        api.get<ApplicationWithJob[]>('/api/applications'),
        api.get<Profile>('/api/profile'),
      ]);
      setApps(a);
      setProfile(p);
    } catch (e) {
      toast('error', `Failed to load tracker: ${(e as Error).message}`);
    }
  }, [toast]);

  useEffect(() => {
    void load();
  }, [load]);

  const moveTo = async (appId: number, stage: ApplicationStage) => {
    try {
      await api.put(`/api/applications/${appId}`, { stage });
      await load();
    } catch (e) {
      toast('error', `Move failed: ${(e as Error).message}`);
    }
  };

  if (apps === null || profile === null) {
    return <div className="flex justify-center p-10"><Spinner /></div>;
  }

  const selected = selectedId !== null ? apps.find((a) => a.id === selectedId) ?? null : null;

  return (
    <div className="space-y-4">
      <h2 className="text-2xl font-bold">Application Tracker</h2>
      {apps.length === 0 ? (
        <EmptyState title="No applications yet" hint="Score a job on the Jobs page, then “Add to tracker.”" />
      ) : (
        <div className="flex gap-3 overflow-x-auto pb-4">
          {APPLICATION_STAGES.map((stage) => {
            const column = apps.filter((a) => a.stage === stage);
            return (
              <div
                key={stage}
                className={cn(
                  'w-64 shrink-0 rounded-lg bg-slate-100 p-2',
                  dragOverStage === stage && 'ring-2 ring-slate-400',
                )}
                onDragOver={(e) => {
                  e.preventDefault();
                  setDragOverStage(stage);
                }}
                onDragLeave={() => setDragOverStage(null)}
                onDrop={(e) => {
                  e.preventDefault();
                  setDragOverStage(null);
                  if (dragId !== null) void moveTo(dragId, stage);
                  setDragId(null);
                }}
              >
                <div className="mb-2 flex items-center justify-between px-1">
                  <span className="text-sm font-semibold text-slate-600">{STAGE_LABELS[stage]}</span>
                  <span className="text-xs text-slate-400">{column.length}</span>
                </div>
                <div className="space-y-2">
                  {column.map((app) => {
                    const overdue = isOverdue(app.nextActionDate);
                    return (
                      <Card
                        key={app.id}
                        draggable
                        onDragStart={() => setDragId(app.id)}
                        onDragEnd={() => setDragId(null)}
                        className={cn('cursor-grab active:cursor-grabbing', overdue && 'border-red-400')}
                        onClick={() => setSelectedId(app.id)}
                      >
                        <CardContent className="space-y-1 p-3">
                          <div className="flex items-center justify-between gap-2">
                            <span className="truncate text-sm font-medium">{app.job.company}</span>
                            <ScoreBadge score={app.score} threshold={profile.scoreThreshold} />
                          </div>
                          <div className="truncate text-xs text-slate-500">{app.job.title}</div>
                          {app.nextAction && (
                            <div className={cn('text-xs', overdue ? 'font-medium text-red-600' : 'text-slate-400')}>
                              {overdue ? '⚠ ' : '→ '}
                              {app.nextAction}
                              {app.nextActionDate ? ` · ${formatDate(app.nextActionDate)}` : ''}
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {selected && (
        <DetailDrawer
          app={selected}
          threshold={profile.scoreThreshold}
          onClose={() => setSelectedId(null)}
          onChanged={load}
        />
      )}
    </div>
  );
}
