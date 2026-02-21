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

// Mock query store
vi.mock('../src/stores/query-store.js', () => ({
  useQueryStore: vi.fn(() => ({
    mode: 'single',
    technique: 'naive-rag',
    query: '',
    setMode: vi.fn(),
    setTechnique: vi.fn(),
    setQuery: vi.fn(),
  })),
  DEFAULT_TECHNIQUE: 'naive-rag',
}));

describe('App', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(global.fetch).mockResolvedValue({
      ok: true,
      json: async () => ({
        data: [{ name: 'naive-rag', description: 'Naive RAG' }],
        meta: { count: 1, timestamp: new Date().toISOString() },
      }),
    } as Response);
  });

  it('renders without crashing', () => {
    render(
      <MemoryRouter>
        <App />
      </MemoryRouter>
    );
    // App renders something
    expect(document.body).toBeTruthy();
  });

  it('renders the main heading on the default route', async () => {
    render(
      <MemoryRouter initialEntries={['/']}>
        <App />
      </MemoryRouter>
    );

    expect(await screen.findByRole('heading', { level: 1 })).toBeInTheDocument();
  });

  it('renders a main landmark', async () => {
    render(
      <MemoryRouter initialEntries={['/']}>
        <App />
      </MemoryRouter>
    );

    expect(await screen.findByRole('main')).toBeInTheDocument();
  });
});
