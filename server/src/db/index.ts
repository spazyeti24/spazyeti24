import Database from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import * as schema from './schema.js';

// Deploy-later: swap this file's driver setup for drizzle-orm/neon-http (or
// node-postgres) reading DATABASE_URL. Everything else imports `db` from here.

const here = path.dirname(fileURLToPath(import.meta.url));
const dataDir = path.resolve(here, '../../../data');
fs.mkdirSync(dataDir, { recursive: true });

const sqlite = new Database(path.join(dataDir, 'jobhunt.db'));
sqlite.pragma('journal_mode = WAL');
sqlite.pragma('foreign_keys = ON');

export const db = drizzle(sqlite, { schema });
export { schema };

export function nowIso(): string {
  return new Date().toISOString();
}
