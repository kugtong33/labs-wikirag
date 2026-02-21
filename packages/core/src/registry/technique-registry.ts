/**
 * Technique registry
 *
 * The TechniqueRegistry stores and resolves RAG technique instances by name.
 * Techniques register themselves at startup; the pipeline resolves them by
 * name at query time. No core code needs modification when adding a technique.
 *
 * @module core/registry/technique-registry
 */

import * as R from 'ramda';
import type { Technique, TechniqueComposition } from '../types/technique.js';

/**
 * Error thrown by registry operations
 */
export class TechniqueRegistryError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'TechniqueRegistryError';
  }
}

/**
 * Runtime shape for adapter validation.
 */
interface AdapterLike {
  name: string;
  execute: (...args: unknown[]) => unknown;
}

/**
 * Validate adapter shape at runtime to catch malformed techniques.
 */
const isAdapterLike = (value: unknown): value is AdapterLike => {
  if (!R.is(Object, value)) {
    return false;
  }

  const adapter = value as Record<string, unknown>;
  return (
    typeof adapter.name === 'string' &&
    adapter.name.trim().length > 0 &&
    typeof adapter.execute === 'function'
  );
};

/**
 * Validate that a technique composition has all required adapters with valid shape.
 */
const hasRequiredAdapters = (adapters: TechniqueComposition): boolean => R.allPass([
  R.pipe(R.prop('query'), isAdapterLike),
  R.pipe(R.prop('retrieval'), isAdapterLike),
  R.pipe(R.prop('generation'), isAdapterLike),
])(adapters);

/**
 * Registry that stores RAG techniques and resolves them by name.
 *
 * @example
 * ```typescript
 * // Register a technique
 * techniqueRegistry.register({
 *   name: 'naive-rag',
 *   description: 'Simple retrieve-then-generate RAG',
 *   adapters: { query: passthroughQuery, retrieval: qdrantRetrieval, generation: llmGenerator },
 * });
 *
 * // Resolve at query time
 * const technique = techniqueRegistry.get('naive-rag');
 * ```
 */
export class TechniqueRegistry {
  private readonly techniques: Map<string, Technique> = new Map();

  /**
   * Register a technique.
   *
   * @param technique - Technique to register
   * @throws {TechniqueRegistryError} If a technique with the same name is already registered
   * @throws {TechniqueRegistryError} If the technique is missing required adapters
   */
  register(technique: Technique): void {
    if (!technique.name || technique.name.trim() === '') {
      throw new TechniqueRegistryError('Technique name cannot be empty');
    }

    if (!technique.description || technique.description.trim() === '') {
      throw new TechniqueRegistryError('Technique description cannot be empty');
    }

    if (this.techniques.has(technique.name)) {
      throw new TechniqueRegistryError(
        `Technique "${technique.name}" is already registered`
      );
    }

    if (!hasRequiredAdapters(technique.adapters)) {
      throw new TechniqueRegistryError(
        `Technique "${technique.name}" is missing required adapters (query, retrieval, generation) or adapter shape is invalid`
      );
    }

    this.techniques.set(technique.name, technique);
  }

  /**
   * Retrieve a technique by name.
   *
   * @param name - Technique name
   * @returns The technique instance
   * @throws {TechniqueRegistryError} If the technique is not found
   */
  get(name: string): Technique {
    const technique = this.techniques.get(name);
    if (!technique) {
      throw new TechniqueRegistryError(`Technique "${name}" not found in registry`);
    }
    return technique;
  }

  /**
   * List all registered techniques, sorted alphabetically by name.
   *
   * @returns Array of all registered techniques
   */
  list(): Technique[] {
    return R.sortBy(R.prop('name'), Array.from(this.techniques.values()));
  }

  /**
   * Check whether a technique is registered.
   *
   * @param name - Technique name to check
   * @returns true if registered
   */
  has(name: string): boolean {
    return this.techniques.has(name);
  }

  /**
   * Remove all registered techniques.
   * Useful for test isolation.
   */
  clear(): void {
    this.techniques.clear();
  }
}

/**
 * Shared singleton registry instance.
 * Techniques register here at startup; the pipeline resolves from here at runtime.
 */
export const techniqueRegistry = new TechniqueRegistry();
