/**
 * Tests for TechniqueRegistry
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  TechniqueRegistry,
  TechniqueRegistryError,
  techniqueRegistry,
} from '../../src/registry/technique-registry.js';
import type { Technique, TechniqueComposition } from '../../src/types/technique.js';
import type { PipelineContext } from '../../src/types/pipeline-context.js';

// ---------------------------------------------------------------------------
// Minimal adapter stubs
// ---------------------------------------------------------------------------

const noopExec = async (ctx: PipelineContext) => ctx;

const stubComposition: TechniqueComposition = {
  query: { name: 'stub-query', execute: noopExec },
  retrieval: { name: 'stub-retrieval', execute: noopExec },
  generation: { name: 'stub-generation', execute: noopExec },
};

function makeTechnique(name: string, overrides?: Partial<TechniqueComposition>): Technique {
  return {
    name,
    description: `${name} technique`,
    adapters: { ...stubComposition, ...overrides },
  };
}

// ---------------------------------------------------------------------------
// TechniqueRegistry — registration
// ---------------------------------------------------------------------------

describe('TechniqueRegistry', () => {
  let registry: TechniqueRegistry;

  beforeEach(() => {
    registry = new TechniqueRegistry();
  });

  describe('register()', () => {
    it('registers a valid technique without error', () => {
      expect(() => registry.register(makeTechnique('naive-rag'))).not.toThrow();
    });

    it('throws TechniqueRegistryError on duplicate registration', () => {
      registry.register(makeTechnique('naive-rag'));
      expect(() => registry.register(makeTechnique('naive-rag'))).toThrow(TechniqueRegistryError);
    });

    it('duplicate error message includes the technique name', () => {
      registry.register(makeTechnique('naive-rag'));
      expect(() => registry.register(makeTechnique('naive-rag'))).toThrow(
        /naive-rag.*already registered/
      );
    });

    it('throws TechniqueRegistryError when name is empty string', () => {
      expect(() =>
        registry.register({ name: '', description: 'bad', adapters: stubComposition })
      ).toThrow(TechniqueRegistryError);
    });

    it('throws TechniqueRegistryError when name is whitespace only', () => {
      expect(() =>
        registry.register({ name: '   ', description: 'bad', adapters: stubComposition })
      ).toThrow(TechniqueRegistryError);
    });

    it('throws TechniqueRegistryError when description is empty', () => {
      expect(() =>
        registry.register({
          name: 'naive-rag',
          description: '',
          adapters: stubComposition,
        })
      ).toThrow(TechniqueRegistryError);
    });

    it('throws TechniqueRegistryError when required adapters are missing', () => {
      const incomplete = {
        name: 'missing-adapters',
        description: 'missing required stages',
        adapters: {
          // missing retrieval and generation
          query: stubComposition.query,
        } as unknown as TechniqueComposition,
      };
      expect(() => registry.register(incomplete)).toThrow(TechniqueRegistryError);
    });

    it('missing adapters error message mentions required adapters', () => {
      const incomplete = {
        name: 'bad-technique',
        description: 'incomplete',
        adapters: { query: stubComposition.query } as unknown as TechniqueComposition,
      };
      expect(() => registry.register(incomplete)).toThrow(/required adapters/);
    });

    it('throws when required adapter shape is invalid at runtime', () => {
      const invalid = {
        name: 'bad-shape',
        description: 'invalid adapter runtime shape',
        adapters: {
          query: { name: 'query', execute: noopExec },
          retrieval: { name: 'retrieval' },
          generation: { name: 'generation', execute: noopExec },
        } as unknown as TechniqueComposition,
      };

      expect(() => registry.register(invalid)).toThrow(/adapter shape is invalid/);
    });

    it('accepts optional preRetrieval and postRetrieval adapters', () => {
      const full = makeTechnique('full-pipeline', {
        preRetrieval: { name: 'stub-pre', execute: noopExec },
        postRetrieval: { name: 'stub-post', execute: noopExec },
      });
      expect(() => registry.register(full)).not.toThrow();
    });
  });

  // ---------------------------------------------------------------------------
  // get()
  // ---------------------------------------------------------------------------

  describe('get()', () => {
    it('returns the registered technique by name', () => {
      const t = makeTechnique('naive-rag');
      registry.register(t);
      expect(registry.get('naive-rag')).toBe(t);
    });

    it('throws TechniqueRegistryError for an unknown technique', () => {
      expect(() => registry.get('does-not-exist')).toThrow(TechniqueRegistryError);
    });

    it('not-found error message includes the technique name', () => {
      expect(() => registry.get('unknown-tech')).toThrow(/unknown-tech.*not found/);
    });
  });

  // ---------------------------------------------------------------------------
  // has()
  // ---------------------------------------------------------------------------

  describe('has()', () => {
    it('returns true for a registered technique', () => {
      registry.register(makeTechnique('naive-rag'));
      expect(registry.has('naive-rag')).toBe(true);
    });

    it('returns false for an unregistered technique', () => {
      expect(registry.has('unknown')).toBe(false);
    });
  });

  // ---------------------------------------------------------------------------
  // list()
  // ---------------------------------------------------------------------------

  describe('list()', () => {
    it('returns empty array when no techniques are registered', () => {
      expect(registry.list()).toEqual([]);
    });

    it('returns all registered techniques', () => {
      registry.register(makeTechnique('naive-rag'));
      registry.register(makeTechnique('corrective-rag'));
      const names = registry.list().map((t) => t.name);
      expect(names).toContain('naive-rag');
      expect(names).toContain('corrective-rag');
      expect(names).toHaveLength(2);
    });

    it('returns techniques sorted alphabetically by name', () => {
      registry.register(makeTechnique('z-technique'));
      registry.register(makeTechnique('a-technique'));
      registry.register(makeTechnique('m-technique'));
      const names = registry.list().map((t) => t.name);
      expect(names).toEqual(['a-technique', 'm-technique', 'z-technique']);
    });
  });

  // ---------------------------------------------------------------------------
  // clear()
  // ---------------------------------------------------------------------------

  describe('clear()', () => {
    it('removes all registered techniques', () => {
      registry.register(makeTechnique('naive-rag'));
      registry.clear();
      expect(registry.list()).toHaveLength(0);
    });

    it('allows re-registering the same name after clear()', () => {
      registry.register(makeTechnique('naive-rag'));
      registry.clear();
      expect(() => registry.register(makeTechnique('naive-rag'))).not.toThrow();
    });
  });
});

// ---------------------------------------------------------------------------
// Singleton export
// ---------------------------------------------------------------------------

describe('techniqueRegistry singleton', () => {
  it('is an instance of TechniqueRegistry', () => {
    expect(techniqueRegistry).toBeInstanceOf(TechniqueRegistry);
  });

  it('has a list() method', () => {
    expect(typeof techniqueRegistry.list).toBe('function');
  });
});
