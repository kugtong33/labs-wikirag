/**
 * POST /api/inquiry
 *
 * Accepts a query and optional technique name, executes the RAG pipeline,
 * and streams results back as Server-Sent Events (SSE).
 *
 * SSE events emitted:
 *   event: response.chunk  — data: { text: string }
 *   event: stream.done     — data: { technique: string }
 *   event: stream.error    — data: { message: string }
 *
 * @module api/routes/inquiry
 */

import { Router } from 'express';
import type { Request, Response, NextFunction, IRouter } from 'express';
import { techniqueRegistry, NAIVE_RAG_NAME } from '@wikirag/core';
import type { PipelineContext } from '@wikirag/core';
import { ApiError } from '../middleware/error-handler.js';
import { executePipeline } from '../pipeline-executor.js';

export const inquiryRouter: IRouter = Router();

/** Default Qdrant collection name — can be overridden via env */
const DEFAULT_COLLECTION = process.env.QDRANT_COLLECTION ?? 'wiki-naive-openai-latest';

/** Maximum top-k documents to retrieve */
const DEFAULT_TOP_K = 5;

inquiryRouter.post(
  '/',
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const { query, technique: techniqueName } = req.body as {
      query?: unknown;
      technique?: unknown;
    };

    // Validate required query field
    if (!query || typeof query !== 'string' || query.trim() === '') {
      next(
        new ApiError(
          400,
          'Bad Request',
          '"query" is required and must be a non-empty string',
          'urn:wikirag:error:missing-query',
        ),
      );
      return;
    }

    // Resolve technique — default to naive-rag if not specified
    const resolvedTechniqueName =
      typeof techniqueName === 'string' && techniqueName.trim()
        ? techniqueName.trim()
        : NAIVE_RAG_NAME;

    // Set SSE headers before any streaming begins
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders();

    /** Write a single SSE event to the response */
    const sendEvent = (event: string, data: unknown): void => {
      res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
    };

    try {
      // Resolve technique from registry
      const technique = techniqueRegistry.get(resolvedTechniqueName);

      // Build initial pipeline context
      const initialContext: PipelineContext = {
        query: query.trim(),
        config: {
          topK: DEFAULT_TOP_K,
          collectionName: DEFAULT_COLLECTION,
        },
        metadata: {},
      };

      // Execute full adapter pipeline
      const finalContext = await executePipeline(technique, initialContext);

      // Stream the response text as a single chunk
      sendEvent('response.chunk', { text: finalContext.response ?? '' });
      sendEvent('stream.done', { technique: resolvedTechniqueName });
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : 'An unexpected error occurred';
      sendEvent('stream.error', { message });
    } finally {
      res.end();
    }
  },
);
