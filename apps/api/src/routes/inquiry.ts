/**
 * POST /api/inquiry
 *
 * Accepts a query and optional technique name, executes the RAG pipeline,
 * and streams results back as Server-Sent Events (SSE).
 *
 * SSE events emitted:
 *   event: response.chunk  — data: { text: string }
 *   event: stream.done     — data: { technique: string }
 *   event: stream.error    — data: ProblemDetails (RFC 9457 shape)
 *
 * @module api/routes/inquiry
 */

import { Router } from 'express';
import type { Request, Response, NextFunction, IRouter } from 'express';
import { techniqueRegistry, NAIVE_RAG_NAME } from '@wikirag/core';
import type { PipelineContext } from '@wikirag/core';
import { ApiError } from '../middleware/error-handler.js';
import type { ProblemDetails } from '../middleware/error-handler.js';
import { executePipeline } from '../pipeline-executor.js';

export const inquiryRouter: IRouter = Router();

/** Default Qdrant collection name — can be overridden via env */
const DEFAULT_COLLECTION = process.env.QDRANT_COLLECTION ?? 'wiki-naive-openai-latest';

/** Maximum top-k documents to retrieve */
const DEFAULT_TOP_K = 5;

/** AC2: first response chunk deadline (default) */
const DEFAULT_FIRST_CHUNK_DEADLINE_MS = 10_000;

/** AC2: end-to-end inquiry deadline (default) */
const DEFAULT_TOTAL_INQUIRY_DEADLINE_MS = 60_000;

/** Maximum accepted query length before rejecting request */
const MAX_QUERY_LENGTH = 2_000;

/** Strip ASCII control chars to reduce payload abuse */
const CONTROL_CHAR_REGEX = /[\u0000-\u001f\u007f]/g;

/** Safe client-facing fallback message for stream errors */
const GENERIC_STREAM_ERROR_MESSAGE = 'Unable to complete inquiry at this time.';

/** Safe client-facing message when technique resolution fails */
const UNKNOWN_TECHNIQUE_MESSAGE = 'Requested technique is unavailable.';

class InquiryTimeoutError extends Error {
  constructor(
    public readonly kind: 'first-chunk' | 'total',
    public readonly deadlineMs: number,
  ) {
    super('Inquiry execution exceeded allowed time window');
    this.name = 'InquiryTimeoutError';
  }
}

const resolveDeadlineMs = (value: string | undefined, fallback: number): number => {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return fallback;
  }

  return parsed;
};

const sanitizeQuery = (value: string): string => value
  .replace(CONTROL_CHAR_REGEX, '')
  .trim();

const toProblemDetails = (err: unknown, instance: string): ProblemDetails => {
  if (err instanceof InquiryTimeoutError) {
    if (err.kind === 'first-chunk') {
      return {
        type: 'urn:wikirag:error:first-chunk-timeout',
        title: 'Gateway Timeout',
        status: 504,
        detail: `First response chunk exceeded ${err.deadlineMs}ms.`,
        instance,
      };
    }

    return {
      type: 'urn:wikirag:error:inquiry-timeout',
      title: 'Gateway Timeout',
      status: 504,
      detail: `Inquiry exceeded ${err.deadlineMs}ms.`,
      instance,
    };
  }

  if (err instanceof Error) {
    if (err.message.includes('not found in registry')) {
      return {
        type: 'urn:wikirag:error:unknown-technique',
        title: 'Bad Request',
        status: 400,
        detail: UNKNOWN_TECHNIQUE_MESSAGE,
        instance,
      };
    }
  }

  return {
    type: 'about:blank',
    title: 'Internal Server Error',
    status: 500,
    detail: GENERIC_STREAM_ERROR_MESSAGE,
    instance,
  };
};

inquiryRouter.post(
  '/',
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const firstChunkDeadlineMs = resolveDeadlineMs(
      process.env.INQUIRY_FIRST_CHUNK_DEADLINE_MS,
      DEFAULT_FIRST_CHUNK_DEADLINE_MS,
    );
    const totalInquiryDeadlineMs = resolveDeadlineMs(
      process.env.INQUIRY_TOTAL_DEADLINE_MS,
      DEFAULT_TOTAL_INQUIRY_DEADLINE_MS,
    );

    const { query, technique: techniqueName } = req.body as {
      query?: unknown;
      technique?: unknown;
    };

    // Validate required query field and sanitize input
    if (typeof query !== 'string') {
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

    if (query.length > MAX_QUERY_LENGTH) {
      next(
        new ApiError(
          400,
          'Bad Request',
          `"query" must be ${MAX_QUERY_LENGTH} characters or fewer`,
          'urn:wikirag:error:query-too-long',
        ),
      );
      return;
    }

    const sanitizedQuery = sanitizeQuery(query);
    if (sanitizedQuery.length === 0) {
      next(
        new ApiError(
          400,
          'Bad Request',
          '"query" must contain non-control characters',
          'urn:wikirag:error:invalid-query-content',
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
      if (streamClosed || res.writableEnded) {
        return;
      }

      res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
    };

    let firstChunkSent = false;
    let streamClosed = false;

    let firstChunkWatchdog: NodeJS.Timeout | undefined;
    let totalInquiryWatchdog: NodeJS.Timeout | undefined;

    const clearWatchdogs = (): void => {
      if (firstChunkWatchdog) {
        clearTimeout(firstChunkWatchdog);
      }

      if (totalInquiryWatchdog) {
        clearTimeout(totalInquiryWatchdog);
      }
    };

    const closeStream = (): void => {
      if (streamClosed) {
        return;
      }

      streamClosed = true;
      clearWatchdogs();
      res.end();
    };

    const sendProblemEvent = (err: unknown): void => {
      const problem = toProblemDetails(err, req.originalUrl || req.url);
      sendEvent('stream.error', problem);
    };

    const sendResponseChunk = (text: string): void => {
      sendEvent('response.chunk', { text });
      firstChunkSent = true;
    };

    firstChunkWatchdog = setTimeout(() => {
      if (firstChunkSent || streamClosed) {
        return;
      }

      sendProblemEvent(new InquiryTimeoutError('first-chunk', firstChunkDeadlineMs));
      closeStream();
    }, firstChunkDeadlineMs);

    totalInquiryWatchdog = setTimeout(() => {
      if (streamClosed) {
        return;
      }

      sendProblemEvent(new InquiryTimeoutError('total', totalInquiryDeadlineMs));
      closeStream();
    }, totalInquiryDeadlineMs);

    try {
      // Resolve technique from registry
      const technique = techniqueRegistry.get(resolvedTechniqueName);

      // Build initial pipeline context
      const initialContext: PipelineContext = {
        query: sanitizedQuery,
        config: {
          topK: DEFAULT_TOP_K,
          collectionName: DEFAULT_COLLECTION,
        },
        metadata: {},
      };

      // Execute full adapter pipeline
      const finalContext = await executePipeline(technique, initialContext);

      if (streamClosed) {
        return;
      }

      // Stream the response text as a single chunk
      sendResponseChunk(finalContext.response ?? '');
      sendEvent('stream.done', { technique: resolvedTechniqueName });
    } catch (err: unknown) {
      if (!streamClosed) {
        sendProblemEvent(err);
      }
    } finally {
      closeStream();
    }
  },
);
