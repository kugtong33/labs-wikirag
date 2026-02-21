/**
 * GET /api/techniques
 *
 * Returns all registered RAG techniques in {data, meta} envelope format.
 *
 * @module api/routes/techniques
 */

import { Router } from 'express';
import type { Request, Response, IRouter } from 'express';
import { techniqueRegistry } from '@wikirag/core';

export const techniquesRouter: IRouter = Router();

techniquesRouter.get('/', (_req: Request, res: Response): void => {
  const techniques = techniqueRegistry.list();

  const data = techniques.map((t) => ({
    name: t.name,
    description: t.description,
  }));

  res.status(200).json({
    data,
    meta: {
      count: data.length,
      timestamp: new Date().toISOString(),
    },
  });
});
