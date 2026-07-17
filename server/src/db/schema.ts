import { sqliteTable, text, integer, uniqueIndex } from 'drizzle-orm/sqlite-core';

// Portability note: timestamps are ISO-8601 strings and array/JSON fields are
// JSON-encoded text columns. Both map cleanly onto Postgres (text/jsonb) so the
// Neon swap stays a driver/config change, not a schema rewrite.

export const profile = sqliteTable('profile', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  name: text('name').notNull().default(''),
  resumeMarkdown: text('resume_markdown').notNull().default(''),
  targetRoles: text('target_roles', { mode: 'json' }).$type<string[]>().notNull().default([]),
  locations: text('locations', { mode: 'json' }).$type<string[]>().notNull().default([]),
  remotePreference: text('remote_preference').notNull().default('any'),
  salaryFloor: integer('salary_floor'),
  scoreThreshold: integer('score_threshold').notNull().default(70),
  extraScoringInstructions: text('extra_scoring_instructions').notNull().default(''),
  updatedAt: text('updated_at').notNull(),
});

export const searches = sqliteTable('searches', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  query: text('query').notNull(),
  location: text('location').notNull().default(''),
  sources: text('sources', { mode: 'json' }).$type<string[]>().notNull().default([]),
  enabled: integer('enabled', { mode: 'boolean' }).notNull().default(true),
  lastRunAt: text('last_run_at'),
  createdAt: text('created_at').notNull(),
});

export const jobs = sqliteTable(
  'jobs',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    source: text('source').notNull(),
    externalId: text('external_id').notNull(),
    title: text('title').notNull(),
    company: text('company').notNull(),
    location: text('location').notNull().default(''),
    remote: integer('remote', { mode: 'boolean' }).notNull().default(false),
    salaryText: text('salary_text'),
    description: text('description').notNull(),
    url: text('url').notNull().default(''),
    postedAt: text('posted_at'),
    fetchedAt: text('fetched_at').notNull(),
    status: text('status').notNull().default('new'),
  },
  (table) => [uniqueIndex('jobs_source_external_id').on(table.source, table.externalId)],
);

export const scores = sqliteTable('scores', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  jobId: integer('job_id')
    .notNull()
    .references(() => jobs.id, { onDelete: 'cascade' }),
  overall: integer('overall').notNull(),
  fit: integer('fit').notNull(),
  requirementsMatch: integer('requirements_match').notNull(),
  growth: integer('growth').notNull(),
  compSignal: integer('comp_signal').notNull(),
  strengths: text('strengths', { mode: 'json' }).$type<string[]>().notNull().default([]),
  gaps: text('gaps', { mode: 'json' }).$type<string[]>().notNull().default([]),
  verdict: text('verdict').notNull().default(''),
  model: text('model').notNull(),
  createdAt: text('created_at').notNull(),
});

export const applications = sqliteTable('applications', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  jobId: integer('job_id')
    .notNull()
    .references(() => jobs.id, { onDelete: 'cascade' }),
  stage: text('stage').notNull().default('interested'),
  appliedAt: text('applied_at'),
  notes: text('notes').notNull().default(''),
  nextAction: text('next_action'),
  nextActionDate: text('next_action_date'),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull(),
});

export const materials = sqliteTable('materials', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  applicationId: integer('application_id')
    .notNull()
    .references(() => applications.id, { onDelete: 'cascade' }),
  type: text('type').notNull(),
  content: text('content').notNull(),
  createdAt: text('created_at').notNull(),
});
