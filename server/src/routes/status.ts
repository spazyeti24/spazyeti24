import { Router } from 'express';
import { integrationStatus, SCORING_MODEL } from '../env.js';
import type { StatusResponse } from '../../../shared/types.js';

export const statusRouter = Router();

statusRouter.get('/', (_req, res) => {
  const body: StatusResponse = {
    ok: true,
    integrations: integrationStatus(),
    model: SCORING_MODEL,
  };
  res.json(body);
});
