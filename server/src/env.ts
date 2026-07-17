import dotenv from 'dotenv';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import type { IntegrationStatus } from '../../shared/types.js';

const here = path.dirname(fileURLToPath(import.meta.url));
// .env lives at the repo root so server and scripts share one file.
dotenv.config({ path: path.resolve(here, '../../.env') });

export const env = {
  port: Number(process.env.PORT) || 3001,
  anthropicApiKey: process.env.ANTHROPIC_API_KEY || '',
  rapidApiKey: process.env.RAPIDAPI_KEY || '',
  adzunaAppId: process.env.ADZUNA_APP_ID || '',
  adzunaAppKey: process.env.ADZUNA_APP_KEY || '',
};

export const SCORING_MODEL = 'claude-sonnet-4-6';

export function integrationStatus(): IntegrationStatus {
  return {
    anthropic: Boolean(env.anthropicApiKey),
    jsearch: Boolean(env.rapidApiKey),
    adzuna: Boolean(env.adzunaAppId && env.adzunaAppKey),
  };
}

export function logIntegrationStatus(): void {
  const status = integrationStatus();
  const line = (name: string, active: boolean, hint: string) =>
    console.log(`  ${active ? '✓' : '✗'} ${name}: ${active ? 'active' : `NOT configured (${hint})`}`);
  console.log('Integrations:');
  line('Anthropic (scoring/tailoring)', status.anthropic, 'set ANTHROPIC_API_KEY');
  line('JSearch (job source)', status.jsearch, 'set RAPIDAPI_KEY');
  line('Adzuna (job source)', status.adzuna, 'set ADZUNA_APP_ID and ADZUNA_APP_KEY');
  if (!status.jsearch && !status.adzuna) {
    console.warn('WARNING: no job sources configured — fetching will fail until one is set up.');
  }
  if (!status.anthropic) {
    console.warn('WARNING: ANTHROPIC_API_KEY missing — scoring and tailoring will fail.');
  }
}
