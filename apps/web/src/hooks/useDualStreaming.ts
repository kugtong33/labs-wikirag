/**
 * useDualStreaming hook
 *
 * Submits a comparison query to POST /api/comparison and routes the
 * multiplexed SSE events to two independent panel states (left / right).
 *
 * Status machine per panel: idle → loading → streaming → complete | error
 *
 * @module web/hooks/useDualStreaming
 */

import { useState, useCallback, useRef, useEffect } from 'react';
import type { StreamingStatus } from './useStreamingQuery.js';

export interface PanelStreamState {
  status: StreamingStatus;
  responseText: string;
  error: string | null;
  completedAt: string | null;
}

export interface DualStreamingResult {
  leftState: PanelStreamState;
  rightState: PanelStreamState;
  submit: (query: string, techniqueA: string, techniqueB: string) => void;
}

const VITE_ENV = (import.meta as ImportMeta & {
  env?: Record<string, string | undefined>;
}).env;

const API_BASE = VITE_ENV?.['VITE_API_BASE_URL'] ?? 'http://localhost:3000';

const GENERIC_NETWORK_ERROR = 'Unable to reach the server. Please check your connection and try again.';
const GENERIC_STREAM_ERROR = 'Unable to complete inquiry at this time.';

const IDLE_PANEL: PanelStreamState = {
  status: 'idle',
  responseText: '',
  error: null,
  completedAt: null,
};

const LOADING_PANEL: PanelStreamState = {
  status: 'loading',
  responseText: '',
  error: null,
  completedAt: null,
};

interface ProblemDetailsLike {
  detail?: string;
  message?: string;
}

const toErrorMessage = (data: string): string => {
  try {
    const parsed = JSON.parse(data) as ProblemDetailsLike;
    if (typeof parsed.detail === 'string' && parsed.detail.trim()) {
      return parsed.detail;
    }
    if (typeof parsed.message === 'string' && parsed.message.trim()) {
      return parsed.message;
    }
    return GENERIC_STREAM_ERROR;
  } catch {
    return GENERIC_STREAM_ERROR;
  }
};

/**
 * Parse SSE lines and invoke onEvent for each complete event/data pair.
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
 * Hook for dual-technique streaming via a single SSE connection to
 * POST /api/comparison. Events are routed to leftState or rightState
 * based on the `side` field in each event's data payload.
 *
 * @example
 * ```tsx
 * const { leftState, rightState, submit } = useDualStreaming();
 * submit('Who was Einstein?', 'naive-rag', 'simple-rag');
 * ```
 */
export function useDualStreaming(): DualStreamingResult {
  const [leftState, setLeftState] = useState<PanelStreamState>(IDLE_PANEL);
  const [rightState, setRightState] = useState<PanelStreamState>(IDLE_PANEL);

  const activeRequestSeqRef = useRef(0);
  const activeAbortRef = useRef<AbortController | null>(null);

  useEffect(() => () => {
    activeAbortRef.current?.abort();
  }, []);

  const setSide = useCallback((
    side: string,
    updater: (prev: PanelStreamState) => PanelStreamState,
  ) => {
    if (side === 'a') {
      setLeftState(updater);
    } else {
      setRightState(updater);
    }
  }, []);

  const submit = useCallback(async (query: string, techniqueA: string, techniqueB: string) => {
    const requestSeq = activeRequestSeqRef.current + 1;
    activeRequestSeqRef.current = requestSeq;

    activeAbortRef.current?.abort();
    const abortController = new AbortController();
    activeAbortRef.current = abortController;

    const isCurrentRequest = (): boolean => activeRequestSeqRef.current === requestSeq;

    setLeftState(LOADING_PANEL);
    setRightState(LOADING_PANEL);

    try {
      const response = await fetch(`${API_BASE}/api/comparison`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query, techniqueA, techniqueB }),
        signal: abortController.signal,
      });

      if (!isCurrentRequest()) {
        return;
      }

      if (!response.ok || !response.body) {
        const errorMsg = GENERIC_STREAM_ERROR;
        setLeftState({ status: 'error', responseText: '', error: errorMsg, completedAt: null });
        setRightState({ status: 'error', responseText: '', error: errorMsg, completedAt: null });
        return;
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      const eventRef = { current: '' };

      const handleEvent = (event: string, data: string) => {
        if (!isCurrentRequest()) {
          return;
        }

        let parsed: { side?: string; text?: string; technique?: string } = {};
        try {
          parsed = JSON.parse(data) as typeof parsed;
        } catch {
          return;
        }

        const side = parsed.side ?? '';

        if (event === 'response.chunk') {
          setSide(side, (prev) => ({
            ...prev,
            status: 'streaming',
            responseText: prev.responseText + (parsed.text ?? ''),
          }));
        } else if (event === 'stream.done') {
          setSide(side, (prev) => ({
            ...prev,
            status: 'complete',
            completedAt: new Date().toISOString(),
          }));
        } else if (event === 'stream.error') {
          setSide(side, (_prev) => ({
            status: 'error',
            responseText: '',
            error: toErrorMessage(data),
            completedAt: null,
          }));
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

      if (buffer.trim()) {
        parseSseLines(buffer.split('\n'), handleEvent, eventRef);
      }
    } catch (err: unknown) {
      if (!isCurrentRequest() || abortController.signal.aborted) {
        return;
      }

      const errorMsg = GENERIC_NETWORK_ERROR;
      setLeftState({ status: 'error', responseText: '', error: errorMsg, completedAt: null });
      setRightState({ status: 'error', responseText: '', error: errorMsg, completedAt: null });
    }
  }, [setSide]);

  return { leftState, rightState, submit };
}
