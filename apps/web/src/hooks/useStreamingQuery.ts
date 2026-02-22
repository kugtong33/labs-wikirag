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

import { useState, useCallback, useRef, useEffect } from 'react';

export type StreamingStatus = 'idle' | 'loading' | 'streaming' | 'complete' | 'error';

export interface StreamingQueryResult {
  status: StreamingStatus;
  responseText: string;
  error: string | null;
  requestId: string | null;
  completedAt: string | null;
  submit: (query: string, technique: string) => void;
}

const VITE_ENV = (import.meta as ImportMeta & {
  env?: Record<string, string | undefined>;
}).env;

const API_BASE = VITE_ENV?.['VITE_API_BASE_URL'] ?? 'http://localhost:3000';

const GENERIC_NETWORK_ERROR_MESSAGE =
  'Unable to reach the server. Please check your connection and try again.';
const GENERIC_STREAM_ERROR_MESSAGE = 'Unable to complete inquiry at this time.';

class UserFacingError extends Error {
  constructor(public readonly userMessage: string) {
    super(userMessage);
    this.name = 'UserFacingError';
  }
}

interface ProblemDetailsLike {
  detail?: string;
  message?: string;
}

const toStreamErrorMessage = (data: string): string => {
  try {
    const parsed = JSON.parse(data) as ProblemDetailsLike;

    if (typeof parsed.detail === 'string' && parsed.detail.trim()) {
      return parsed.detail;
    }

    if (typeof parsed.message === 'string' && parsed.message.trim()) {
      return parsed.message;
    }

    return GENERIC_STREAM_ERROR_MESSAGE;
  } catch {
    return GENERIC_STREAM_ERROR_MESSAGE;
  }
};

const parseHttpProblemMessage = async (response: Response): Promise<string> => {
  const contentType = response.headers.get('content-type') ?? '';

  if (contentType.includes('application/problem+json')) {
    try {
      const parsed = (await response.json()) as ProblemDetailsLike;

      if (typeof parsed.detail === 'string' && parsed.detail.trim()) {
        return parsed.detail;
      }
    } catch {
      // ignore parse failures and fallback to generic message
    }
  }

  return GENERIC_STREAM_ERROR_MESSAGE;
};

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
  const activeRequestSeqRef = useRef(0);
  const activeAbortRef = useRef<AbortController | null>(null);

  useEffect(() => () => {
    activeAbortRef.current?.abort();
  }, []);

  const submit = useCallback(async (query: string, technique: string) => {
    const requestSeq = activeRequestSeqRef.current + 1;
    activeRequestSeqRef.current = requestSeq;

    activeAbortRef.current?.abort();
    const abortController = new AbortController();
    activeAbortRef.current = abortController;

    const isCurrentRequest = (): boolean => activeRequestSeqRef.current === requestSeq;

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
        signal: abortController.signal,
      });

      if (!isCurrentRequest()) {
        return;
      }

      if (!response.ok) {
        throw new UserFacingError(await parseHttpProblemMessage(response));
      }

      const contentType = response.headers.get('content-type') ?? '';
      if (!contentType.includes('text/event-stream')) {
        throw new UserFacingError(GENERIC_STREAM_ERROR_MESSAGE);
      }

      if (!response.body) {
        throw new UserFacingError(GENERIC_STREAM_ERROR_MESSAGE);
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      const eventRef = { current: '' };

      const handleEvent = (event: string, data: string) => {
        if (!isCurrentRequest()) {
          return;
        }

        if (event === 'response.chunk') {
          const parsed = JSON.parse(data) as { text: string };
          setStatus('streaming');
          setResponseText((prev) => prev + parsed.text);
        } else if (event === 'stream.done') {
          setRequestId(reqId);
          setCompletedAt(new Date().toISOString());
          setStatus('complete');
        } else if (event === 'stream.error') {
          setError(toStreamErrorMessage(data));
          setStatus('error');
        }
      };

      while (true) {
        const { done, value } = await reader.read();

        if (!isCurrentRequest()) {
          return;
        }

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
    } catch (err: unknown) {
      if (!isCurrentRequest()) {
        return;
      }

      if (abortController.signal.aborted) {
        return;
      }

      if (err instanceof UserFacingError) {
        setError(err.userMessage);
        setStatus('error');
        return;
      }

      setError(GENERIC_NETWORK_ERROR_MESSAGE);
      setStatus('error');
    }
  }, []);

  return { status, responseText, error, requestId, completedAt, submit };
}
