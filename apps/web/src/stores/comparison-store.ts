/**
 * Zustand store for comparison mode state.
 *
 * Holds technique selections and the shared query text for both panels.
 * Stream state (status, responseText, error) lives in useDualStreaming, not here.
 *
 * @module web/stores/comparison-store
 */

import { create } from 'zustand';
import { DEFAULT_TECHNIQUE } from './query-store.js';

export interface ComparisonState {
  /** Query text shared across both comparison panels */
  query: string;
  /** Technique selected for the left panel */
  leftTechnique: string;
  /** Technique selected for the right panel */
  rightTechnique: string;
  /** Update query text */
  setQuery: (query: string) => void;
  /** Update left panel technique */
  setLeftTechnique: (technique: string) => void;
  /** Update right panel technique */
  setRightTechnique: (technique: string) => void;
}

export const useComparisonStore = create<ComparisonState>((set) => ({
  query: '',
  leftTechnique: DEFAULT_TECHNIQUE,
  rightTechnique: DEFAULT_TECHNIQUE,
  setQuery: (query) => set({ query }),
  setLeftTechnique: (leftTechnique) => set({ leftTechnique }),
  setRightTechnique: (rightTechnique) => set({ rightTechnique }),
}));
