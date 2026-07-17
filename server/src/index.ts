import express from 'express';
import cors from 'cors';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { migrate } from 'drizzle-orm/better-sqlite3/migrator';
import { db } from './db/index.js';
import { env, logIntegrationStatus } from './env.js';
import { errorHandler } from './errors.js';
import { statusRouter } from './routes/status.js';
import { profileRouter } from './routes/profile.js';
import { searchesRouter } from './routes/searches.js';
import { jobsRouter } from './routes/jobs.js';
import { applicationsRouter } from './routes/applications.js';
import { dashboardRouter } from './routes/dashboard.js';

const here = path.dirname(fileURLToPath(import.meta.url));

// Apply committed migrations on boot so a fresh clone works with no extra step.
migrate(db, { migrationsFolder: path.resolve(here, '../drizzle') });

const app = express();
app.use(cors());
app.use(express.json({ limit: '5mb' }));

// Deploy-later: auth middleware would slot in here (e.g. app.use('/api', requireAuth)).

app.use('/api/status', statusRouter);
app.use('/api/profile', profileRouter);
app.use('/api/searches', searchesRouter);
app.use('/api/jobs', jobsRouter);
app.use('/api/applications', applicationsRouter);
app.use('/api/dashboard', dashboardRouter);

app.use(errorHandler);

app.listen(env.port, () => {
  console.log(`JobHunt OS server listening on http://localhost:${env.port}`);
  logIntegrationStatus();
});
