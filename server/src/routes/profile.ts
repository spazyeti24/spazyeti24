import { Router } from 'express';
import { z } from 'zod';
import { getProfile, updateProfile } from '../services/profileService.js';

export const profileRouter = Router();

const profilePatch = z.object({
  name: z.string().optional(),
  resumeMarkdown: z.string().optional(),
  targetRoles: z.array(z.string()).optional(),
  locations: z.array(z.string()).optional(),
  remotePreference: z.enum(['remote_only', 'remote_preferred', 'hybrid', 'onsite', 'any']).optional(),
  salaryFloor: z.number().int().nullable().optional(),
  scoreThreshold: z.number().int().min(0).max(100).optional(),
  extraScoringInstructions: z.string().optional(),
});

profileRouter.get('/', (_req, res) => {
  res.json(getProfile());
});

profileRouter.put('/', (req, res) => {
  const patch = profilePatch.parse(req.body);
  res.json(updateProfile(patch));
});
