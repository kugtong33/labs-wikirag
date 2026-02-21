/**
 * Tests for NaiveRagGenerationAdapter
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  NaiveRagGenerationAdapter,
  DEFAULT_GENERATION_MODEL,
} from '../../../src/techniques/naive-rag/generation-adapter.js';
import type { PipelineContext, RetrievedDocument } from '../../../src/types/pipeline-context.js';

// ---------------------------------------------------------------------------
// Mock OpenAI client
// ---------------------------------------------------------------------------

function makeOpenAIClient(responseText = 'Generated answer.') {
  return {
    chat: {
      completions: {
        create: vi.fn().mockResolvedValue({
          choices: [{ message: { content: responseText } }],
        }),
      },
    },
  };
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeDoc(id: number, title: string, score = 0.9): RetrievedDocument {
  return {
    id,
    score,
    content: title,
    metadata: { articleTitle: title },
  };
}

function makeContext(
  overrides: Partial<PipelineContext> = {},
  docs: RetrievedDocument[] = []
): PipelineContext {
  return {
    query: 'What is quantum computing?',
    processedQuery: 'What is quantum computing?',
    retrievedDocuments: docs,
    config: { topK: 5, collectionName: 'test' },
    metadata: {},
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('NaiveRagGenerationAdapter', () => {
  let openaiClient: ReturnType<typeof makeOpenAIClient>;
  let adapter: NaiveRagGenerationAdapter;

  beforeEach(() => {
    openaiClient = makeOpenAIClient('Quantum computing uses qubits.');
    adapter = new NaiveRagGenerationAdapter(openaiClient as any);
  });

  it('has name "naive-rag-generation"', () => {
    expect(adapter.name).toBe('naive-rag-generation');
  });

  it('uses DEFAULT_GENERATION_MODEL when no model specified', () => {
    expect(DEFAULT_GENERATION_MODEL).toBe('gpt-4o-mini');
  });

  it('calls chat.completions.create with the correct model', async () => {
    const ctx = makeContext({}, [makeDoc(1, 'Quantum computing')]);
    await adapter.execute(ctx);
    expect(openaiClient.chat.completions.create).toHaveBeenCalledWith(
      expect.objectContaining({ model: DEFAULT_GENERATION_MODEL })
    );
  });

  it('uses custom model when provided', async () => {
    const customAdapter = new NaiveRagGenerationAdapter(openaiClient as any, 'gpt-4o');
    const ctx = makeContext({}, [makeDoc(1, 'Quantum computing')]);
    await customAdapter.execute(ctx);
    expect(openaiClient.chat.completions.create).toHaveBeenCalledWith(
      expect.objectContaining({ model: 'gpt-4o' })
    );
  });

  it('stores the completion text in context.response', async () => {
    const ctx = makeContext({}, [makeDoc(1, 'Quantum computing')]);
    const result = await adapter.execute(ctx);
    expect(result.response).toBe('Quantum computing uses qubits.');
  });

  it('includes the user query in the messages', async () => {
    const ctx = makeContext({}, [makeDoc(1, 'Quantum computing')]);
    await adapter.execute(ctx);
    const messages = (openaiClient.chat.completions.create as ReturnType<typeof vi.fn>).mock
      .calls[0][0].messages as Array<{ role: string; content: string }>;
    const userMsg = messages.find((m) => m.role === 'user');
    expect(userMsg?.content).toContain('What is quantum computing?');
  });

  it('includes retrieved document titles in the user message', async () => {
    const ctx = makeContext({}, [
      makeDoc(1, 'Quantum computing — Introduction'),
      makeDoc(2, 'Quantum mechanics — Applications'),
    ]);
    await adapter.execute(ctx);
    const messages = (openaiClient.chat.completions.create as ReturnType<typeof vi.fn>).mock
      .calls[0][0].messages as Array<{ role: string; content: string }>;
    const userMsg = messages.find((m) => m.role === 'user');
    expect(userMsg?.content).toContain('Quantum computing — Introduction');
    expect(userMsg?.content).toContain('Quantum mechanics — Applications');
  });

  it('prefers refinedDocuments over retrievedDocuments when both are set', async () => {
    const ctx = makeContext({
      retrievedDocuments: [makeDoc(1, 'Raw result')],
      refinedDocuments: [makeDoc(2, 'Refined result')],
    });
    await adapter.execute(ctx);
    const messages = (openaiClient.chat.completions.create as ReturnType<typeof vi.fn>).mock
      .calls[0][0].messages as Array<{ role: string; content: string }>;
    const userMsg = messages.find((m) => m.role === 'user');
    expect(userMsg?.content).toContain('Refined result');
    expect(userMsg?.content).not.toContain('Raw result');
  });

  it('handles empty retrieved documents gracefully', async () => {
    const ctx = makeContext({}, []);
    const result = await adapter.execute(ctx);
    expect(result.response).toBeDefined();
    // No documents → fallback prompt path used
    const messages = (openaiClient.chat.completions.create as ReturnType<typeof vi.fn>).mock
      .calls[0][0].messages as Array<{ role: string; content: string }>;
    const userMsg = messages.find((m) => m.role === 'user');
    expect(userMsg?.content).toContain('could not find relevant');
  });

  it('handles null/undefined completion content gracefully', async () => {
    openaiClient.chat.completions.create.mockResolvedValue({
      choices: [{ message: { content: null } }],
    });
    const ctx = makeContext({}, [makeDoc(1, 'Some doc')]);
    const result = await adapter.execute(ctx);
    expect(result.response).toBe('');
  });

  it('returns a new context object (immutability)', async () => {
    const ctx = makeContext({}, [makeDoc(1, 'Quantum computing')]);
    const result = await adapter.execute(ctx);
    expect(result).not.toBe(ctx);
  });

  it('includes a system message in the chat request', async () => {
    const ctx = makeContext({}, [makeDoc(1, 'Quantum computing')]);
    await adapter.execute(ctx);
    const messages = (openaiClient.chat.completions.create as ReturnType<typeof vi.fn>).mock
      .calls[0][0].messages as Array<{ role: string; content: string }>;
    const systemMsg = messages.find((m) => m.role === 'system');
    expect(systemMsg).toBeDefined();
    expect(systemMsg?.content).toContain('Wikipedia');
  });

  it.each([
    'What is the capital of France?',
    'Explain how Roman law influenced modern legal systems.',
    'that thing about the cat that is alive and dead',
    'How would you evaluate your own answer quality here?',
  ])('handles query category input: %s', async (query) => {
    const ctx = makeContext({ query, processedQuery: query }, [makeDoc(1, 'Context doc')]);
    const result = await adapter.execute(ctx);

    expect(result.response).toBe('Quantum computing uses qubits.');

    const calls = (openaiClient.chat.completions.create as ReturnType<typeof vi.fn>).mock.calls;
    const lastCall = calls[calls.length - 1];
    const messages = lastCall[0].messages as Array<{ role: string; content: string }>;
    const userMsg = messages.find((m) => m.role === 'user');
    expect(userMsg?.content).toContain(query);
  });
});
