/**
 * Tests for PassthroughQueryAdapter
 */

import { describe, it, expect } from 'vitest';
import { PassthroughQueryAdapter } from '../../../src/techniques/naive-rag/query-adapter.js';
import type { PipelineContext } from '../../../src/types/pipeline-context.js';

function makeContext(query: string): PipelineContext {
  return {
    query,
    config: { topK: 5, collectionName: 'test-collection' },
    metadata: {},
  };
}

describe('PassthroughQueryAdapter', () => {
  const adapter = new PassthroughQueryAdapter();

  it('has name "passthrough-query"', () => {
    expect(adapter.name).toBe('passthrough-query');
  });

  it('copies the raw query into processedQuery', async () => {
    const ctx = makeContext('What is quantum computing?');
    const result = await adapter.execute(ctx);
    expect(result.processedQuery).toBe('What is quantum computing?');
  });

  it('preserves the original query field unchanged', async () => {
    const ctx = makeContext('original query');
    const result = await adapter.execute(ctx);
    expect(result.query).toBe('original query');
  });

  it('returns a new context object (immutability)', async () => {
    const ctx = makeContext('test');
    const result = await adapter.execute(ctx);
    expect(result).not.toBe(ctx);
  });

  it('preserves all other context fields', async () => {
    const ctx: PipelineContext = {
      query: 'test',
      config: { topK: 10, collectionName: 'my-collection' },
      metadata: { userId: '123' },
    };
    const result = await adapter.execute(ctx);
    expect(result.config).toEqual(ctx.config);
    expect(result.metadata).toEqual(ctx.metadata);
  });

  it('works with an empty query string', async () => {
    const ctx = makeContext('');
    const result = await adapter.execute(ctx);
    expect(result.processedQuery).toBe('');
  });

  it('works with multi-line queries', async () => {
    const query = 'Line one\nLine two';
    const ctx = makeContext(query);
    const result = await adapter.execute(ctx);
    expect(result.processedQuery).toBe(query);
  });
});
