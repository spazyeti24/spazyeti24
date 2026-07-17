import { Router } from 'express';
import { z } from 'zod';
import { desc, eq } from 'drizzle-orm';
import { db, nowIso, schema } from '../db/index.js';
import { asyncHandler, HttpError } from '../errors.js';
import { generateMaterial } from '../services/tailor.js';
import { APPLICATION_STAGES, type ApplicationWithJob } from '../../../shared/types.js';

export const applicationsRouter = Router();

const stageEnum = z.enum(APPLICATION_STAGES as [string, ...string[]]);

function loadApplication(id: number): ApplicationWithJob {
  const app = db.select().from(schema.applications).where(eq(schema.applications.id, id)).get();
  if (!app) throw new HttpError(404, `Application ${id} not found`);
  const job = db.select().from(schema.jobs).where(eq(schema.jobs.id, app.jobId)).get();
  if (!job) throw new HttpError(404, `Job ${app.jobId} not found`);
  const score = db.select().from(schema.scores).where(eq(schema.scores.jobId, job.id)).get();
  const mats = db
    .select()
    .from(schema.materials)
    .where(eq(schema.materials.applicationId, id))
    .orderBy(desc(schema.materials.createdAt))
    .all();
  return {
    ...app,
    stage: app.stage as ApplicationWithJob['stage'],
    job: { ...job, source: job.source as never, status: job.status as never },
    score: score ?? null,
    materials: mats.map((m) => ({ ...m, type: m.type as never })),
  };
}

applicationsRouter.get('/', (_req, res) => {
  const apps = db.select().from(schema.applications).all();
  res.json(apps.map((a) => loadApplication(a.id)));
});

applicationsRouter.get('/:id', (req, res) => {
  res.json(loadApplication(Number(req.params.id)));
});

const createBody = z.object({ jobId: z.number() });

applicationsRouter.post('/', (req, res) => {
  const { jobId } = createBody.parse(req.body);
  const job = db.select().from(schema.jobs).where(eq(schema.jobs.id, jobId)).get();
  if (!job) throw new HttpError(404, `Job ${jobId} not found`);
  const existing = db
    .select()
    .from(schema.applications)
    .where(eq(schema.applications.jobId, jobId))
    .get();
  if (existing) {
    res.json(loadApplication(existing.id));
    return;
  }
  const created = db
    .insert(schema.applications)
    .values({ jobId, createdAt: nowIso(), updatedAt: nowIso() })
    .returning()
    .get();
  res.status(201).json(loadApplication(created.id));
});

const updateBody = z.object({
  stage: stageEnum.optional(),
  appliedAt: z.string().nullable().optional(),
  notes: z.string().optional(),
  nextAction: z.string().nullable().optional(),
  nextActionDate: z.string().nullable().optional(),
});

applicationsRouter.put('/:id', (req, res) => {
  const id = Number(req.params.id);
  const patch = updateBody.parse(req.body);
  // Moving into `applied` stamps appliedAt if it isn't set yet.
  const current = db.select().from(schema.applications).where(eq(schema.applications.id, id)).get();
  if (!current) throw new HttpError(404, `Application ${id} not found`);
  const appliedAt =
    patch.appliedAt !== undefined
      ? patch.appliedAt
      : patch.stage === 'applied' && !current.appliedAt
        ? nowIso()
        : current.appliedAt;
  db.update(schema.applications)
    .set({ ...patch, appliedAt, updatedAt: nowIso() })
    .where(eq(schema.applications.id, id))
    .run();
  res.json(loadApplication(id));
});

applicationsRouter.delete('/:id', (req, res) => {
  db.delete(schema.applications).where(eq(schema.applications.id, Number(req.params.id))).run();
  res.status(204).end();
});

const materialBody = z.object({
  type: z.enum(['resume_bullets', 'cover_letter', 'outreach_message']),
  note: z.string().optional(),
});

applicationsRouter.post(
  '/:id/materials',
  asyncHandler(async (req, res) => {
    const { type, note } = materialBody.parse(req.body);
    const material = await generateMaterial(Number(req.params.id), type, note);
    res.status(201).json(material);
  }),
);
