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
    expect(errorData).toEqual({ message: 'Requested technique is unavailable.' });
  });

  it('does not leak internal error details in stream.error', async () => {
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

    expect(errorData).toEqual({ message: 'Unable to complete inquiry at this time.' });
  });

  it('emits a watchdog first chunk before deadline when pipeline is still running', async () => {
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

    expect(events[0]?.event).toBe('response.chunk');
    expect(JSON.parse(events[0]!.data)).toEqual({ text: '' });

    delete process.env.INQUIRY_FIRST_CHUNK_DEADLINE_MS;
    delete process.env.INQUIRY_TOTAL_DEADLINE_MS;
  });

  it('times out long inquiries and emits stream.error', async () => {
    process.env.INQUIRY_FIRST_CHUNK_DEADLINE_MS = '10';
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
    expect(JSON.parse(errorEvent!.data)).toEqual({
      message: 'Unable to complete inquiry at this time.',
    });

    delete process.env.INQUIRY_FIRST_CHUNK_DEADLINE_MS;
    delete process.env.INQUIRY_TOTAL_DEADLINE_MS;
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
});
