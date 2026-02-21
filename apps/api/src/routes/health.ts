/**
 * GET /api/health
 *
 * Reports API liveness and Qdrant connectivity.
 * Returns 200 when healthy, 503 when Qdrant is unreachable.
 *
 * @module api/routes/health
 */

import { Router } from 'express';
import type { Request, Response, IRouter } from 'express';
import { qdrantClient } from '@wikirag/qdrant';

export const healthRouter: IRouter = Router();

healthRouter.get('/', async (_req: Request, res: Response): Promise<void> => {
  const timestamp = new Date().toISOString();

  try {
    await qdrantClient.ensureConnected();
    res.status(200).json({
      status: 'ok',
      qdrant: 'connected',
      timestamp,
    });
  } catch {
    res.status(503).json({
      status: 'degraded',
      qdrant: 'disconnected',
      timestamp,
    });
  }
});
