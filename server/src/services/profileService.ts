import { db, nowIso, schema } from '../db/index.js';
import type { Profile, RemotePreference } from '../../../shared/types.js';

function rowToProfile(row: typeof schema.profile.$inferSelect): Profile {
  return {
    id: row.id,
    name: row.name,
    resumeMarkdown: row.resumeMarkdown,
    targetRoles: row.targetRoles,
    locations: row.locations,
    remotePreference: row.remotePreference as RemotePreference,
    salaryFloor: row.salaryFloor,
    scoreThreshold: row.scoreThreshold,
    extraScoringInstructions: row.extraScoringInstructions,
    updatedAt: row.updatedAt,
  };
}

// Single-row table: create an empty profile on first access so the app always
// has one to edit.
export function getProfile(): Profile {
  const existing = db.select().from(schema.profile).limit(1).get();
  if (existing) return rowToProfile(existing);
  const created = db
    .insert(schema.profile)
    .values({ updatedAt: nowIso() })
    .returning()
    .get();
  return rowToProfile(created);
}

export function updateProfile(patch: Partial<Omit<Profile, 'id' | 'updatedAt'>>): Profile {
  const current = getProfile();
  const updated = db
    .update(schema.profile)
    .set({ ...patch, updatedAt: nowIso() })
    .returning()
    .get();
  return rowToProfile(updated ?? { ...current, ...patch, updatedAt: nowIso() } as never);
}
