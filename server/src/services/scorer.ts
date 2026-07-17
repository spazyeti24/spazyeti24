import Anthropic from '@anthropic-ai/sdk';
import { z } from 'zod';
import { eq, inArray } from 'drizzle-orm';
import { db, nowIso, schema } from '../db/index.js';
import { env, SCORING_MODEL } from '../env.js';
import type { Profile, ScoreProgress } from '../../../shared/types.js';
import { getProfile } from './profileService.js';

const scoreSchema = z.object({
  overall: z.number().min(0).max(100),
  fit: z.number().min(0).max(100),
  requirements_match: z.number().min(0).max(100),
  growth: z.number().min(0).max(100),
  comp_signal: z.number().min(0).max(100),
  strengths: z.array(z.string()),
  gaps: z.array(z.string()),
  verdict: z.string(),
});

function getClient(): Anthropic {
  if (!env.anthropicApiKey) {
    throw new Error('ANTHROPIC_API_KEY is not set — scoring requires an Anthropic API key.');
  }
  return new Anthropic({ apiKey: env.anthropicApiKey });
}

// All candidate-specific context comes from the profile row — nothing about a
// particular role or industry is baked into this prompt.
function buildScoringPrompt(profile: Profile, job: typeof schema.jobs.$inferSelect): string {
  const prefs = [
    `Target roles: ${profile.targetRoles.join(', ') || '(none specified)'}`,
    `Preferred locations: ${profile.locations.join(', ') || '(none specified)'}`,
    `Remote preference: ${profile.remotePreference}`,
    profile.salaryFloor ? `Salary floor: ${profile.salaryFloor}` : 'Salary floor: none specified',
  ].join('\n');

  return `You are evaluating how well a job posting fits a specific candidate.

<candidate_resume>
${profile.resumeMarkdown}
</candidate_resume>

<candidate_preferences>
${prefs}
</candidate_preferences>
${
  profile.extraScoringInstructions
    ? `\n<additional_scoring_instructions>\n${profile.extraScoringInstructions}\n</additional_scoring_instructions>\n`
    : ''
}
<job_posting>
Title: ${job.title}
Company: ${job.company}
Location: ${job.location}${job.remote ? ' (remote)' : ''}
${job.salaryText ? `Salary: ${job.salaryText}` : ''}

${job.description}
</job_posting>

Score this job for this candidate. Respond with ONLY a JSON object, no prose, matching:
{
  "overall": <0-100, weighted overall fit>,
  "fit": <0-100, alignment with the candidate's experience and target roles>,
  "requirements_match": <0-100, how many stated requirements the candidate meets>,
  "growth": <0-100, career growth potential of this role for this candidate>,
  "comp_signal": <0-100, how well compensation signals match the candidate's floor; 50 if unknown>,
  "strengths": [<2-5 short strings: why the candidate is a strong match>],
  "gaps": [<0-5 short strings: requirements the candidate may not meet>],
  "verdict": <one sentence: apply / maybe / skip and why>
}`;
}

export function parseModelJson<T>(raw: string, validator: z.ZodType<T>): T {
  // Models sometimes wrap JSON in code fences or add stray prose — strip defensively.
  let text = raw.trim();
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (fenced) text = fenced[1].trim();
  const start = text.indexOf('{');
  const end = text.lastIndexOf('}');
  if (start === -1 || end === -1) throw new Error(`Model response contained no JSON object: ${raw.slice(0, 200)}`);
  const parsed = JSON.parse(text.slice(start, end + 1));
  return validator.parse(parsed);
}

export async function scoreJob(jobId: number): Promise<typeof schema.scores.$inferSelect> {
  const job = db.select().from(schema.jobs).where(eq(schema.jobs.id, jobId)).get();
  if (!job) throw new Error(`Job ${jobId} not found`);
  const profile = getProfile();
  const client = getClient();

  // The full description goes to the model — no truncation, ever.
  const response = await client.messages.create({
    model: SCORING_MODEL,
    max_tokens: 1500,
    messages: [{ role: 'user', content: buildScoringPrompt(profile, job) }],
  });
  const textBlock = response.content.find((b) => b.type === 'text');
  if (!textBlock || textBlock.type !== 'text') throw new Error('Model returned no text content');
  const result = parseModelJson(textBlock.text, scoreSchema);

  // Re-scoring replaces the old score.
  db.delete(schema.scores).where(eq(schema.scores.jobId, jobId)).run();
  const inserted = db
    .insert(schema.scores)
    .values({
      jobId,
      overall: Math.round(result.overall),
      fit: Math.round(result.fit),
      requirementsMatch: Math.round(result.requirements_match),
      growth: Math.round(result.growth),
      compSignal: Math.round(result.comp_signal),
      strengths: result.strengths,
      gaps: result.gaps,
      verdict: result.verdict,
      model: SCORING_MODEL,
      createdAt: nowIso(),
    })
    .returning()
    .get();
  db.update(schema.jobs).set({ status: 'scored' }).where(eq(schema.jobs.id, jobId)).run();
  return inserted;
}

// --- batch scoring with progress the UI can poll ---

const progress: ScoreProgress = { running: false, total: 0, done: 0, errors: [] };

export function getScoreProgress(): ScoreProgress {
  return progress;
}

export async function scoreJobs(jobIds: number[], concurrency = 3): Promise<ScoreProgress> {
  if (progress.running) throw new Error('A scoring run is already in progress');
  progress.running = true;
  progress.total = jobIds.length;
  progress.done = 0;
  progress.errors = [];

  const queue = [...jobIds];
  const worker = async () => {
    while (queue.length > 0) {
      const jobId = queue.shift();
      if (jobId === undefined) break;
      try {
        await scoreJob(jobId);
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        console.error(`[score] job ${jobId} failed: ${message}`);
        progress.errors.push({ jobId, message });
      }
      progress.done++;
    }
  };

  try {
    await Promise.all(Array.from({ length: Math.min(concurrency, jobIds.length) }, worker));
  } finally {
    progress.running = false;
  }
  return progress;
}

export function newJobIds(): number[] {
  return db
    .select({ id: schema.jobs.id })
    .from(schema.jobs)
    .where(inArray(schema.jobs.status, ['new']))
    .all()
    .map((r) => r.id);
}
