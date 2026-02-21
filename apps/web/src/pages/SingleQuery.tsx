/**
 * SingleQuery page — default view with streaming query experience
 *
 * Wires the query input to the useStreamingQuery hook, streams the SSE
 * response in real-time, and shows completion metadata or error messages.
 *
 * @module web/pages/SingleQuery
 */

import { TechniqueSelector } from '../components/TechniqueSelector.js';
import { StreamingResponse } from '../components/StreamingResponse.js';
import { useQueryStore, type ViewMode } from '../stores/query-store.js';
import { useStreamingQuery } from '../hooks/useStreamingQuery.js';

interface Technique {
  name: string;
  description: string;
}

interface SingleQueryProps {
  techniques: Technique[];
}

/**
 * Main single-query view. Houses the technique selector, mode toggle,
 * query textarea with submit button, and streaming response display.
 */
export function SingleQuery({ techniques }: SingleQueryProps) {
  const { mode, technique, query, setMode, setTechnique, setQuery } = useQueryStore();
  const { status, responseText, error, requestId, completedAt, submit } = useStreamingQuery();

  const isSubmitting = status === 'loading' || status === 'streaming';

  /** Toggle between single and comparison mode */
  const toggleMode = () => {
    const next: ViewMode = mode === 'single' ? 'comparison' : 'single';
    setMode(next);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (query.trim()) {
      submit(query.trim(), technique);
    }
  };

  return (
    <main className="min-h-screen bg-gray-50 px-4 py-8">
      <div className="mx-auto max-w-2xl">
        {/* Page heading */}
        <h1 className="mb-6 text-2xl font-bold text-gray-900">WikiRAG</h1>

        {/* Controls bar */}
        <div className="mb-6 flex items-end justify-between gap-4">
          {/* Technique selector */}
          <TechniqueSelector
            techniques={techniques}
            value={technique}
            onChange={setTechnique}
          />

          {/* Mode toggle */}
          <button
            type="button"
            onClick={toggleMode}
            className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
            aria-pressed={mode === 'comparison'}
          >
            {mode === 'single' ? 'Switch to Comparison' : 'Switch to Single'}
          </button>
        </div>

        {/* Query form */}
        <form onSubmit={handleSubmit}>
          <section aria-label="Query">
            <label htmlFor="query-input" className="mb-2 block text-sm font-medium text-gray-700">
              Ask a question about Wikipedia
            </label>
            <textarea
              id="query-input"
              rows={4}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="e.g. Who was Albert Einstein?"
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </section>

          <div className="mt-3 flex justify-end">
            <button
              type="submit"
              disabled={isSubmitting || !query.trim()}
              className="rounded-md bg-blue-600 px-5 py-2 text-sm font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isSubmitting ? 'Asking…' : 'Ask'}
            </button>
          </div>
        </form>

        {/* Streaming response */}
        <StreamingResponse
          status={status}
          responseText={responseText}
          error={error}
          requestId={requestId}
          completedAt={completedAt}
        />
      </div>
    </main>
  );
}
