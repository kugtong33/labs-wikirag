/**
 * ComparisonMode page — side-by-side dual RAG technique comparison
 *
 * Renders two independent streaming panels. Each panel has its own technique
 * selector. Both pipelines run concurrently; one completing never blocks the other.
 *
 * @module web/pages/ComparisonMode
 */

import { useQueryStore, type ViewMode } from '../stores/query-store.js';
import { useComparisonStore } from '../stores/comparison-store.js';
import { useDualStreaming } from '../hooks/useDualStreaming.js';
import { ComparisonPanel } from '../components/ComparisonPanel.js';

interface Technique {
  name: string;
  description: string;
}

interface ComparisonModeProps {
  techniques: Technique[];
}

export function ComparisonMode({ techniques }: ComparisonModeProps) {
  const { mode, setMode } = useQueryStore();
  const { query, leftTechnique, rightTechnique, setQuery, setLeftTechnique, setRightTechnique } =
    useComparisonStore();
  const { leftState, rightState, submit } = useDualStreaming();

  const isSubmitting =
    leftState.status === 'loading' ||
    leftState.status === 'streaming' ||
    rightState.status === 'loading' ||
    rightState.status === 'streaming';

  const toggleMode = () => {
    const next: ViewMode = mode === 'comparison' ? 'single' : 'comparison';
    setMode(next);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (query.trim()) {
      submit(query.trim(), leftTechnique, rightTechnique);
    }
  };

  return (
    <main className="min-h-screen bg-gray-50 px-4 py-8">
      <div className="mx-auto max-w-5xl">
        {/* Header */}
        <div className="mb-6 flex items-center justify-between">
          <h1 className="text-2xl font-bold text-gray-900">WikiRAG Comparison</h1>
          <button
            type="button"
            onClick={toggleMode}
            className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
            aria-pressed={mode === 'single'}
          >
            Switch to Single
          </button>
        </div>

        {/* Query form */}
        <form onSubmit={handleSubmit} className="mb-6">
          <label htmlFor="comparison-query" className="mb-2 block text-sm font-medium text-gray-700">
            Ask a question about Wikipedia
          </label>
          <textarea
            id="comparison-query"
            rows={3}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="e.g. Who was Albert Einstein?"
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
          <div className="mt-3 flex justify-end">
            <button
              type="submit"
              disabled={isSubmitting || !query.trim()}
              className="rounded-md bg-blue-600 px-5 py-2 text-sm font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isSubmitting ? 'Comparing…' : 'Compare'}
            </button>
          </div>
        </form>

        {/* Side-by-side panels */}
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <ComparisonPanel
            label="Left"
            techniqueName={leftTechnique}
            techniques={techniques}
            state={leftState}
            onTechniqueChange={setLeftTechnique}
          />
          <ComparisonPanel
            label="Right"
            techniqueName={rightTechnique}
            techniques={techniques}
            state={rightState}
            onTechniqueChange={setRightTechnique}
          />
        </div>
      </div>
    </main>
  );
}
