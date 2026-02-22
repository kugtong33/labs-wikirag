/**
 * Tests for GET /api/health endpoint
 *
 * @module api/tests/health
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import { createApp } from '../src/server.js';

// Mock @wikirag/qdrant so tests don't need a real Qdrant instance
vi.mock('@wikirag/qdrant', () => ({
  qdrantClient: {
    ensureConnected: vi.fn(),
  },
}));

// Mock @wikirag/core to avoid technique side-effects
vi.mock('@wikirag/core', () => ({
  registerNaiveRag: vi.fn(),
  techniqueRegistry: {
    list: vi.fn(() => []),
    get: vi.fn(),
    has: vi.fn(),
    register: vi.fn(),
    clear: vi.fn(),
  },
  NAIVE_RAG_NAME: 'naive-rag',
}));

describe('GET /api/health', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns 200 with status ok when Qdrant is reachable', async () => {
    const { qdrantClient } = await import('@wikirag/qdrant');
    vi.mocked(qdrantClient.ensureConnected).mockResolvedValueOnce(undefined);

    const app = createApp();
    const res = await request(app).get('/api/health');

    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({
      status: 'ok',
      qdrant: 'connected',
    });
  });

  it('returns 503 with qdrant disconnected when Qdrant is unreachable', async () => {
    const { qdrantClient } = await import('@wikirag/qdrant');
    vi.mocked(qdrantClient.ensureConnected).mockRejectedValueOnce(
      new Error('Connection refused')
    );

    const app = createApp();
    const res = await request(app).get('/api/health');

    expect(res.status).toBe(503);
    expect(res.body).toMatchObject({
      status: 'degraded',
      qdrant: 'disconnected',
    });
  });

  it('response includes a timestamp', async () => {
    const { qdrantClient } = await import('@wikirag/qdrant');
    vi.mocked(qdrantClient.ensureConnected).mockResolvedValueOnce(undefined);

    const app = createApp();
    const res = await request(app).get('/api/health');

    expect(res.body).toHaveProperty('timestamp');
    expect(typeof res.body.timestamp).toBe('string');
  });

  it('includes x-request-id response header for correlation', async () => {
    const { qdrantClient } = await import('@wikirag/qdrant');
    vi.mocked(qdrantClient.ensureConnected).mockResolvedValueOnce(undefined);

    const app = createApp();
    const res = await request(app).get('/api/health');

    expect(typeof res.headers['x-request-id']).toBe('string');
    expect(res.headers['x-request-id'].length).toBeGreaterThan(0);
  });
});
