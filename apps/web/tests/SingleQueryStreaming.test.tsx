/**
 * Integration tests for SingleQuery page with streaming wired up
 *
 * @module web/tests/SingleQueryStreaming
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { SingleQuery } from '../src/pages/SingleQuery.js';

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

// Mock useStreamingQuery so tests don't call real fetch
const { mockSubmit, mockUseStreamingQuery } = vi.hoisted(() => ({
  mockSubmit: vi.fn(),
  mockUseStreamingQuery: vi.fn(),
}));

vi.mock('../src/hooks/useStreamingQuery.js', () => ({
  useStreamingQuery: mockUseStreamingQuery,
}));

const idleState = {
  status: 'idle' as const,
  responseText: '',
  error: null,
  requestId: null,
  completedAt: null,
  submit: mockSubmit,
};

describe('SingleQuery — streaming integration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseStreamingQuery.mockReturnValue(idleState);
  });

  it('renders a submit button', () => {
    render(<SingleQuery techniques={[]} />);
    expect(screen.getByRole('button', { name: /ask/i })).toBeInTheDocument();
  });

  it('textarea updates query via setQuery on change', async () => {
    const mockSetQuery = vi.fn();
    const { useQueryStore } = await import('../src/stores/query-store.js');
    vi.mocked(useQueryStore).mockReturnValue({
      mode: 'single',
      technique: 'naive-rag',
      query: '',
      setMode: vi.fn(),
      setTechnique: vi.fn(),
      setQuery: mockSetQuery,
    });

    render(<SingleQuery techniques={[]} />);
    await userEvent.type(screen.getByRole('textbox', { name: /ask/i }), 'Hello');

    expect(mockSetQuery).toHaveBeenCalled();
  });

  it('clicking Ask button calls submit with query and technique', async () => {
    const { useQueryStore } = await import('../src/stores/query-store.js');
    vi.mocked(useQueryStore).mockReturnValue({
      mode: 'single',
      technique: 'naive-rag',
      query: 'Who is Einstein?',
      setMode: vi.fn(),
      setTechnique: vi.fn(),
      setQuery: vi.fn(),
    });

    render(<SingleQuery techniques={[]} />);
    await userEvent.click(screen.getByRole('button', { name: /ask/i }));

    expect(mockSubmit).toHaveBeenCalledWith('Who is Einstein?', 'naive-rag');
  });

  it('renders StreamingResponse component', () => {
    mockUseStreamingQuery.mockReturnValue({
      ...idleState,
      status: 'loading',
    });

    render(<SingleQuery techniques={[]} />);
    expect(screen.getByRole('status')).toBeInTheDocument();
  });

  it('disables submit button while loading', () => {
    mockUseStreamingQuery.mockReturnValue({
      ...idleState,
      status: 'loading',
    });

    render(<SingleQuery techniques={[]} />);
    expect(screen.getByRole('button', { name: /ask/i })).toBeDisabled();
  });

  it('disables submit button while streaming', () => {
    mockUseStreamingQuery.mockReturnValue({
      ...idleState,
      status: 'streaming',
      responseText: 'Partial...',
    });

    render(<SingleQuery techniques={[]} />);
    expect(screen.getByRole('button', { name: /ask/i })).toBeDisabled();
  });
});
