import { Router } from 'express';
import { z } from 'zod';
import { desc, eq } from 'drizzle-orm';
import { db, schema } from '../db/index.js';
import { asyncHandler, HttpError } from '../errors.js';
import { getScoreProgress, newJobIds, scoreJob, scoreJobs } from '../services/scorer.js';
import type { JobWithScore, Score } from '../../../shared/types.js';

export const jobsRouter = Router();

function rowToScore(row: typeof schema.scores.$inferSelect): Score {
  return { ...row };
}

jobsRouter.get('/', (_req, res) => {
  // Local volumes are small; return everything and let the UI sort/filter.
  const jobRows = db.select().from(schema.jobs).orderBy(desc(schema.jobs.fetchedAt)).all();
  const scoreRows = db.select().from(schema.scores).all();
  const appRows = db
    .select({ id: schema.applications.id, jobId: schema.applications.jobId })
    .from(schema.applications)
    .all();
  const scoreByJob = new Map(scoreRows.map((s) => [s.jobId, rowToScore(s)]));
  const appByJob = new Map(appRows.map((a) => [a.jobId, a.id]));
  const body: JobWithScore[] = jobRows.map((j) => ({
    ...j,
    source: j.source as JobWithScore['source'],
    status: j.status as JobWithScore['status'],
    score: scoreByJob.get(j.id) ?? null,
    applicationId: appByJob.get(j.id) ?? null,
  }));
  res.json(body);
});

jobsRouter.post('/:id/dismiss', (req, res) => {
  const id = Number(req.params.id);
  const updated = db
    .update(schema.jobs)
    .set({ status: 'dismissed' })
    .where(eq(schema.jobs.id, id))
    .returning()
    .get();
  if (!updated) throw new HttpError(404, `Job ${id} not found`);
  res.json(updated);
});

jobsRouter.post(
  '/:id/score',
  asyncHandler(async (req, res) => {
    res.json(await scoreJob(Number(req.params.id)));
  }),
);

// Kick off a batch run over all `new` jobs; the UI polls /score-progress.
const scoreNewBody = z.object({ jobIds: z.array(z.number()).optional() });

jobsRouter.post('/score-new', (req, res) => {
  const { jobIds } = scoreNewBody.parse(req.body ?? {});
  const ids = jobIds ?? newJobIds();
  if (ids.length === 0) {
    res.json({ started: false, total: 0 });
    return;
  }
  const progress = getScoreProgress();
  if (progress.running) throw new HttpError(409, 'A scoring run is already in progress');
  // Fire and forget — errors land in the progress object and the server log.
  void scoreJobs(ids).catch((err) => console.error('[score] batch run failed:', err));
  res.json({ started: true, total: ids.length });
});

jobsRouter.get('/score-progress', (_req, res) => {
  res.json(getScoreProgress());
});
