// Seeds a sample profile and three fake jobs so the UI isn't empty on first run.
// Run with: npm run seed (from the repo root or /server).
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { migrate } from 'drizzle-orm/better-sqlite3/migrator';
import { db, nowIso, schema } from './db/index.js';

const here = path.dirname(fileURLToPath(import.meta.url));
migrate(db, { migrationsFolder: path.resolve(here, '../drizzle') });

const existingProfile = db.select().from(schema.profile).limit(1).get();
if (existingProfile) {
  console.log('Profile already exists — seeding jobs only if none present.');
} else {
  db.insert(schema.profile)
    .values({
      name: 'Sample User',
      resumeMarkdown: `# Sample User

**Product-minded generalist** — replace this with your real resume on the Profile page.

## Experience

### Acme Corp — Senior Widget Specialist (2021–present)
- Led cross-functional widget initiatives that grew revenue 25% year over year
- Managed a portfolio of 40+ enterprise accounts

### Beta Inc — Widget Analyst (2018–2021)
- Built reporting dashboards used by 200+ internal stakeholders

## Skills
Communication, analytics, project management`,
      targetRoles: ['Replace with your target roles'],
      locations: ['Remote'],
      remotePreference: 'remote_preferred',
      salaryFloor: null,
      scoreThreshold: 70,
      extraScoringInstructions: '',
      updatedAt: nowIso(),
    })
    .run();
  console.log('Seeded sample profile.');
}

const existingJobs = db.select().from(schema.jobs).limit(1).all();
if (existingJobs.length > 0) {
  console.log('Jobs already exist — skipping job seed.');
} else {
  const fakeJobs = [
    {
      source: 'seed',
      externalId: 'seed-1',
      title: 'Senior Widget Specialist',
      company: 'Example Labs',
      location: 'Remote (US)',
      remote: true,
      salaryText: 'USD 120,000–150,000 / year',
      description:
        'Example Labs is looking for a Senior Widget Specialist to own our widget program end to end. You will work with sales, product, and engineering to grow widget adoption. Requirements: 5+ years in a widget-adjacent role, strong communication skills, experience with analytics tooling. Nice to have: enterprise account experience. This is a fully remote role with quarterly onsites.',
      url: 'https://example.com/jobs/1',
      postedAt: new Date(Date.now() - 2 * 24 * 3600 * 1000).toISOString(),
    },
    {
      source: 'seed',
      externalId: 'seed-2',
      title: 'Widget Operations Manager',
      company: 'Sample Systems',
      location: 'New York, NY',
      remote: false,
      salaryText: null,
      description:
        'Sample Systems seeks a Widget Operations Manager to run day-to-day widget operations in our NYC office. You will manage a team of three, own vendor relationships, and report to the VP of Operations. Requirements: 3+ years operations experience, people management experience, comfort with ambiguity. Hybrid schedule: 3 days in office.',
      url: 'https://example.com/jobs/2',
      postedAt: new Date(Date.now() - 5 * 24 * 3600 * 1000).toISOString(),
    },
    {
      source: 'seed',
      externalId: 'seed-3',
      title: 'Junior Widget Analyst',
      company: 'Placeholder Partners',
      location: 'Austin, TX',
      remote: true,
      salaryText: 'USD 65,000–80,000 / year',
      description:
        'Placeholder Partners is hiring a Junior Widget Analyst. You will build dashboards, run weekly reporting, and support the senior team. Requirements: 1+ year analytics experience, SQL, spreadsheet fluency. Remote-friendly with optional Austin office access.',
      url: 'https://example.com/jobs/3',
      postedAt: new Date(Date.now() - 1 * 24 * 3600 * 1000).toISOString(),
    },
  ];
  for (const job of fakeJobs) {
    db.insert(schema.jobs).values({ ...job, fetchedAt: nowIso(), status: 'new' }).run();
  }
  console.log('Seeded 3 sample jobs.');
}

console.log('Seed complete.');
