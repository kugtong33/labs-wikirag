/**
 * Tests for the quality CLI command
 */

import { describe, it, expect } from 'vitest';
import {
  createQualityCommand,
  extractProviderFromCollection,
  DEFAULT_TOP_K,
} from '../../src/cli/commands/quality-command.js';

describe('createQualityCommand', () => {
  it('creates a command with name "quality"', () => {
    const command = createQualityCommand();
    expect(command.name()).toBe('quality');
  });

  it('has required --query option', () => {
    const command = createQualityCommand();
    const queryOption = command.options.find((opt) => opt.long === '--query');
    expect(queryOption).toBeDefined();
    expect(queryOption?.required).toBe(true);
  });

  it('has required --collections option', () => {
    const command = createQualityCommand();
    const collectionsOption = command.options.find(
      (opt) => opt.long === '--collections'
    );
    expect(collectionsOption).toBeDefined();
    expect(collectionsOption?.required).toBe(true);
  });

  it('has --top-k option with default value', () => {
    const command = createQualityCommand();
    const topKOption = command.options.find((opt) => opt.long === '--top-k');
    expect(topKOption).toBeDefined();
    expect(topKOption?.defaultValue).toBe(DEFAULT_TOP_K);
  });
});

describe('extractProviderFromCollection', () => {
  it('extracts openai from standard collection name', () => {
    expect(extractProviderFromCollection('wiki-paragraph-openai-20260215')).toBe(
      'openai'
    );
  });

  it('extracts multi-segment provider names', () => {
    expect(
      extractProviderFromCollection('wiki-paragraph-nomic-embed-text-20260215')
    ).toBe('nomic-embed-text');

    expect(
      extractProviderFromCollection('wiki-paragraph-qwen3-embedding-20260215')
    ).toBe('qwen3-embedding');
  });

  it('handles names without wiki prefix', () => {
    expect(extractProviderFromCollection('paragraph-openai-20260215')).toBe(
      'openai'
    );
  });

  it('handles names without date suffix', () => {
    expect(extractProviderFromCollection('wiki-paragraph-openai')).toBe('openai');
  });

  it('returns input when no delimiter exists', () => {
    expect(extractProviderFromCollection('openai')).toBe('openai');
  });
});
