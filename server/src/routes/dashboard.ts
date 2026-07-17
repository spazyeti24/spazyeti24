import { Router } from 'express';
import { eq, inArray } from 'drizzle-orm';
import { db, schema } from '../db/index.js';
import { getProfile } from '../services/profileService.js';
import type { ApplicationStage, DashboardStats } from '../../../shared/types.js';

export const dashboardRouter = Router();

const ACTIVE_STAGES: ApplicationStage[] = ['interested', 'applied', 'screening', 'interview', 'offer'];

dashboardRouter.get('/', (_req, res) => {
  const profile = getProfile();
  const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
  const today = new Date().toISOString().slice(0, 10);

  const newJobs = db.select().from(schema.jobs).where(eq(schema.jobs.status, 'new')).all().length;

  const recentScores = db.select().from(schema.scores).all();
  const highScorersThisWeek = recentScores.filter(
    (s) => s.overall >= profile.scoreThreshold && s.createdAt >= weekAgo,
  ).length;

  const activeApps = db
    .select()
    .from(schema.applications)
    .where(inArray(schema.applications.stage, ACTIVE_STAGES))
    .all();
  const activeApplicationsByStage: Partial<Record<ApplicationStage, number>> = {};
  for (const app of activeApps) {
    const stage = app.stage as ApplicationStage;
    activeApplicationsByStage[stage] = (activeApplicationsByStage[stage] ?? 0) + 1;
  }

  const jobById = new Map(db.select().from(schema.jobs).all().map((j) => [j.id, j]));
  const upcomingActions = activeApps
    .filter((a) => a.nextAction && a.nextActionDate)
    .sort((a, b) => (a.nextActionDate! < b.nextActionDate! ? -1 : 1))
    .slice(0, 10)
    .map((a) => {
      const job = jobById.get(a.jobId);
      return {
        applicationId: a.id,
        jobTitle: job?.title ?? 'Unknown',
        company: job?.company ?? 'Unknown',
        nextAction: a.nextAction!,
        nextActionDate: a.nextActionDate!,
        overdue: a.nextActionDate!.slice(0, 10) < today,
      };
    });

  const body: DashboardStats = { newJobs, highScorersThisWeek, activeApplicationsByStage, upcomingActions };
  res.json(body);
});
