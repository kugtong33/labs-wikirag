/**
 * Tests for TechniqueSelector component
 *
 * @module web/tests/TechniqueSelector
 */

import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { TechniqueSelector } from '../src/components/TechniqueSelector.js';

const TECHNIQUES = [
  { name: 'naive-rag', description: 'Naive RAG: simple retrieve-then-generate' },
  { name: 'simple-rag', description: 'Simple RAG: lightweight variation' },
];

describe('TechniqueSelector', () => {
  it('renders a labelled select element', () => {
    render(
      <TechniqueSelector
        techniques={TECHNIQUES}
        value="naive-rag"
        onChange={vi.fn()}
      />
    );

    expect(screen.getByRole('combobox')).toBeInTheDocument();
    expect(screen.getByLabelText(/technique/i)).toBeInTheDocument();
  });

  it('shows all provided techniques as options', () => {
    render(
      <TechniqueSelector
        techniques={TECHNIQUES}
        value="naive-rag"
        onChange={vi.fn()}
      />
    );

    expect(screen.getByRole('option', { name: /naive-rag/i })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: /simple-rag/i })).toBeInTheDocument();
  });

  it('calls onChange with new value when selection changes', async () => {
    const onChange = vi.fn();
    render(
      <TechniqueSelector
        techniques={TECHNIQUES}
        value="naive-rag"
        onChange={onChange}
      />
    );

    await userEvent.selectOptions(screen.getByRole('combobox'), 'simple-rag');

    expect(onChange).toHaveBeenCalledWith('simple-rag');
  });

  it('reflects the current value as selected', () => {
    render(
      <TechniqueSelector
        techniques={TECHNIQUES}
        value="simple-rag"
        onChange={vi.fn()}
      />
    );

    expect(screen.getByRole('combobox')).toHaveValue('simple-rag');
  });

  it('is keyboard accessible (has id and label association)', () => {
    render(
      <TechniqueSelector
        techniques={TECHNIQUES}
        value="naive-rag"
        onChange={vi.fn()}
      />
    );

    const select = screen.getByRole('combobox');
    const label = screen.getByText(/technique/i);

    expect(select).toHaveAttribute('id');
    expect(label).toHaveAttribute('for', select.getAttribute('id') ?? '');
  });
});
