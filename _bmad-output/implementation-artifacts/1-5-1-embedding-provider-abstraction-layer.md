# Story 1-5.1: Embedding Provider Abstraction Layer

Status: in-progress

<!-- Note: This story documents work that has been implemented. File created retroactively to track completion. -->

## Story

As a developer,
I want a pluggable embedding provider architecture with clear interfaces,
So that new embedding providers can be added without modifying core indexing code.

## Acceptance Criteria

**Given** the `packages/embeddings` package exists
**When** I review the provider interfaces
**Then** there is a clear `EmbeddingProvider` interface defining the contract for all providers
**And** the interface includes methods: `embed(text: string): Promise<number[]>`, `getModelInfo(): ModelInfo`, `validateConfig(): boolean`
**And** there is a provider registry that discovers and registers providers at startup

**Given** an embedding provider implements the interface
**When** the provider is registered
**Then** it can be selected via CLI flag
**And** it can be discovered via the provider registry

**Given** multiple providers are registered
**When** the CLI lists available providers
**Then** all registered providers are displayed with their model information

## Tasks / Subtasks

- [x] Task 1: Create packages/embeddings package structure (AC: All)
  - [x] Set up package.json with dependencies (openai, ramda)
  - [x] Set up tsconfig.json extending base config
  - [x] Set up vitest.config.ts for testing

- [x] Task 2: Define EmbeddingProvider interface and core types (AC: 1)
  - [x] Create src/types.ts with ModelInfo, ProviderConfig, BatchEmbeddingResult types
  - [x] Create src/provider.ts with EmbeddingProvider interface
  - [x] Document all interface methods with JSDoc

- [x] Task 3: Implement Provider Registry (AC: 1, 2, 3)
  - [x] Create src/registry.ts with ProviderRegistry class
  - [x] Implement singleton pattern for registry
  - [x] Implement register(), getProvider(), listProviders() methods
  - [x] Add provider discovery and validation

- [x] Task 4: Migrate OpenAI implementation to new provider interface (AC: 1, 2)
  - [x] Create src/providers/openai.ts implementing EmbeddingProvider
  - [x] Move OpenAI client logic from CLI to provider
  - [x] Implement retry logic and rate limiting in provider
  - [x] Auto-register OpenAI provider in src/index.ts

- [x] Task 5: Update CLI to use provider registry (AC: 2, 3)
  - [x] Update apps/cli/package.json to depend on @wikirag/embeddings
  - [x] Refactor embedding pipeline to use providerRegistry.getProvider()
  - [x] Add --embedding-provider CLI parameter
  - [x] Update collection naming to include provider name
  - [x] Remove old OpenAI client code from CLI

- [x] Task 6: Write comprehensive tests (AC: All)
  - [x] Create tests/registry.test.ts (21 tests)
  - [x] Create tests/providers/openai.test.ts (13 tests)
  - [x] Test provider registration and discovery
  - [x] Test OpenAI provider configuration validation
  - [x] Ensure all 34 tests pass

## Dev Notes

### Architecture Requirements

**Package Structure (from architecture.md):**
- New package: `packages/embeddings/`
- Shared by CLI (apps/cli) and potentially API (apps/api) in future
- Must follow monorepo conventions with workspace dependencies

**Naming Conventions:**
- Interfaces/Types: PascalCase, NO `I` prefix
- Functions/Variables: camelCase
- Constants: UPPER_SNAKE_CASE
- Files: kebab-case (e.g., `openai-client.ts`)
- Tests: In top-level `tests/` directory per package

**Technical Stack:**
- TypeScript 5.9.3
- Ramda 0.32.0 for functional transformations
- Vitest 4.0.18 for testing
- OpenAI SDK 4.77.3

### Implementation Patterns

**Provider Interface Design:**
```typescript
interface EmbeddingProvider {
  embed(text: string): Promise<number[]>;
  embedBatch(texts: string[]): Promise<BatchEmbeddingResult>;
  getModelInfo(): ModelInfo;
  validateConfig(): ValidationResult;
}
```

**Registry Pattern:**
- Singleton registry for global provider management
- Factory pattern for provider instantiation
- Type-safe provider configuration

**Collection Naming Convention:**
Updated from `wiki-{strategy}-{date}` to `wiki-{strategy}-{provider}-{date}`
Example: `wiki-paragraph-openai-20260215`

### Testing Standards

- Unit tests for all public methods
- Test provider registration and discovery
- Test configuration validation
- Test error handling and edge cases
- Target: 100% coverage for core interfaces

### Previous Story Intelligence

**From Story 1.5 (Indexing CLI):**
- Established Ramda usage patterns for functional transformations
- Checkpoint and resume patterns for long-running processes
- ESM module setup with .js extensions in imports
- Commander.js patterns for CLI parameters
- Graceful shutdown handling with SIGINT

**Git Intelligence (Recent Commits):**
- `ec3846c`: ESLint configuration added - must follow linting rules
- `b835d1e`: Epic 1 code review improvements - focus on accuracy and alignment
- Pattern: TDD approach with tests written first

### File Structure Requirements

```
packages/embeddings/
├── package.json
├── tsconfig.json
├── vitest.config.ts
├── src/
│   ├── index.ts              # Main exports + auto-registration
│   ├── types.ts              # Common types
│   ├── provider.ts           # EmbeddingProvider interface
│   ├── registry.ts           # ProviderRegistry singleton
│   └── providers/
│       └── openai.ts         # OpenAI provider implementation
└── tests/
    ├── registry.test.ts
    └── providers/
        └── openai.test.ts
```

### References

- [Source: epics.md#Epic 1.5, Story 1.5.1] - Acceptance criteria and requirements
- [Source: architecture.md#Project Structure] - Package organization
- [Source: architecture.md#Naming Patterns] - Naming conventions
- [Source: architecture.md#Technical Stack] - Dependencies and versions
- [Source: product-brief.md] - Embedding provider cost analysis and rationale

## Dev Agent Record

### Agent Model Used

Claude Sonnet 4.5 (claude-sonnet-4-5-20250929)

### Debug Log References

N/A - Implementation completed successfully. All tests passing (34 tests total).

### Completion Notes List

- ✅ **Provider Interface**: Created clean `EmbeddingProvider` interface with 4 methods (embed, embedBatch, getModelInfo, validateConfig). Interface is provider-agnostic and extensible.

- ✅ **Provider Registry**: Implemented singleton `ProviderRegistry` with register/unregister/getProvider/listProviders methods. Uses factory pattern for provider instantiation. Auto-discovery at startup.

- ✅ **OpenAI Provider**: Migrated existing OpenAI client to new provider architecture. Implements full interface with retry logic, rate limiting, and exponential backoff. Validates configuration before use.

- ✅ **Type Safety**: Comprehensive TypeScript types for ModelInfo, ProviderConfig, OpenAIConfig, LocalLLMConfig, BatchEmbeddingResult, ValidationResult. Full type inference throughout.

- ✅ **CLI Integration**: Updated embedding pipeline to use `providerRegistry.getProvider()`. Added `--embedding-provider` CLI parameter. Updated batch processor to use `EmbeddingProvider` interface instead of concrete OpenAIClient.

- ✅ **Collection Naming**: Updated Qdrant collection naming to `wiki-{strategy}-{provider}-{date}` format to support multiple embedding providers with separate collections.

- ✅ **Testing**: 34 tests passing - 21 registry tests, 13 OpenAI provider tests. Tests cover registration, discovery, validation, error handling, and edge cases.

- ✅ **Build Success**: Full monorepo build successful with Turborepo caching. All 6 packages build without errors.

### File List

**Created Files:**
- packages/embeddings/package.json
- packages/embeddings/tsconfig.json
- packages/embeddings/vitest.config.ts
- packages/embeddings/src/index.ts
- packages/embeddings/src/types.ts
- packages/embeddings/src/provider.ts
- packages/embeddings/src/registry.ts
- packages/embeddings/src/providers/openai.ts
- packages/embeddings/tests/registry.test.ts
- packages/embeddings/tests/providers/openai.test.ts

**Modified Files:**
- apps/cli/package.json (added @wikirag/embeddings dependency, removed openai dependency)
- apps/cli/src/embedding/index.ts (removed OpenAI client exports)
- apps/cli/src/embedding/batch-processor.ts (updated to use EmbeddingProvider interface)
- apps/cli/src/embedding/pipeline.ts (updated to use providerRegistry)
- apps/cli/src/embedding/types.ts (added embeddingProvider field to PipelineConfig)
- apps/cli/src/cli/commands/index-command.ts (added --embedding-provider parameter)
- apps/cli/src/cli/commands/index-runner.ts (updated collection naming, added provider to pipeline config)
- apps/cli/src/embedding/errors.ts (removed OpenAI-specific errors, kept base EmbeddingError)

**Deleted Files:**
- apps/cli/src/embedding/openai-client.ts (migrated to packages/embeddings/src/providers/openai.ts)

### Change Log

- 2026-02-15: Created packages/embeddings package with EmbeddingProvider interface and ProviderRegistry
- 2026-02-15: Implemented OpenAI provider using new abstraction with full test coverage (34 tests passing)
- 2026-02-15: Updated CLI to use provider registry with --embedding-provider parameter support
- 2026-02-15: Updated collection naming convention to include provider name for multi-provider support
