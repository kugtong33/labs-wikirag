# Story 2.1: Pipeline Adapter Interfaces and Technique Registry

Status: review

## Story

As a contributor,
I want well-defined adapter interfaces for each pipeline stage and a registry that discovers techniques at startup,
So that new RAG techniques can be added by implementing adapters without modifying core code.

## Acceptance Criteria

1. **Given** the `packages/core` package, **When** I review the adapter interfaces, **Then** there are interfaces for all 5 pipeline stages: query, pre-retrieval, retrieval, post-retrieval, generation **And** each interface defines a clear input/output contract **And** a technique is defined as a composition of stage adapters.

2. **Given** technique modules are registered in `packages/core/techniques/`, **When** the system starts, **Then** the technique registry discovers and lists all available techniques **And** each technique can be resolved by name to its stage adapter composition.

3. **Given** I create a new technique, **When** I implement the required stage adapters, **Then** I do NOT need to modify core pipeline code **And** the technique is automatically discovered by the registry.

4. **Given** a pipeline stage adapter interface, **When** I examine it, **Then** it includes TypeScript types for input/output **And** it has clear JSDoc documentation **And** example implementations are available.

## Tasks / Subtasks

- [x] Task 1: Create packages/core package structure (AC: 1)
  - [x] 1.1 Create packages/core/package.json
  - [x] 1.2 Create packages/core/tsconfig.json
  - [x] 1.3 Create src/types/ directory for adapter interfaces
  - [x] 1.4 Create src/techniques/ directory for technique implementations
  - [x] 1.5 Create src/registry/ for technique discovery
- [x] Task 2: Define adapter interfaces (AC: 1, 4)
  - [x] 2.1 Create src/types/query-adapter.ts
  - [x] 2.2 Create src/types/pre-retrieval-adapter.ts
  - [x] 2.3 Create src/types/retrieval-adapter.ts
  - [x] 2.4 Create src/types/post-retrieval-adapter.ts
  - [x] 2.5 Create src/types/generation-adapter.ts
  - [x] 2.6 Add comprehensive JSDoc to all interfaces
- [x] Task 3: Create shared types (AC: 1)
  - [x] 3.1 Create src/types/pipeline-context.ts
  - [x] 3.2 Define PipelineContext type (query, retrievedDocs, config)
  - [x] 3.3 Define RetrievedDocument type
  - [x] 3.4 Define PipelineConfig type
- [x] Task 4: Implement technique registry (AC: 2, 3)
  - [x] 4.1 Create src/registry/technique-registry.ts
  - [x] 4.2 Implement registerTechnique(name, composition)
  - [x] 4.3 Implement getTechnique(name)
  - [x] 4.4 Implement listTechniques()
  - [x] 4.5 Use Map for O(1) technique lookup
- [x] Task 5: Define Technique type (AC: 1)
  - [x] 5.1 Create src/types/technique.ts
  - [x] 5.2 Define Technique interface (name, description, adapters)
  - [x] 5.3 Define TechniqueComposition type
- [x] Task 6: Add comprehensive tests (AC: All)
  - [x] 6.1 Create tests/registry/technique-registry.test.ts
  - [x] 6.2 Test registration and retrieval
  - [x] 6.3 Test technique listing
  - [x] 6.4 Test error cases (duplicate registration, not found)
  - [x] 6.5 Run pnpm test (all tests pass)

## Dev Notes

### Architecture Compliance

**Package Structure** [Source: architecture.md#Project Structure & Boundaries]
```
packages/core/
├── package.json
├── tsconfig.json
├── src/
│   ├── types/
│   │   ├── query-adapter.ts
│   │   ├── pre-retrieval-adapter.ts
│   │   ├── retrieval-adapter.ts
│   │   ├── post-retrieval-adapter.ts
│   │   ├── generation-adapter.ts
│   │   ├── pipeline-context.ts
│   │   └── technique.ts
│   ├── registry/
│   │   └── technique-registry.ts
│   ├── techniques/          # For technique implementations (Story 2.2+)
│   └── index.ts
└── tests/
    └── registry/
        └── technique-registry.test.ts
```

**Architectural Pattern** [Source: architecture.md#Pipeline Architecture]
- Adapter pattern for extensibility
- Registry pattern for discovery
- Dependency injection for testability
- Composition over inheritance

### Technical Requirements

**Pipeline Stages** [Source: PRD and architecture.md]

1. **Query Adapter**: Transform user query
   - Input: raw query string
   - Output: processed query (string | enhanced query object)

2. **Pre-Retrieval Adapter**: Enhance query before retrieval
   - Input: processed query
   - Output: retrieval query (could be embedding, expanded query, etc.)

3. **Retrieval Adapter**: Fetch relevant documents
   - Input: retrieval query
   - Output: array of retrieved documents with scores

4. **Post-Retrieval Adapter**: Process/filter retrieved documents
   - Input: retrieved documents
   - Output: refined/reranked documents

5. **Generation Adapter**: Generate final response
   - Input: refined documents + original query
   - Output: generated text (string or stream)

**Adapter Interface Pattern:**
```typescript
interface BaseAdapter {
  name: string;
  execute(context: PipelineContext): Promise<AdapterOutput>;
}
```

**Pipeline Context:**
```typescript
interface PipelineContext {
  query: string;
  processedQuery?: string | object;
  retrievedDocuments?: RetrievedDocument[];
  config: PipelineConfig;
  metadata: Record<string, any>;
}
```

**Technique Composition:**
```typescript
interface Technique {
  name: string;
  description: string;
  adapters: {
    query: QueryAdapter;
    preRetrieval?: PreRetrievalAdapter;      // Optional
    retrieval: RetrievalAdapter;
    postRetrieval?: PostRetrievalAdapter;    // Optional
    generation: GenerationAdapter;
  };
}
```

### Library/Framework Requirements

| Dependency | Version | Scope | Notes |
|-----------|---------|-------|-------|
| @wikirag/tsconfig | workspace:* | devDependency | Shared TS config |
| ramda | ^0.32.0 | dependency | Data transformations |
| @types/ramda | ^0.31.1 | devDependency | Ramda types |
| typescript | ^5.9.3 | devDependency | TypeScript compiler |
| vitest | ^4.0.18 | devDependency | Testing framework |

### Ramda.js Integration

**Registry Operations:**
```typescript
import * as R from 'ramda';

// Get all technique names
const getTechniqueNames = R.pipe(
  R.values,
  R.pluck('name')
);

// Validate technique composition
const hasRequiredAdapters = R.allPass([
  R.has('query'),
  R.has('retrieval'),
  R.has('generation')
]);

// Find technique by predicate
const findTechnique = R.curry(
  (predicate, techniques) => R.find(predicate, R.values(techniques))
);
```

### Previous Story Intelligence

**From Epic 1 Stories:**
- Package structure pattern from @wikirag/qdrant (Story 1.2)
- TypeScript strict mode and interface patterns
- Singleton pattern for shared instances
- Comprehensive JSDoc documentation
- Test coverage with vitest

**Key Patterns to Replicate:**
- One interface per file
- Barrel export via index.ts
- Type-safe with generics where appropriate
- Error classes for domain errors

### Testing Strategy

**Registry Tests:**
- Test technique registration
- Test duplicate registration (should error or warn)
- Test technique retrieval by name
- Test technique listing
- Test technique not found scenario
- Test technique validation

**Interface Tests:**
- Compile-time verification through TypeScript
- Example implementations for each adapter type
- Test that techniques can be composed

### Anti-Patterns to Avoid

- Do NOT tightly couple techniques to specific implementations
- Do NOT require modifying registry when adding techniques
- Do NOT use string-based stage names without type safety
- Do NOT skip optional stages in interface (use optional properties)
- Do NOT hardcode technique list (use dynamic registration)

### Implementation Notes

**Technique Discovery:**
- Manual registration (for MVP)
- Auto-discovery from files (future enhancement)

**Registry Singleton:**
```typescript
class TechniqueRegistry {
  private techniques: Map<string, Technique> = new Map();

  register(technique: Technique): void {
    if (this.techniques.has(technique.name)) {
      throw new Error(`Technique ${technique.name} already registered`);
    }
    this.techniques.set(technique.name, technique);
  }

  get(name: string): Technique | undefined {
    return this.techniques.get(name);
  }

  list(): Technique[] {
    return Array.from(this.techniques.values());
  }
}

export const techniqueRegistry = new TechniqueRegistry();
```

### References

- [Source: architecture.md#Pipeline Architecture] - RAG pipeline design
- [Source: PRD FR1-5] - Adapter requirements
- [Source: epics.md#Story 2.1] - Acceptance criteria
- [Adapter Pattern](https://refactoring.guru/design-patterns/adapter) - Design pattern reference

## Dev Agent Record

### Agent Model Used

claude-sonnet-4-6

### Debug Log References

No issues. The `packages/core` package skeleton (package.json, tsconfig.json, empty index.ts) already existed without vitest; added vitest devDependency and `"type": "module"` to complete the scaffold.

### Completion Notes List

- All 5 pipeline-stage adapter interfaces implemented with full JSDoc and `@example` blocks
- `PipelineContext` is the single mutable carrier object passed through all stages
- `TechniqueRegistry` uses `Map<string, Technique>` for O(1) lookup; `list()` uses `R.sortBy` (Ramda)
- Validation via `R.allPass` ensures required adapters (query, retrieval, generation) are present at registration time
- `techniqueRegistry` singleton exported for runtime use; `TechniqueRegistry` class exported for test isolation
- 20 tests: registration (7), get (3), has (2), list (3), clear (2), singleton (2)

### Change Log

2026-02-21: Story implemented by claude-sonnet-4-6

### File List

- `packages/core/package.json` — MODIFIED: added `"type": "module"`, vitest devDependency, fixed test script
- `packages/core/tsconfig.json` — MODIFIED: no functional change (re-confirmed correct)
- `packages/core/vitest.config.ts` — NEW: vitest config (globals: true, node env)
- `packages/core/src/index.ts` — MODIFIED: barrel exports for all types and registry
- `packages/core/src/types/pipeline-context.ts` — NEW: PipelineContext, PipelineConfig, RetrievedDocument
- `packages/core/src/types/query-adapter.ts` — NEW: QueryAdapter interface
- `packages/core/src/types/pre-retrieval-adapter.ts` — NEW: PreRetrievalAdapter interface
- `packages/core/src/types/retrieval-adapter.ts` — NEW: RetrievalAdapter interface
- `packages/core/src/types/post-retrieval-adapter.ts` — NEW: PostRetrievalAdapter interface
- `packages/core/src/types/generation-adapter.ts` — NEW: GenerationAdapter interface
- `packages/core/src/types/technique.ts` — NEW: Technique, TechniqueComposition types
- `packages/core/src/registry/technique-registry.ts` — NEW: TechniqueRegistry, TechniqueRegistryError, techniqueRegistry singleton
- `packages/core/src/techniques/.gitkeep` — NEW: placeholder for future technique implementations
- `packages/core/tests/registry/technique-registry.test.ts` — NEW: 20 tests
