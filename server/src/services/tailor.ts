import Anthropic from '@anthropic-ai/sdk';
import { eq } from 'drizzle-orm';
import { db, nowIso, schema } from '../db/index.js';
import { env, SCORING_MODEL } from '../env.js';
import type { MaterialType } from '../../../shared/types.js';
import { getProfile } from './profileService.js';

const TYPE_INSTRUCTIONS: Record<MaterialType, string> = {
  resume_bullets:
    'Write 4-6 tailored resume bullet points for this candidate targeting this specific job. Pull from real experience in the resume — never invent accomplishments. Lead with the experience most relevant to the job requirements. Output as a markdown bullet list.',
  cover_letter:
    'Write a concise cover letter (250-350 words) for this candidate applying to this job. Ground every claim in the resume — never invent experience. Address the strongest overlaps between the resume and the job requirements, and where reasonable, briefly pre-empt the biggest gap. Output as markdown with no letterhead or address block.',
  outreach_message:
    'Write a short outreach message (under 120 words) this candidate could send to a recruiter or hiring manager about this job — e.g. on LinkedIn. Warm, specific, and grounded in the resume. Output as markdown.',
};

export async function generateMaterial(
  applicationId: number,
  type: MaterialType,
  userNote?: string,
): Promise<typeof schema.materials.$inferSelect> {
  if (!env.anthropicApiKey) {
    throw new Error('ANTHROPIC_API_KEY is not set — tailoring requires an Anthropic API key.');
  }
  const application = db
    .select()
    .from(schema.applications)
    .where(eq(schema.applications.id, applicationId))
    .get();
  if (!application) throw new Error(`Application ${applicationId} not found`);
  const job = db.select().from(schema.jobs).where(eq(schema.jobs.id, application.jobId)).get();
  if (!job) throw new Error(`Job ${application.jobId} not found`);
  const score = db.select().from(schema.scores).where(eq(schema.scores.jobId, job.id)).get();
  const profile = getProfile();

  const scoreContext = score
    ? `\n<fit_analysis>\nStrengths identified: ${score.strengths.join('; ')}\nGaps identified: ${score.gaps.join('; ')}\n</fit_analysis>\n`
    : '';

  const prompt = `You are helping a job candidate prepare application materials.

<candidate_resume>
${profile.resumeMarkdown}
</candidate_resume>

<job_posting>
Title: ${job.title}
Company: ${job.company}
Location: ${job.location}${job.remote ? ' (remote)' : ''}

${job.description}
</job_posting>
${scoreContext}
${TYPE_INSTRUCTIONS[type]}
${userNote ? `\nAdditional instruction from the candidate: ${userNote}` : ''}

Respond with the material only — no preamble, no commentary.`;

  const client = new Anthropic({ apiKey: env.anthropicApiKey });
  const response = await client.messages.create({
    model: SCORING_MODEL,
    max_tokens: 2000,
    messages: [{ role: 'user', content: prompt }],
  });
  const textBlock = response.content.find((b) => b.type === 'text');
  if (!textBlock || textBlock.type !== 'text') throw new Error('Model returned no text content');

  return db
    .insert(schema.materials)
    .values({
      applicationId,
      type,
      content: textBlock.text.trim(),
      createdAt: nowIso(),
    })
    .returning()
    .get();
}
