/**
 * Express application factory for the WikiRAG API server.
 *
 * Exports a `createApp` factory so the app can be instantiated
 * independently in tests without binding to a port.
 *
 * @module api/server
 */

import express from 'express';
import { randomUUID } from 'node:crypto';
import { pino } from 'pino';
import { pinoHttp } from 'pino-http';
import { healthRouter } from './routes/health.js';
import { techniquesRouter } from './routes/techniques.js';
import { inquiryRouter } from './routes/inquiry.js';
import { errorHandler } from './middleware/error-handler.js';

/** Shared Pino logger instance — imported by routes and middleware. */
export const logger = pino({ level: process.env.LOG_LEVEL ?? 'info' });

const REQUEST_ID_HEADER = 'x-request-id';

const toHeaderRequestId = (value: string | string[] | undefined): string | null => {
  if (!value) {
    return null;
  }

  if (Array.isArray(value)) {
    return value[0]?.trim() || null;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
};

/**
 * Create and configure the Express application.
 *
 * @returns Configured Express app (not yet listening).
 */
export function createApp(): express.Application {
  const app = express();

  // Parse JSON bodies
  app.use(express.json());

  // HTTP request logging via pino-http with request correlation
  app.use(
    pinoHttp({
      logger,
      genReqId: (req, res) => {
        const fromHeader = toHeaderRequestId(req.headers[REQUEST_ID_HEADER]);
        const requestId = fromHeader ?? randomUUID();
        res.setHeader('X-Request-Id', requestId);
        return requestId;
      },
    }),
  );

  // Mount route modules
  app.use('/api/health', healthRouter);
  app.use('/api/techniques', techniquesRouter);
  app.use('/api/inquiry', inquiryRouter);

  // RFC 9457 error handler (must be last)
  app.use(errorHandler);

  return app;
}
