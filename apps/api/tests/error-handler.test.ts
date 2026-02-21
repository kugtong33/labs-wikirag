/**
 * Tests for RFC 9457 error handler middleware
 *
 * @module api/tests/error-handler
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import express from 'express';
import { errorHandler, ApiError } from '../src/middleware/error-handler.js';

// Suppress logger output in tests
vi.mock('../src/server.js', () => ({
  logger: {
    error: vi.fn(),
    info: vi.fn(),
    debug: vi.fn(),
  },
  createApp: vi.fn(),
}));

/** Create a minimal test app that throws a specific error. */
function makeErrorApp(err: unknown): express.Application {
  const app = express();
  app.get('/test', (_req, _res, next) => {
    next(err);
  });
  app.use(errorHandler);
  return app;
}

describe('errorHandler middleware', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('formats ApiError as RFC 9457 problem details', async () => {
    const err = new ApiError(422, 'Unprocessable Entity', 'Validation failed', 'urn:wikirag:error:validation');
    const app = makeErrorApp(err);

    const res = await request(app).get('/test');

    expect(res.status).toBe(422);
    expect(res.headers['content-type']).toMatch(/application\/problem\+json/);
    expect(res.body).toMatchObject({
      type: 'urn:wikirag:error:validation',
      title: 'Unprocessable Entity',
      status: 422,
      detail: 'Validation failed',
    });
  });

  it('formats unknown errors as 500 problem details', async () => {
    const app = makeErrorApp(new Error('Unexpected failure'));

    const res = await request(app).get('/test');

    expect(res.status).toBe(500);
    expect(res.body).toMatchObject({
      type: 'about:blank',
      title: 'Internal Server Error',
      status: 500,
    });
  });

  it('does not expose stack trace in response body', async () => {
    const app = makeErrorApp(new Error('secret internal error'));

    const res = await request(app).get('/test');

    expect(JSON.stringify(res.body)).not.toContain('secret internal error');
    expect(JSON.stringify(res.body)).not.toContain('stack');
  });

  it('uses about:blank type for ApiError with no explicit type', async () => {
    const err = new ApiError(400, 'Bad Request', 'Missing field');
    const app = makeErrorApp(err);

    const res = await request(app).get('/test');

    expect(res.body.type).toBe('about:blank');
  });

  it('includes instance (request URL) in problem details for ApiError', async () => {
    const err = new ApiError(404, 'Not Found', 'Resource missing');
    const app = makeErrorApp(err);

    const res = await request(app).get('/test');

    expect(res.body).toHaveProperty('instance', '/test');
  });
});
