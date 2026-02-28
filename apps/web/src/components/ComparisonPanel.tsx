/**
 * ComparisonPanel component
 *
 * Renders one panel in comparison mode: a technique selector at the top
 * and a streaming response display below. Both sides are independent —
 * one completing never blocks the other.
 *
 * @module web/components/ComparisonPanel
 */

import { TechniqueSelector } from './TechniqueSelector.js';
import type { PanelStreamState } from '../hooks/useDualStreaming.js';
import type { StreamingStatus } from '../hooks/useStreamingQuery.js';

interface Technique {
  name: string;
  description: string;
}

interface ComparisonPanelProps {
  /** Panel label shown in the heading ('Left' or 'Right') */
  label: string;
  /** Currently selected technique name */
  techniqueName: string;
  /** All available techniques for the selector */
  techniques: Technique[];
  /** Streaming state for this panel */
  state: PanelStreamState;
  /** Called when the user changes the technique selection */
  onTechniqueChange: (technique: string) => void;
}

/**
 * Status badge shown inside the panel header.
 */
function StatusBadge({ status }: { status: StreamingStatus }) {
  const labels: Record<StreamingStatus, string> = {
    idle: 'Idle',
    loading: 'Loading…',
    streaming: 'Streaming…',
    complete: 'Complete',
    error: 'Error',
  };

  const colours: Record<StreamingStatus, string> = {
    idle: 'bg-gray-100 text-gray-500',
    loading: 'bg-blue-100 text-blue-600',
    streaming: 'bg-green-100 text-green-700',
    complete: 'bg-green-100 text-green-700',
    error: 'bg-red-100 text-red-600',
  };

  return (
    <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${colours[status]}`}>
      {labels[status]}
    </span>
  );
}

/**
 * One side of the comparison view — technique selector + response area.
 */
export function ComparisonPanel({
  label,
  techniqueName,
  techniques,
  state,
  onTechniqueChange,
}: ComparisonPanelProps) {
  const { status, responseText, error, completedAt } = state;
  const isActive = status === 'loading' || status === 'streaming';

  return (
    <div className="flex flex-col gap-3 rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
      {/* Panel header */}
      <div className="flex items-center justify-between gap-2">
        <span className="text-sm font-semibold text-gray-700">{label}</span>
        <StatusBadge status={status} />
      </div>

      {/* Technique selector */}
      <TechniqueSelector
        techniques={techniques}
        value={techniqueName}
        onChange={onTechniqueChange}
      />

      {/* Response area */}
      <div className="min-h-[160px]">
        {status === 'idle' && (
          <p className="text-sm text-gray-400 italic">Submit a query to see results.</p>
        )}

        {status === 'loading' && (
          <div role="status" aria-label="Loading response" className="flex items-center gap-2 py-4 text-sm text-gray-500">
            <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-blue-500 border-t-transparent" />
            Thinking…
          </div>
        )}

        {status === 'error' && (
          <div
            role="alert"
            className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
          >
            {error ?? 'Something went wrong. Please try again.'}
          </div>
        )}

        {(status === 'streaming' || status === 'complete') && (
          <div>
            <div className="rounded-md border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-800 leading-relaxed whitespace-pre-wrap">
              {responseText}
              {isActive && (
                <span className="ml-0.5 inline-block h-4 w-0.5 animate-pulse bg-blue-500" aria-hidden="true" />
              )}
            </div>
            {status === 'complete' && completedAt && (
              <p className="mt-1 text-xs text-gray-400">
                Completed {new Date(completedAt).toLocaleTimeString()}
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
