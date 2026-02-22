/**
 * Tests for App root component and routing
 *
 * @module web/tests/App
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { App } from '../src/App.js';

// Mock fetch for techniques API call
global.fetch = vi.fn();

type MockStore = {
  mode: 'single' | 'comparison';
  technique: string;
  query: string;
  setMode: ReturnType<typeof vi.fn>;
  setTechnique: ReturnType<typeof vi.fn>;
  setQuery: ReturnType<typeof vi.fn>;
};

const mockStore: MockStore = {
  mode: 'single',
  technique: 'naive-rag',
  query: '',
  setMode: vi.fn(),
  setTechnique: vi.fn(),
  setQuery: vi.fn(),
};

// Mock query store
vi.mock('../src/stores/query-store.js', () => ({
  useQueryStore: vi.fn((selector?: (state: typeof mockStore) => unknown) => (
    selector ? selector(mockStore) : mockStore
  )),
  DEFAULT_TECHNIQUE: 'naive-rag',
}));

describe('App', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockStore.mode = 'single';

    vi.mocked(global.fetch).mockResolvedValue({
      ok: true,
      json: async () => ({
        data: [{ name: 'naive-rag', description: 'Naive RAG' }],
        meta: { count: 1, timestamp: new Date().toISOString() },
      }),
    } as Response);
  });

  it('renders the single-query route by default', async () => {
    render(
      <MemoryRouter>
        <App />
      </MemoryRouter>
    );

    expect(await screen.findByRole('heading', { name: 'WikiRAG' })).toBeTruthy();
  });

  it('renders comparison route when mode is comparison', async () => {
    mockStore.mode = 'comparison';

    render(
      <MemoryRouter initialEntries={['/comparison']}>
        <App />
      </MemoryRouter>
    );

    expect(await screen.findByRole('heading', { name: 'WikiRAG Comparison' })).toBeTruthy();
  });

  it('falls back to empty techniques when API payload shape is invalid', async () => {
    vi.mocked(global.fetch).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ data: [{ name: 'naive-rag' }] }),
    } as Response);

    render(
      <MemoryRouter initialEntries={['/']}>
        <App />
      </MemoryRouter>
    );

    expect(await screen.findByRole('combobox')).toBeTruthy();
    expect(screen.queryByRole('option', { name: /naive-rag/i })).toBeNull();
  });
});
