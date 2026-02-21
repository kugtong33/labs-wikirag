/**
 * Tests for GET /api/techniques endpoint
 *
 * @module api/tests/techniques
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import { createApp } from '../src/server.js';

vi.mock('@wikirag/qdrant', () => ({
  qdrantClient: {
    ensureConnected: vi.fn(),
  },
}));

vi.mock('@wikirag/core', () => ({
  registerNaiveRag: vi.fn(),
  techniqueRegistry: {
    list: vi.fn(() => [
      { name: 'naive-rag', description: 'Naive RAG: simple retrieve-then-generate' },
      { name: 'simple-rag', description: 'Simple RAG: lightweight variation' },
    ]),
    get: vi.fn(),
    has: vi.fn(),
    register: vi.fn(),
    clear: vi.fn(),
  },
  NAIVE_RAG_NAME: 'naive-rag',
}));

describe('GET /api/techniques', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns 200 with data and meta fields', async () => {
    const app = createApp();
    const res = await request(app).get('/api/techniques');

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('data');
    expect(res.body).toHaveProperty('meta');
  });

  it('data is an array of technique objects with name and description', async () => {
    const app = createApp();
    const res = await request(app).get('/api/techniques');

    expect(Array.isArray(res.body.data)).toBe(true);
    expect(res.body.data).toHaveLength(2);
    expect(res.body.data[0]).toMatchObject({
      name: 'naive-rag',
      description: expect.any(String),
    });
  });

  it('meta includes count and timestamp', async () => {
    const app = createApp();
    const res = await request(app).get('/api/techniques');

    expect(res.body.meta).toMatchObject({
      count: 2,
    });
    expect(typeof res.body.meta.timestamp).toBe('string');
  });

  it('returns empty data array when no techniques registered', async () => {
    const { techniqueRegistry } = await import('@wikirag/core');
    vi.mocked(techniqueRegistry.list).mockReturnValueOnce([]);

    const app = createApp();
    const res = await request(app).get('/api/techniques');

    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(0);
    expect(res.body.meta.count).toBe(0);
  });
});
