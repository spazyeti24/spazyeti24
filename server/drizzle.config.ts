import { defineConfig } from 'drizzle-kit';

// Deploy-later: to move to Neon Postgres, change dialect to 'postgresql' and
// point dbCredentials at DATABASE_URL. The schema avoids SQLite-only SQL so
// this stays a config-level change.
export default defineConfig({
  schema: './src/db/schema.ts',
  out: './drizzle',
  dialect: 'sqlite',
  dbCredentials: {
    url: '../data/jobhunt.db',
  },
});
