/**
 * POST /api/comparison
 *
 * Accepts a query and two technique names, executes both RAG pipelines
 * in parallel, and multiplexes both result streams back as Server-Sent Events.
 *
 * SSE events emitted (each carries a `side` field — 'a' or 'b'):
 *   event: response.chunk  — data: { side: 'a'|'b', text: string }
 *   event: stream.done     — data: { side: 'a'|'b', technique: string }
 *   event: stream.error    — data: ProblemDetails & { side: 'a'|'b' }
 *
 * Neither pipeline waits for the other — Promise.all runs both concurrently
 * and each side flushes its events as soon as its pipeline finishes.
 *
 * @module api/routes/comparison
 */

import { Router } from 'express';
import type { Request, Response, NextFunction, IRouter } from 'express';
import { techniqueRegistry } from '@wikirag/core';
import type { PipelineContext } from '@wikirag/core';
import { ApiError } from '../middleware/error-handler.js';
import type { ProblemDetails } from '../middleware/error-handler.js';
import { executePipeline } from '../pipeline-executor.js';

export const comparisonRouter: IRouter = Router();

/** Comparison sides */
type Side = 'a' | 'b';

/** Default Qdrant collection name */
const DEFAULT_COLLECTION = process.env.QDRANT_COLLECTION ?? 'wiki-naive-openai-latest';

/** Maximum top-k documents to retrieve per technique */
const DEFAULT_TOP_K = 5;

/** Maximum accepted query length */
const MAX_QUERY_LENGTH = 2_000;

/** End-to-end deadline for the full comparison (both pipelines must complete) */
const DEFAULT_TOTAL_DEADLINE_MS = 120_000;

/** Strip ASCII control characters */
const CONTROL_CHAR_REGEX = /[\u0000-\u001f\u007f]/g;

const GENERIC_STREAM_ERROR_MESSAGE = 'Unable to complete inquiry at this time.';
const UNKNOWN_TECHNIQUE_MESSAGE = 'Requested technique is unavailable.';

const sanitizeQuery = (value: string): string =>
  value.replace(CONTROL_CHAR_REGEX, '').trim();

const resolveDeadlineMs = (value: string | undefined, fallback: number): number => {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
};

const toProblemDetails = (err: unknown, instance: string): ProblemDetails => {
  if (err instanceof Error && err.message.includes('not found in registry')) {
    return {
      type: 'urn:wikirag:error:unknown-technique',
      title: 'Bad Request',
      status: 400,
      detail: UNKNOWN_TECHNIQUE_MESSAGE,
      instance,
    };
  }

  return {
    type: 'about:blank',
    title: 'Internal Server Error',
    status: 500,
    detail: GENERIC_STREAM_ERROR_MESSAGE,
    instance,
  };
};

comparisonRouter.post(
  '/',
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const totalDeadlineMs = resolveDeadlineMs(
      process.env.COMPARISON_TOTAL_DEADLINE_MS,
      DEFAULT_TOTAL_DEADLINE_MS,
    );

    const { query, techniqueA, techniqueB } = req.body as {
      query?: unknown;
      techniqueA?: unknown;
      techniqueB?: unknown;
    };

    // Validate query
    if (typeof query !== 'string') {
      next(new ApiError(400, 'Bad Request', '"query" is required and must be a string', 'urn:wikirag:error:missing-query'));
      return;
    }

    if (query.length > MAX_QUERY_LENGTH) {
      next(new ApiError(400, 'Bad Request', `"query" must be ${MAX_QUERY_LENGTH} characters or fewer`, 'urn:wikirag:error:query-too-long'));
      return;
    }

    const sanitizedQuery = sanitizeQuery(query);
    if (sanitizedQuery.length === 0) {
      next(new ApiError(400, 'Bad Request', '"query" must contain non-control characters', 'urn:wikirag:error:invalid-query-content'));
      return;
    }

    // Validate technique names
    if (typeof techniqueA !== 'string' || !techniqueA.trim()) {
      next(new ApiError(400, 'Bad Request', '"techniqueA" is required and must be a non-empty string', 'urn:wikirag:error:missing-technique'));
      return;
    }

    if (typeof techniqueB !== 'string' || !techniqueB.trim()) {
      next(new ApiError(400, 'Bad Request', '"techniqueB" is required and must be a non-empty string', 'urn:wikirag:error:missing-technique'));
      return;
    }

    const techniqueAName = techniqueA.trim();
    const techniqueBName = techniqueB.trim();

    // Set SSE headers
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders();

    let streamClosed = false;

    const sendEvent = (event: string, data: unknown): void => {
      if (streamClosed || res.writableEnded) {
        return;
      }

      res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
    };

    const closeStream = (): void => {
      if (streamClosed) {
        return;
      }

      streamClosed = true;
      clearTimeout(totalWatchdog);
      res.end();
    };

    const totalWatchdog = setTimeout(() => {
      if (!streamClosed) {
        sendEvent('stream.error', {
          side: 'a',
          type: 'urn:wikirag:error:comparison-timeout',
          title: 'Gateway Timeout',
          status: 504,
          detail: `Comparison exceeded ${totalDeadlineMs}ms.`,
          instance: req.originalUrl || req.url,
        });
        sendEvent('stream.error', {
          side: 'b',
          type: 'urn:wikirag:error:comparison-timeout',
          title: 'Gateway Timeout',
          status: 504,
          detail: `Comparison exceeded ${totalDeadlineMs}ms.`,
          instance: req.originalUrl || req.url,
        });
        closeStream();
      }
    }, totalDeadlineMs);

    /**
     * Execute one technique pipeline and emit its SSE events.
     * Never throws — errors are emitted as stream.error events.
     */
    const runTechnique = async (side: Side, techniqueName: string): Promise<void> => {
      try {
        const technique = techniqueRegistry.get(techniqueName);

        const initialContext: PipelineContext = {
          query: sanitizedQuery,
          config: {
            topK: DEFAULT_TOP_K,
            collectionName: DEFAULT_COLLECTION,
          },
          metadata: {},
        };

        const finalContext = await executePipeline(technique, initialContext);

        if (!streamClosed) {
          sendEvent('response.chunk', { side, text: finalContext.response ?? '' });
          sendEvent('stream.done', { side, technique: techniqueName });
        }
      } catch (err: unknown) {
        if (!streamClosed) {
          const problem = toProblemDetails(err, req.originalUrl || req.url);
          sendEvent('stream.error', { ...problem, side });
        }
      }
    };

    try {
      // Run both pipelines concurrently — neither waits for the other
      await Promise.all([
        runTechnique('a', techniqueAName),
        runTechnique('b', techniqueBName),
      ]);
    } finally {
      closeStream();
    }
  },
);
