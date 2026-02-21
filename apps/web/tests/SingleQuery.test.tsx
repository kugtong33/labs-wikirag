/**
 * Tests for SingleQuery page
 *
 * @module web/tests/SingleQuery
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { SingleQuery } from '../src/pages/SingleQuery.js';

// Mock the query store
vi.mock('../src/stores/query-store.js', () => ({
  useQueryStore: vi.fn(),
  DEFAULT_TECHNIQUE: 'naive-rag',
}));

const mockSetMode = vi.fn();
const mockSetTechnique = vi.fn();

const defaultStore = {
  mode: 'single' as const,
  technique: 'naive-rag',
  query: '',
  setMode: mockSetMode,
  setTechnique: mockSetTechnique,
  setQuery: vi.fn(),
};

describe('SingleQuery page', () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    const { useQueryStore } = await import('../src/stores/query-store.js');
    vi.mocked(useQueryStore).mockReturnValue(defaultStore);
  });

  it('renders the main heading', () => {
    render(<SingleQuery techniques={[]} />);
    expect(screen.getByRole('heading', { level: 1 })).toBeInTheDocument();
  });

  it('renders a mode toggle button', () => {
    render(<SingleQuery techniques={[]} />);
    expect(screen.getByRole('button', { name: /comparison/i })).toBeInTheDocument();
  });

  it('renders the TechniqueSelector', () => {
    render(
      <SingleQuery
        techniques={[{ name: 'naive-rag', description: 'Naive RAG' }]}
      />
    );
    expect(screen.getByRole('combobox')).toBeInTheDocument();
  });

  it('clicking mode toggle calls setMode with "comparison"', async () => {
    render(<SingleQuery techniques={[]} />);
    await userEvent.click(screen.getByRole('button', { name: /comparison/i }));
    expect(mockSetMode).toHaveBeenCalledWith('comparison');
  });

  it('renders semantic main landmark', () => {
    render(<SingleQuery techniques={[]} />);
    expect(screen.getByRole('main')).toBeInTheDocument();
  });

  it('mode toggle button is keyboard focusable', () => {
    render(<SingleQuery techniques={[]} />);
    const toggle = screen.getByRole('button', { name: /comparison/i });
    expect(toggle.tagName).toBe('BUTTON');
  });

  it('shows "Comparison" label when mode is comparison', async () => {
    const { useQueryStore } = await import('../src/stores/query-store.js');
    vi.mocked(useQueryStore).mockReturnValue({
      ...defaultStore,
      mode: 'comparison',
    });

    render(<SingleQuery techniques={[]} />);
    expect(screen.getByRole('button', { name: /single/i })).toBeInTheDocument();
  });
});
