import { and, eq } from 'drizzle-orm';
import { db, nowIso, schema } from '../db/index.js';
import { integrationStatus } from '../env.js';
import { fetchAdzuna, fetchJSearch, type NormalizedJob } from './sources.js';
import type { FetchRunSummary, FetchSourceResult, JobSource } from '../../../shared/types.js';

async function fetchFromSource(
  source: JobSource,
  query: string,
  location: string,
): Promise<NormalizedJob[]> {
  if (source === 'jsearch') return fetchJSearch(query, location);
  if (source === 'adzuna') return fetchAdzuna(query, location);
  throw new Error(`Unknown job source: ${source}`);
}

function insertNewJobs(listings: NormalizedJob[]): { inserted: number; duplicates: number } {
  let inserted = 0;
  let duplicates = 0;
  for (const listing of listings) {
    const existing = db
      .select({ id: schema.jobs.id })
      .from(schema.jobs)
      .where(
        and(eq(schema.jobs.source, listing.source), eq(schema.jobs.externalId, listing.externalId)),
      )
      .get();
    if (existing) {
      duplicates++;
      continue;
    }
    db.insert(schema.jobs)
      .values({ ...listing, fetchedAt: nowIso(), status: 'new' })
      .run();
    inserted++;
  }
  return { inserted, duplicates };
}

export async function runSearch(searchId: number): Promise<FetchRunSummary> {
  const search = db.select().from(schema.searches).where(eq(schema.searches.id, searchId)).get();
  if (!search) throw new Error(`Search ${searchId} not found`);

  const status = integrationStatus();
  const sources = (search.sources as JobSource[]).length
    ? (search.sources as JobSource[])
    : (['jsearch', 'adzuna'] as JobSource[]);

  const results: FetchSourceResult[] = [];
  for (const source of sources) {
    const configured = source === 'jsearch' ? status.jsearch : source === 'adzuna' ? status.adzuna : false;
    if (!configured) {
      results.push({
        source,
        fetched: 0,
        inserted: 0,
        duplicates: 0,
        error: `${source} is not configured — add its API key(s) to .env`,
      });
      continue;
    }
    try {
      const listings = await fetchFromSource(source, search.query, search.location);
      const { inserted, duplicates } = insertNewJobs(listings);
      results.push({ source, fetched: listings.length, inserted, duplicates, error: null });
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      console.error(`[fetch] ${source} failed for search ${searchId} ("${search.query}"): ${message}`);
      results.push({ source, fetched: 0, inserted: 0, duplicates: 0, error: message });
    }
  }

  db.update(schema.searches)
    .set({ lastRunAt: nowIso() })
    .where(eq(schema.searches.id, searchId))
    .run();

  return { searchId, query: search.query, results };
}

export async function runAllSearches(): Promise<FetchRunSummary[]> {
  const enabled = db.select().from(schema.searches).where(eq(schema.searches.enabled, true)).all();
  const summaries: FetchRunSummary[] = [];
  for (const search of enabled) {
    summaries.push(await runSearch(search.id));
  }
  return summaries;
}
