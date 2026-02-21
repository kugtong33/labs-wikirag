/**
 * useStreamingQuery hook
 *
 * Submits a query to POST /api/inquiry and streams the SSE response back.
 * Uses fetch + ReadableStream (not EventSource) since the endpoint is POST.
 *
 * Status machine: idle → loading → streaming → complete | error
 *
 * @module web/hooks/useStreamingQuery
 */

import { useState, useCallback } from 'react';

export type StreamingStatus = 'idle' | 'loading' | 'streaming' | 'complete' | 'error';

export interface StreamingQueryResult {
  status: StreamingStatus;
  responseText: string;
  error: string | null;
  requestId: string | null;
  completedAt: string | null;
  submit: (query: string, technique: string) => void;
}

const API_BASE =
  typeof import.meta !== 'undefined' && import.meta.env
    ? (import.meta.env['VITE_API_BASE_URL'] ?? 'http://localhost:3000')
    : 'http://localhost:3000';

/**
 * Parse SSE events line-by-line from a buffer string.
 * Returns an array of `{event, data}` parsed objects.
 */
function parseSseLines(
  lines: string[],
  onEvent: (event: string, data: string) => void,
  eventRef: { current: string },
): void {
  for (const line of lines) {
    if (line.startsWith('event: ')) {
      eventRef.current = line.slice(7).trim();
    } else if (line.startsWith('data: ')) {
      const data = line.slice(6).trim();
      if (eventRef.current) {
        onEvent(eventRef.current, data);
        eventRef.current = '';
      }
    }
  }
}

/**
 * Hook for streaming query execution via SSE.
 *
 * @example
 * ```tsx
 * const { status, responseText, error, requestId, completedAt, submit } = useStreamingQuery();
 * submit('Who was Einstein?', 'naive-rag');
 * ```
 */
export function useStreamingQuery(): StreamingQueryResult {
  const [status, setStatus] = useState<StreamingStatus>('idle');
  const [responseText, setResponseText] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [requestId, setRequestId] = useState<string | null>(null);
  const [completedAt, setCompletedAt] = useState<string | null>(null);

  const submit = useCallback(async (query: string, technique: string) => {
    // Reset state
    setStatus('loading');
    setResponseText('');
    setError(null);
    setRequestId(null);
    setCompletedAt(null);

    // Generate a client-side request ID
    const reqId = crypto.randomUUID();

    try {
      const response = await fetch(`${API_BASE}/api/inquiry`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query, technique }),
      });

      if (!response.body) {
        throw new Error('No response body');
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      const eventRef = { current: '' };

      const handleEvent = (event: string, data: string) => {
        if (event === 'response.chunk') {
          const parsed = JSON.parse(data) as { text: string };
          setStatus('streaming');
          setResponseText((prev) => prev + parsed.text);
        } else if (event === 'stream.done') {
          setRequestId(reqId);
          setCompletedAt(new Date().toISOString());
          setStatus('complete');
        } else if (event === 'stream.error') {
          const parsed = JSON.parse(data) as { message: string };
          setError(parsed.message ?? 'An error occurred. Please try again.');
          setStatus('error');
        }
      };

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() ?? '';

        parseSseLines(lines, handleEvent, eventRef);
      }

      // Process any remaining buffer content
      if (buffer.trim()) {
        const lines = buffer.split('\n');
        parseSseLines(lines, handleEvent, eventRef);
      }
    } catch {
      setError('Unable to reach the server. Please check your connection and try again.');
      setStatus('error');
    }
  }, []);

  return { status, responseText, error, requestId, completedAt, submit };
}
