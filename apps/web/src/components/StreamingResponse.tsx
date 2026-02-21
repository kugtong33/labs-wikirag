/**
 * StreamingResponse component
 *
 * Renders the appropriate UI for each streaming status:
 *   idle     — nothing (invisible placeholder)
 *   loading  — animated spinner with status role
 *   streaming — accumulated response text with blinking cursor
 *   complete  — full text + request ID + timestamp metadata
 *   error     — accessible alert with user-friendly message
 *
 * @module web/components/StreamingResponse
 */

import type { StreamingStatus } from '../hooks/useStreamingQuery.js';

interface StreamingResponseProps {
  status: StreamingStatus;
  responseText: string;
  error: string | null;
  requestId: string | null;
  completedAt: string | null;
}

/**
 * Format an ISO timestamp for human display.
 */
function formatTimestamp(iso: string): string {
  try {
    return new Date(iso).toLocaleString();
  } catch {
    return iso;
  }
}

export function StreamingResponse({
  status,
  responseText,
  error,
  requestId,
  completedAt,
}: StreamingResponseProps) {
  if (status === 'idle') {
    return <div />;
  }

  if (status === 'loading') {
    return (
      <div role="status" aria-label="Loading response" className="flex items-center gap-2 py-4 text-sm text-gray-500">
        <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-blue-500 border-t-transparent" />
        Thinking…
      </div>
    );
  }

  if (status === 'error') {
    return (
      <div
        role="alert"
        className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
      >
        {error ?? 'Something went wrong. Please try again.'}
      </div>
    );
  }

  // streaming or complete
  return (
    <div className="mt-4">
      {/* Response text */}
      <div className="rounded-md border border-gray-200 bg-white px-4 py-3 text-sm text-gray-800 leading-relaxed whitespace-pre-wrap">
        {responseText}
        {status === 'streaming' && (
          <span className="ml-0.5 inline-block h-4 w-0.5 animate-pulse bg-blue-500" aria-hidden="true" />
        )}
      </div>

      {/* Completion metadata */}
      {status === 'complete' && requestId && completedAt && (
        <div className="mt-2 flex gap-4 text-xs text-gray-400">
          <span>ID: {requestId}</span>
          <span>{formatTimestamp(completedAt)}</span>
        </div>
      )}
    </div>
  );
}
