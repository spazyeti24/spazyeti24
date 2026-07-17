import { env } from '../env.js';
import type { JobSource } from '../../../shared/types.js';

export interface NormalizedJob {
  source: JobSource;
  externalId: string;
  title: string;
  company: string;
  location: string;
  remote: boolean;
  salaryText: string | null;
  description: string;
  url: string;
  postedAt: string | null;
}

async function getJson(url: string, headers: Record<string, string> = {}): Promise<unknown> {
  const res = await fetch(url, { headers });
  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(`HTTP ${res.status} from ${new URL(url).host}: ${body.slice(0, 300)}`);
  }
  return res.json();
}

// --- JSearch (RapidAPI) ---

interface JSearchJob {
  job_id: string;
  job_title: string;
  employer_name: string;
  job_city?: string | null;
  job_state?: string | null;
  job_country?: string | null;
  job_is_remote?: boolean | null;
  job_min_salary?: number | null;
  job_max_salary?: number | null;
  job_salary_period?: string | null;
  job_salary_currency?: string | null;
  job_description: string;
  job_apply_link?: string | null;
  job_posted_at_datetime_utc?: string | null;
}

export async function fetchJSearch(query: string, location: string): Promise<NormalizedJob[]> {
  if (!env.rapidApiKey) {
    throw new Error('JSearch is not configured: RAPIDAPI_KEY is missing.');
  }
  const q = location ? `${query} in ${location}` : query;
  const url = new URL('https://jsearch.p.rapidapi.com/search');
  url.searchParams.set('query', q);
  url.searchParams.set('page', '1');
  url.searchParams.set('num_pages', '1');
  const data = (await getJson(url.toString(), {
    'X-RapidAPI-Key': env.rapidApiKey,
    'X-RapidAPI-Host': 'jsearch.p.rapidapi.com',
  })) as { data?: JSearchJob[] };

  return (data.data ?? []).map((j) => {
    const locParts = [j.job_city, j.job_state, j.job_country].filter(Boolean);
    let salaryText: string | null = null;
    if (j.job_min_salary || j.job_max_salary) {
      const cur = j.job_salary_currency ?? 'USD';
      const period = j.job_salary_period ? ` / ${j.job_salary_period.toLowerCase()}` : '';
      salaryText = `${cur} ${j.job_min_salary ?? '?'}–${j.job_max_salary ?? '?'}${period}`;
    }
    return {
      source: 'jsearch' as const,
      externalId: j.job_id,
      title: j.job_title ?? 'Untitled',
      company: j.employer_name ?? 'Unknown',
      location: locParts.join(', '),
      remote: Boolean(j.job_is_remote),
      salaryText,
      description: j.job_description ?? '', // stored in full — never truncated
      url: j.job_apply_link ?? '',
      postedAt: j.job_posted_at_datetime_utc ?? null,
    };
  });
}

// --- Adzuna ---

interface AdzunaJob {
  id: string;
  title: string;
  company?: { display_name?: string };
  location?: { display_name?: string };
  salary_min?: number | null;
  salary_max?: number | null;
  description: string;
  redirect_url?: string;
  created?: string;
}

export async function fetchAdzuna(query: string, location: string): Promise<NormalizedJob[]> {
  if (!env.adzunaAppId || !env.adzunaAppKey) {
    throw new Error('Adzuna is not configured: ADZUNA_APP_ID / ADZUNA_APP_KEY missing.');
  }
  const url = new URL('https://api.adzuna.com/v1/api/jobs/us/search/1');
  url.searchParams.set('app_id', env.adzunaAppId);
  url.searchParams.set('app_key', env.adzunaAppKey);
  url.searchParams.set('what', query);
  if (location) url.searchParams.set('where', location);
  url.searchParams.set('results_per_page', '50');
  url.searchParams.set('content-type', 'application/json');
  const data = (await getJson(url.toString())) as { results?: AdzunaJob[] };

  return (data.results ?? []).map((j) => {
    let salaryText: string | null = null;
    if (j.salary_min || j.salary_max) {
      salaryText = `${Math.round(j.salary_min ?? 0)}–${Math.round(j.salary_max ?? 0)}`;
    }
    const loc = j.location?.display_name ?? '';
    return {
      source: 'adzuna' as const,
      externalId: String(j.id),
      title: j.title ?? 'Untitled',
      company: j.company?.display_name ?? 'Unknown',
      location: loc,
      remote: /remote/i.test(`${j.title} ${loc} ${j.description}`),
      salaryText,
      description: j.description ?? '', // Adzuna abbreviates server-side; we store all we receive
      url: j.redirect_url ?? '',
      postedAt: j.created ?? null,
    };
  });
}
