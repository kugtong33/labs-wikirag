/**
 * RFC 9457 Problem Details error handler middleware.
 *
 * Catches all Express errors and formats them as Problem Details JSON.
 * Never exposes stack traces in the response body.
 *
 * @module api/middleware/error-handler
 */

import type { Request, Response, NextFunction } from 'express';
import { logger } from '../server.js';

/**
 * RFC 9457 Problem Details object shape.
 */
export interface ProblemDetails {
  type: string;
  title: string;
  status: number;
  detail?: string;
  instance?: string;
}

/**
 * Structured application error that carries an HTTP status and RFC 9457 type.
 */
export class ApiError extends Error {
  constructor(
    public readonly status: number,
    public readonly title: string,
    public readonly detail?: string,
    public readonly type: string = 'about:blank',
  ) {
    super(title);
    this.name = 'ApiError';
  }
}

/**
 * Express error-handling middleware (4-argument signature required by Express).
 */
export function errorHandler(
  err: unknown,
  req: Request,
  res: Response,
  _next: NextFunction,
): void {
  const requestWithId = req as Request & { id?: string | number };

  // Log the error internally (with stack) but never expose it
  logger.error(
    {
      err,
      url: req.url,
      method: req.method,
      requestId: requestWithId.id,
    },
    'Unhandled error',
  );

  let problem: ProblemDetails;

  if (err instanceof ApiError) {
    problem = {
      type: err.type,
      title: err.title,
      status: err.status,
      detail: err.detail,
      instance: req.url,
    };
  } else {
    problem = {
      type: 'about:blank',
      title: 'Internal Server Error',
      status: 500,
      instance: req.url,
    };
  }

  res
    .status(problem.status)
    .setHeader('Content-Type', 'application/problem+json')
    .json(problem);
}
