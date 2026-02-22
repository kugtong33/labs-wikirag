import { TechniqueSelector } from '../components/TechniqueSelector.js';
import { useQueryStore } from '../stores/query-store.js';

interface Technique {
  name: string;
  description: string;
}

interface ComparisonModeProps {
  techniques: Technique[];
}

export function ComparisonMode({ techniques }: ComparisonModeProps) {
  const { mode, technique, query, setMode, setTechnique, setQuery } = useQueryStore();

  return (
    <main className="min-h-screen bg-gray-50 px-4 py-8">
      <div className="mx-auto max-w-2xl">
        <h1 className="mb-2 text-2xl font-bold text-gray-900">WikiRAG Comparison</h1>
        <p className="mb-6 text-sm text-gray-600">
          Comparison mode shell is active. Full dual-stream comparison arrives in Story 3.3.
        </p>

        <div className="mb-6 flex items-end justify-between gap-4">
          <TechniqueSelector
            techniques={techniques}
            value={technique}
            onChange={setTechnique}
          />

          <button
            type="button"
            onClick={() => setMode('single')}
            className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
            aria-pressed={mode === 'single'}
          >
            Switch to Single
          </button>
        </div>

        <section aria-label="Query">
          <label htmlFor="query-input" className="mb-2 block text-sm font-medium text-gray-700">
            Ask a question about Wikipedia
          </label>
          <textarea
            id="query-input"
            rows={4}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Comparison mode uses this query in Story 3.3"
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
        </section>

        <div className="mt-3 flex justify-end">
          <button
            type="button"
            disabled
            className="rounded-md bg-blue-600 px-5 py-2 text-sm font-medium text-white disabled:cursor-not-allowed disabled:opacity-50"
          >
            Submit (Story 3.3)
          </button>
        </div>
      </div>
    </main>
  );
}
