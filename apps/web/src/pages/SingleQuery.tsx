/**
 * SingleQuery page — default view
 *
 * Shows the main query input, technique selector dropdown, and a mode toggle
 * button that switches between single-query and comparison views.
 *
 * @module web/pages/SingleQuery
 */

import { TechniqueSelector } from '../components/TechniqueSelector.js';
import { useQueryStore, type ViewMode } from '../stores/query-store.js';

interface Technique {
  name: string;
  description: string;
}

interface SingleQueryProps {
  techniques: Technique[];
}

/**
 * Main single-query view. Houses the technique selector and mode toggle.
 * All state transitions (mode, technique, query) are client-side via Zustand.
 */
export function SingleQuery({ techniques }: SingleQueryProps) {
  const { mode, technique, setMode, setTechnique } = useQueryStore();

  /** Toggle between single and comparison mode */
  const toggleMode = () => {
    const next: ViewMode = mode === 'single' ? 'comparison' : 'single';
    setMode(next);
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

        {/* Query section */}
        <section aria-label="Query">
          <label htmlFor="query-input" className="mb-2 block text-sm font-medium text-gray-700">
            Ask a question about Wikipedia
          </label>
          <textarea
            id="query-input"
            rows={4}
            placeholder="e.g. Who was Albert Einstein?"
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
        </section>
      </div>
    </main>
  );
}
