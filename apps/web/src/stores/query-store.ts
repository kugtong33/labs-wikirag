/**
 * Zustand store for query state management.
 *
 * Holds the active view mode (single vs comparison), selected technique,
 * and current query text. All transitions are synchronous/client-side.
 *
 * @module web/stores/query-store
 */

import { create } from 'zustand';

/** Available view modes */
export type ViewMode = 'single' | 'comparison';

export interface QueryState {
  /** Current view mode */
  mode: ViewMode;
  /** Selected RAG technique name */
  technique: string;
  /** Current query text */
  query: string;
  /** Switch between single and comparison mode */
  setMode: (mode: ViewMode) => void;
  /** Update the selected technique */
  setTechnique: (technique: string) => void;
  /** Update the query text */
  setQuery: (query: string) => void;
}

/** Default technique used when no selection is made */
export const DEFAULT_TECHNIQUE = 'naive-rag';

export const useQueryStore = create<QueryState>((set) => ({
  mode: 'single',
  technique: DEFAULT_TECHNIQUE,
  query: '',
  setMode: (mode) => set({ mode }),
  setTechnique: (technique) => set({ technique }),
  setQuery: (query) => set({ query }),
}));
