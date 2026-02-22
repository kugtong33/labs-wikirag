/**
 * Tests for index command
 */

import { describe, it, expect } from 'vitest';
import {
  createIndexCommand,
  validateOptions,
} from '../../src/cli/commands/index-command';

describe('Index Command', () => {
  describe('createIndexCommand', () => {
    it('should create a command with correct name', () => {
      const command = createIndexCommand();
      expect(command.name()).toBe('index');
    });

    it('should have required options defined', () => {
      const command = createIndexCommand();
      const options = command.options;

      const hasRequiredOption = (name: string) =>
        options.some((opt) => opt.long === name && opt.required);

      expect(hasRequiredOption('--dump-file')).toBe(true);
      expect(hasRequiredOption('--strategy')).toBe(true);
      expect(hasRequiredOption('--dump-date')).toBe(true);
    });

    it('should have optional parameters', () => {
      const command = createIndexCommand();
      const options = command.options;

      const hasOptionalOption = (name: string) =>
        options.some((opt) => opt.long === name);

      expect(hasOptionalOption('--model')).toBe(true);
      expect(hasOptionalOption('--batch-size')).toBe(true);
      expect(hasOptionalOption('--checkpoint-file')).toBe(true);
    });

    it('should have default values for optional parameters', () => {
      const command = createIndexCommand();
      const options = command.options;

      const providerOption = options.find(
        (opt) => opt.long === '--embedding-provider'
      );
      expect(providerOption?.defaultValue).toBe('openai');

      const modelOption = options.find((opt) => opt.long === '--model');
      expect(modelOption?.defaultValue).toBeUndefined();

      const batchSizeOption = options.find((opt) => opt.long === '--batch-size');
      expect(batchSizeOption?.defaultValue).toBe(100);
    });
  });

  describe('Command validation', () => {
    it('should accept all supported embedding providers', () => {
      expect(() =>
        validateOptions({
          dumpFile: 'dump.xml',
          strategy: 'paragraph',
          dumpDate: '20260210',
          embeddingProvider: 'openai',
        })
      ).not.toThrow();

      expect(() =>
        validateOptions({
          dumpFile: 'dump.xml',
          strategy: 'paragraph',
          dumpDate: '20260210',
          embeddingProvider: 'nomic-embed-text',
        })
      ).not.toThrow();

      expect(() =>
        validateOptions({
          dumpFile: 'dump.xml',
          strategy: 'paragraph',
          dumpDate: '20260210',
          embeddingProvider: 'qwen3-embedding',
        })
      ).not.toThrow();
    });

    it('should reject unsupported embedding providers', () => {
      expect(() =>
        validateOptions({
          dumpFile: 'dump.xml',
          strategy: 'paragraph',
          dumpDate: '20260210',
          embeddingProvider: 'gpt-oss-14b',
        })
      ).toThrow(/Invalid embedding provider/);
    });

    it('should accept valid strategy values', () => {
      const validStrategies = ['paragraph', 'chunked', 'document'];
      expect(validStrategies).toContain('paragraph');
      expect(validStrategies).toContain('chunked');
      expect(validStrategies).toContain('document');
    });

    it('should validate dump date format', () => {
      const validDatePattern = /^\d{8}$/;

      expect(validDatePattern.test('20260210')).toBe(true);
      expect(validDatePattern.test('2026-02-10')).toBe(false);
      expect(validDatePattern.test('202602')).toBe(false);
      expect(validDatePattern.test('invalid')).toBe(false);
    });

    it('should validate batch size range', () => {
      const isValidBatchSize = (size: number) => size >= 1 && size <= 2048;

      expect(isValidBatchSize(1)).toBe(true);
      expect(isValidBatchSize(100)).toBe(true);
      expect(isValidBatchSize(2048)).toBe(true);
      expect(isValidBatchSize(0)).toBe(false);
      expect(isValidBatchSize(2049)).toBe(false);
      expect(isValidBatchSize(-1)).toBe(false);
    });

    it('should reject non-finite batch size values', () => {
      expect(() =>
        validateOptions({
          dumpFile: 'dump.xml',
          strategy: 'paragraph',
          dumpDate: '20260210',
          batchSize: Number.NaN,
        }),
      ).toThrow(/Invalid batch size/);
    });

    it('should reject non-finite streams values', () => {
      expect(() =>
        validateOptions({
          dumpFile: 'dump.xml.bz2',
          strategy: 'paragraph',
          dumpDate: '20260210',
          streams: Number.NaN,
          indexFile: 'dump-index.txt',
        }),
      ).toThrow(/Invalid streams count/);
    });
  });
});
