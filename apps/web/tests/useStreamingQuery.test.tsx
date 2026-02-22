/**
 * Tests for useStreamingQuery hook
 *
 * @module web/tests/useStreamingQuery
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { useStreamingQuery } from '../src/hooks/useStreamingQuery.js';

// Helper: create a fetch mock returning an SSE ReadableStream
function makeSseResponse(sseText: string): Response {
  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    start(controller) {
      controller.enqueue(encoder.encode(sseText));
      controller.close();
    },
  });
  return new Response(stream, {
    status: 200,
    headers: { 'Content-Type': 'text/event-stream' },
  });
}

function makeErrorFetch(): Promise<Response> {
  return Promise.reject(new Error('Network error'));
}

function makeProblemResponse(detail: string, status = 400): Response {
  return new Response(
    JSON.stringify({
      type: 'about:blank',
      title: 'Bad Request',
      status,
      detail,
    }),
    {
      status,
      headers: { 'Content-Type': 'application/problem+json' },
    },
  );
}

const CHUNK_SSE = [
  'event: response.chunk\n',
  'data: {"text":"Hello "}\n',
  '\n',
  'event: response.chunk\n',
  'data: {"text":"world"}\n',
  '\n',
  'event: stream.done\n',
  'data: {"technique":"naive-rag"}\n',
  '\n',
].join('');

const ERROR_SSE = [
  'event: stream.error\n',
  'data: {"type":"about:blank","title":"Internal Server Error","status":500,"detail":"Unable to complete inquiry at this time."}\n',
  '\n',
].join('');

const FIRST_REQUEST_SSE = [
  'event: response.chunk\n',
  'data: {"text":"OLD "}\n',
  '\n',
  'event: stream.done\n',
  'data: {"technique":"naive-rag"}\n',
  '\n',
].join('');

const SECOND_REQUEST_SSE = [
  'event: response.chunk\n',
  'data: {"text":"NEW"}\n',
  '\n',
  'event: stream.done\n',
  'data: {"technique":"naive-rag"}\n',
  '\n',
].join('');

describe('useStreamingQuery', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn());
    vi.stubGlobal('crypto', {
      randomUUID: vi.fn(() => 'test-uuid-1234'),
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('starts in idle status', () => {
    const { result } = renderHook(() => useStreamingQuery());
    expect(result.current.status).toBe('idle');
  });

  it('transitions to loading then streaming then complete on success', async () => {
    vi.mocked(fetch).mockResolvedValueOnce(makeSseResponse(CHUNK_SSE));

    const { result } = renderHook(() => useStreamingQuery());

    act(() => {
      result.current.submit('What is Paris?', 'naive-rag');
    });

    expect(result.current.status).toBe('loading');

    await waitFor(() => expect(result.current.status).toBe('complete'));
  });

  it('accumulates response text from chunks', async () => {
    vi.mocked(fetch).mockResolvedValueOnce(makeSseResponse(CHUNK_SSE));

    const { result } = renderHook(() => useStreamingQuery());

    act(() => {
      result.current.submit('What is Paris?', 'naive-rag');
    });

    await waitFor(() => expect(result.current.status).toBe('complete'));

    expect(result.current.responseText).toBe('Hello world');
  });

  it('sets requestId on completion', async () => {
    vi.mocked(fetch).mockResolvedValueOnce(makeSseResponse(CHUNK_SSE));

    const { result } = renderHook(() => useStreamingQuery());

    act(() => {
      result.current.submit('test', 'naive-rag');
    });

    await waitFor(() => expect(result.current.status).toBe('complete'));

    expect(result.current.requestId).toBe('test-uuid-1234');
  });

  it('sets completedAt timestamp on completion', async () => {
    vi.mocked(fetch).mockResolvedValueOnce(makeSseResponse(CHUNK_SSE));

    const { result } = renderHook(() => useStreamingQuery());

    act(() => {
      result.current.submit('test', 'naive-rag');
    });

    await waitFor(() => expect(result.current.status).toBe('complete'));

    expect(result.current.completedAt).toMatch(/^\d{4}-\d{2}-\d{2}T/);
  });

  it('transitions to error status on stream.error event', async () => {
    vi.mocked(fetch).mockResolvedValueOnce(makeSseResponse(ERROR_SSE));

    const { result } = renderHook(() => useStreamingQuery());

    act(() => {
      result.current.submit('test', 'naive-rag');
    });

    await waitFor(() => expect(result.current.status).toBe('error'));

    expect(result.current.error).toBe('Unable to complete inquiry at this time.');
  });

  it('transitions to error status on non-OK HTTP responses', async () => {
    vi.mocked(fetch).mockResolvedValueOnce(
      makeProblemResponse('"query" must be 2000 characters or fewer', 400),
    );

    const { result } = renderHook(() => useStreamingQuery());

    act(() => {
      result.current.submit('test', 'naive-rag');
    });

    await waitFor(() => expect(result.current.status).toBe('error'));

    expect(result.current.error).toBe('"query" must be 2000 characters or fewer');
  });

  it('transitions to error status when response is not SSE', async () => {
    vi.mocked(fetch).mockResolvedValueOnce(
      new Response(JSON.stringify({ data: [] }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }),
    );

    const { result } = renderHook(() => useStreamingQuery());

    act(() => {
      result.current.submit('test', 'naive-rag');
    });

    await waitFor(() => expect(result.current.status).toBe('error'));

    expect(result.current.error).toBe('Unable to complete inquiry at this time.');
  });

  it('shows user-friendly error (no raw technical detail) on network failure', async () => {
    vi.mocked(fetch).mockImplementationOnce(() => makeErrorFetch());

    const { result } = renderHook(() => useStreamingQuery());

    act(() => {
      result.current.submit('test', 'naive-rag');
    });

    await waitFor(() => expect(result.current.status).toBe('error'));

    // Should not expose the raw "Network error" message verbatim as a stack trace
    expect(result.current.error).toBeTruthy();
    expect(result.current.error).not.toContain('at '); // no stack traces
  });

  it('calls fetch with correct POST body', async () => {
    vi.mocked(fetch).mockResolvedValueOnce(makeSseResponse(CHUNK_SSE));

    const { result } = renderHook(() => useStreamingQuery());

    act(() => {
      result.current.submit('Who is Einstein?', 'naive-rag');
    });

    await waitFor(() => expect(result.current.status).toBe('complete'));

    expect(fetch).toHaveBeenCalledWith(
      expect.stringContaining('/api/inquiry'),
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({ query: 'Who is Einstein?', technique: 'naive-rag' }),
      }),
    );
  });

  it('ignores stale updates from earlier submit calls', async () => {
    let resolveFirstResponse: ((response: Response) => void) | undefined;
    const firstResponsePromise = new Promise<Response>((resolve) => {
      resolveFirstResponse = resolve;
    });

    vi.mocked(fetch)
      .mockImplementationOnce(() => firstResponsePromise)
      .mockResolvedValueOnce(makeSseResponse(SECOND_REQUEST_SSE));

    const { result } = renderHook(() => useStreamingQuery());

    act(() => {
      result.current.submit('first', 'naive-rag');
      result.current.submit('second', 'naive-rag');
    });

    await waitFor(() => expect(result.current.status).toBe('complete'));
    expect(result.current.responseText).toBe('NEW');

    resolveFirstResponse?.(makeSseResponse(FIRST_REQUEST_SSE));
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(result.current.responseText).toBe('NEW');
  });
});
