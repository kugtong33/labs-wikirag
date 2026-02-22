/**
 * Tests for POST /api/inquiry endpoint (SSE streaming)
 *
 * @module api/tests/inquiry
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import { createApp } from '../src/server.js';

// Mock qdrant
vi.mock('@wikirag/qdrant', () => ({
  qdrantClient: { ensureConnected: vi.fn() },
}));

// Hoist mock fn so it's available before vi.mock hoisting
const { mockExecutePipeline } = vi.hoisted(() => ({
  mockExecutePipeline: vi.fn(),
}));

vi.mock('@wikirag/core', () => ({
  registerNaiveRag: vi.fn(),
  NAIVE_RAG_NAME: 'naive-rag',
  techniqueRegistry: {
    list: vi.fn(() => [{ name: 'naive-rag', description: 'Naive RAG' }]),
    get: vi.fn((name: string) => {
      if (name === 'naive-rag') return { name: 'naive-rag', description: 'Naive RAG', adapters: {} };
      throw new Error(`Technique "${name}" not found in registry`);
    }),
    has: vi.fn((name: string) => name === 'naive-rag'),
    register: vi.fn(),
    clear: vi.fn(),
  },
}));

// Mock the pipeline executor so tests don't call real adapters
vi.mock('../src/pipeline-executor.js', () => ({
  executePipeline: mockExecutePipeline,
}));

/** Parse SSE text into an array of {event, data} objects */
function parseSse(text: string): Array<{ event?: string; data: string }> {
  const events: Array<{ event?: string; data: string }> = [];
  const blocks = text.split('\n\n').filter(Boolean);

  for (const block of blocks) {
    const lines = block.split('\n');
    let event: string | undefined;
    let data = '';
    for (const line of lines) {
      if (line.startsWith('event: ')) event = line.slice(7).trim();
      if (line.startsWith('data: ')) data = line.slice(6).trim();
    }
    if (data) events.push({ event, data });
  }
  return events;
}

describe('POST /api/inquiry', () => {
  beforeEach(() => {
    vi.useRealTimers();
    vi.clearAllMocks();
    delete process.env.INQUIRY_FIRST_CHUNK_DEADLINE_MS;
    delete process.env.INQUIRY_TOTAL_DEADLINE_MS;
  });

  it('returns SSE content-type header', async () => {
    mockExecutePipeline.mockResolvedValueOnce({
      query: 'test',
      response: 'Hello world',
      config: { topK: 5, collectionName: 'test' },
      metadata: {},
    });

    const app = createApp();
    const res = await request(app)
      .post('/api/inquiry')
      .send({ query: 'test query', technique: 'naive-rag' });

    expect(res.headers['content-type']).toMatch(/text\/event-stream/);
  });

  it('streams response.chunk and stream.done events', async () => {
    mockExecutePipeline.mockResolvedValueOnce({
      query: 'What is Paris?',
      response: 'Paris is the capital of France.',
      config: { topK: 5, collectionName: 'test' },
      metadata: {},
    });

    const app = createApp();
    const res = await request(app)
      .post('/api/inquiry')
      .send({ query: 'What is Paris?', technique: 'naive-rag' })
      .buffer(true)
      .parse((res, callback) => {
        let data = '';
        res.on('data', (chunk: Buffer) => { data += chunk.toString(); });
        res.on('end', () => callback(null, data));
      });

    const events = parseSse(res.body as string);
    const eventNames = events.map((e) => e.event);

    expect(eventNames).toContain('response.chunk');
    expect(eventNames).toContain('stream.done');

    const chunkData = JSON.parse(events.find((e) => e.event === 'response.chunk')!.data);
    expect(chunkData).toHaveProperty('text');
  });

  it('uses naive-rag as default when technique not specified', async () => {
    mockExecutePipeline.mockResolvedValueOnce({
      query: 'test',
      response: 'Answer',
      config: { topK: 5, collectionName: 'test' },
      metadata: {},
    });

    const app = createApp();
    await request(app)
      .post('/api/inquiry')
      .send({ query: 'test' })
      .buffer(true)
      .parse((res, callback) => {
        let data = '';
        res.on('data', (chunk: Buffer) => { data += chunk.toString(); });
        res.on('end', () => callback(null, data));
      });

    const { techniqueRegistry } = await import('@wikirag/core');
    expect(vi.mocked(techniqueRegistry.get)).toHaveBeenCalledWith('naive-rag');
  });

  it('streams stream.error event when technique not found', async () => {
    const app = createApp();
    const res = await request(app)
      .post('/api/inquiry')
      .send({ query: 'test', technique: 'unknown-technique' })
      .buffer(true)
      .parse((res, callback) => {
        let data = '';
        res.on('data', (chunk: Buffer) => { data += chunk.toString(); });
        res.on('end', () => callback(null, data));
      });

    const events = parseSse(res.body as string);
    expect(events.some((e) => e.event === 'stream.error')).toBe(true);
    const errorData = JSON.parse(events.find((e) => e.event === 'stream.error')!.data);
    expect(errorData).toMatchObject({
      type: 'urn:wikirag:error:unknown-technique',
      title: 'Bad Request',
      status: 400,
      detail: 'Requested technique is unavailable.',
      instance: '/api/inquiry',
    });
  });

  it('emits RFC 9457-shaped stream.error without internal details', async () => {
    mockExecutePipeline.mockRejectedValueOnce(
      new Error('OpenAI key leaked: sk-123-secret'),
    );

    const app = createApp();
    const res = await request(app)
      .post('/api/inquiry')
      .send({ query: 'test', technique: 'naive-rag' })
      .buffer(true)
      .parse((res, callback) => {
        let data = '';
        res.on('data', (chunk: Buffer) => { data += chunk.toString(); });
        res.on('end', () => callback(null, data));
      });

    const events = parseSse(res.body as string);
    const errorData = JSON.parse(events.find((e) => e.event === 'stream.error')!.data);

    expect(errorData).toMatchObject({
      type: 'about:blank',
      title: 'Internal Server Error',
      status: 500,
      detail: 'Unable to complete inquiry at this time.',
      instance: '/api/inquiry',
    });
    expect(JSON.stringify(errorData)).not.toContain('sk-123-secret');
  });

  it('emits first-chunk timeout as stream.error when no chunk starts in time', async () => {
    process.env.INQUIRY_FIRST_CHUNK_DEADLINE_MS = '10';
    process.env.INQUIRY_TOTAL_DEADLINE_MS = '30';
    mockExecutePipeline.mockImplementation(() => new Promise(() => {}));

    const app = createApp();

    const responsePromise = request(app)
      .post('/api/inquiry')
      .send({ query: 'slow query', technique: 'naive-rag' })
      .buffer(true)
      .parse((res, callback) => {
        let data = '';
        res.on('data', (chunk: Buffer) => { data += chunk.toString(); });
        res.on('end', () => callback(null, data));
      });

    const res = await responsePromise;
    const events = parseSse(res.body as string);

    expect(events[0]?.event).toBe('stream.error');
    expect(JSON.parse(events[0]!.data)).toMatchObject({
      type: 'urn:wikirag:error:first-chunk-timeout',
      title: 'Gateway Timeout',
      status: 504,
      detail: 'First response chunk exceeded 10ms.',
    });
  });

  it('times out long inquiries at total deadline and emits stream.error', async () => {
    process.env.INQUIRY_FIRST_CHUNK_DEADLINE_MS = '50';
    process.env.INQUIRY_TOTAL_DEADLINE_MS = '20';
    mockExecutePipeline.mockImplementation(() => new Promise(() => {}));

    const app = createApp();

    const responsePromise = request(app)
      .post('/api/inquiry')
      .send({ query: 'slow query', technique: 'naive-rag' })
      .buffer(true)
      .parse((res, callback) => {
        let data = '';
        res.on('data', (chunk: Buffer) => { data += chunk.toString(); });
        res.on('end', () => callback(null, data));
      });

    const res = await responsePromise;
    const events = parseSse(res.body as string);
    const errorEvent = events.find((e) => e.event === 'stream.error');

    expect(errorEvent).toBeDefined();
    expect(JSON.parse(errorEvent!.data)).toMatchObject({
      type: 'urn:wikirag:error:inquiry-timeout',
      title: 'Gateway Timeout',
      status: 504,
      detail: 'Inquiry exceeded 20ms.',
    });
  });

  it('returns 400 RFC 9457 error when query is missing', async () => {
    const app = createApp();
    const res = await request(app)
      .post('/api/inquiry')
      .send({ technique: 'naive-rag' });

    expect(res.status).toBe(400);
    expect(res.body).toMatchObject({
      type: expect.any(String),
      title: expect.any(String),
      status: 400,
    });
  });

  it('sanitizes control chars and whitespace before pipeline execution', async () => {
    mockExecutePipeline.mockResolvedValueOnce({
      query: 'ignored',
      response: 'Answer',
      config: { topK: 5, collectionName: 'test' },
      metadata: {},
    });

    const app = createApp();
    await request(app)
      .post('/api/inquiry')
      .send({ query: '  hello\u0000 world\n  ', technique: 'naive-rag' })
      .buffer(true)
      .parse((res, callback) => {
        let data = '';
        res.on('data', (chunk: Buffer) => { data += chunk.toString(); });
        res.on('end', () => callback(null, data));
      });

    expect(mockExecutePipeline).toHaveBeenCalledWith(
      expect.any(Object),
      expect.objectContaining({ query: 'hello world' }),
    );
  });

  it('returns 400 RFC 9457 error when query exceeds max length', async () => {
    const app = createApp();
    const tooLongQuery = 'a'.repeat(2001);

    const res = await request(app)
      .post('/api/inquiry')
      .send({ query: tooLongQuery, technique: 'naive-rag' });

    expect(res.status).toBe(400);
    expect(res.headers['content-type']).toMatch(/application\/problem\+json/);
    expect(res.body).toMatchObject({
      type: 'urn:wikirag:error:query-too-long',
      title: 'Bad Request',
      status: 400,
    });
  });
});
