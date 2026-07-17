import { Router } from 'express';
import { z } from 'zod';
import { eq } from 'drizzle-orm';
import { db, nowIso, schema } from '../db/index.js';
import { asyncHandler, HttpError } from '../errors.js';
import { runAllSearches, runSearch } from '../services/fetcher.js';

export const searchesRouter = Router();

const searchBody = z.object({
  query: z.string().min(1),
  location: z.string().default(''),
  sources: z.array(z.enum(['jsearch', 'adzuna'])).default([]),
  enabled: z.boolean().default(true),
});

searchesRouter.get('/', (_req, res) => {
  res.json(db.select().from(schema.searches).all());
});

searchesRouter.post('/', (req, res) => {
  const body = searchBody.parse(req.body);
  const created = db
    .insert(schema.searches)
    .values({ ...body, createdAt: nowIso() })
    .returning()
    .get();
  res.status(201).json(created);
});

searchesRouter.put('/:id', (req, res) => {
  const id = Number(req.params.id);
  const body = searchBody.partial().parse(req.body);
  const updated = db
    .update(schema.searches)
    .set(body)
    .where(eq(schema.searches.id, id))
    .returning()
    .get();
  if (!updated) throw new HttpError(404, `Search ${id} not found`);
  res.json(updated);
});

searchesRouter.delete('/:id', (req, res) => {
  const id = Number(req.params.id);
  db.delete(schema.searches).where(eq(schema.searches.id, id)).run();
  res.status(204).end();
});

searchesRouter.post(
  '/:id/run',
  asyncHandler(async (req, res) => {
    const summary = await runSearch(Number(req.params.id));
    res.json(summary);
  }),
);

searchesRouter.post(
  '/run-all',
  asyncHandler(async (_req, res) => {
    res.json(await runAllSearches());
  }),
);
