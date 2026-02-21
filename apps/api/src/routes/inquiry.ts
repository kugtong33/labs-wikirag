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

/** AC2: first response chunk deadline (default) */
const DEFAULT_FIRST_CHUNK_DEADLINE_MS = 10_000;

/** AC2: end-to-end inquiry deadline (default) */
const DEFAULT_TOTAL_INQUIRY_DEADLINE_MS = 60_000;

/** Safe client-facing fallback message for stream errors */
const GENERIC_STREAM_ERROR_MESSAGE = 'Unable to complete inquiry at this time.';

/** Safe client-facing message when technique resolution fails */
const UNKNOWN_TECHNIQUE_MESSAGE = 'Requested technique is unavailable.';

class InquiryTimeoutError extends Error {
  constructor() {
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

const createTimeoutPromise = (ms: number): Promise<never> => new Promise((_, reject) => {
  setTimeout(() => reject(new InquiryTimeoutError()), ms);
});

const toSafeClientMessage = (err: unknown): string => {
  if (err instanceof InquiryTimeoutError) {
    return GENERIC_STREAM_ERROR_MESSAGE;
  }

  if (err instanceof Error) {
    if (err.message.includes('not found in registry')) {
      return UNKNOWN_TECHNIQUE_MESSAGE;
    }
  }

  return GENERIC_STREAM_ERROR_MESSAGE;
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

    let firstChunkSent = false;
    const sendResponseChunk = (text: string): void => {
      sendEvent('response.chunk', { text });
      firstChunkSent = true;
    };

    const firstChunkWatchdog = setTimeout(() => {
      if (!firstChunkSent) {
        sendResponseChunk('');
      }
    }, firstChunkDeadlineMs);

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
      const finalContext = await Promise.race([
        executePipeline(technique, initialContext),
        createTimeoutPromise(totalInquiryDeadlineMs),
      ]);

      clearTimeout(firstChunkWatchdog);

      // Stream the response text as a single chunk
      sendResponseChunk(finalContext.response ?? '');
      sendEvent('stream.done', { technique: resolvedTechniqueName });
    } catch (err: unknown) {
      clearTimeout(firstChunkWatchdog);
      const message = toSafeClientMessage(err);
      sendEvent('stream.error', { message });
    } finally {
      clearTimeout(firstChunkWatchdog);
      res.end();
    }
  },
);
