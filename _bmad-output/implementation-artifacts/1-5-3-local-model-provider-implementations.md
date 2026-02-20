# Story 1-5.3: Local Model Provider Implementations

Status: done

## Story

As a developer,
I want concrete implementations of local embedding providers,
So that operators can choose from multiple local models for embedding generation.

## Acceptance Criteria

**Given** the embedding provider abstraction exists
**When** I implement the Ollama-based embedding providers
**Then** they implement the `EmbeddingProvider` interface
**And** they generate embeddings via Ollama `/api/embed` API
**And** they handle batching for efficiency
**And** they include retry logic for transient failures

**Given** an Ollama provider is registered
**When** I run the CLI with `--embedding-provider nomic-embed-text` (or `qwen3-embedding`)
**Then** indexing uses the local model for embedding generation
**And** embeddings are inserted into Qdrant with the correct `embeddingProvider` metadata

**Given** I want to add a second local provider
**When** I implement it following the same pattern
**Then** it follows the established OllamaProvider base pattern
**And** operators can select between `openai`, `nomic-embed-text`, and `qwen3-embedding` via CLI

**Given** both local providers are available
**When** operators index Wikipedia with different providers
**Then** separate Qdrant collections are created (e.g., `wiki-paragraph-nomic-embed-text-20260215`, `wiki-paragraph-qwen3-embedding-20260215`)

## Scope Boundary

**This story is ALL PROVIDER CODE.** It covers OllamaProvider class, health check utilities, registry registrations, CLI updates, and all tests.
Infrastructure (Docker, .env files, README docs) belongs to **Story 1.5.2**.

## Tasks / Subtasks

- [x] Task 1: Implement OllamaProvider base class (AC: 1)
  - [x] Create `packages/embeddings/src/providers/ollama.ts` implementing `EmbeddingProvider`
  - [x] Constructor accepts `LocalLLMConfig`, merges defaults with `R.mergeDeepRight`
  - [x] Implement `embed(text)` delegating to `embedBatch([text])`
  - [x] Implement `embedBatch(texts)` using Ollama native `/api/embed` endpoint with batch input
  - [x] Implement `getModelInfo()` returning provider name, model, and dimensions
  - [x] Implement `validateConfig()` checking model name and baseUrl format
  - [x] Implement private `withRetry<T>()` for exponential backoff (matching OpenAI pattern)
  - [x] Handle dimension discovery: cache dimensions from first successful embed response
  - [x] Create `OllamaApiError` error class for Ollama-specific errors
  - [x] Use native `fetch()` for HTTP calls (no additional dependencies)

- [x] Task 2: Implement Ollama health check utilities (AC: 1)
  - [x] Create `packages/embeddings/src/providers/ollama-health.ts`
  - [x] Implement `checkOllamaConnection(baseUrl: string): Promise<boolean>` - GET to base URL
  - [x] Implement `listAvailableModels(baseUrl: string): Promise<string[]>` - GET `/api/tags`
  - [x] Add connection timeout (default 5s) and meaningful error messages
  - [x] Export utilities from `packages/embeddings/src/index.ts`

- [x] Task 3: Register nomic-embed-text provider (AC: 2, 3)
  - [x] Add `nomic-embed-text` registration in `packages/embeddings/src/index.ts`
  - [x] Factory creates `OllamaProvider` with `{ model: 'nomic-embed-text', baseUrl: 'http://localhost:11434' }`
  - [x] ModelInfo: `{ provider: 'nomic-embed-text', model: 'nomic-embed-text', dimensions: 768 }`
  - [x] Ensure discoverable via `providerRegistry.listProviders()`

- [x] Task 4: Register qwen3-embedding provider (AC: 3)
  - [x] Add `qwen3-embedding` registration in `packages/embeddings/src/index.ts`
  - [x] Factory creates `OllamaProvider` with `{ model: 'qwen3-embedding', baseUrl: 'http://localhost:11434' }`
  - [x] ModelInfo: `{ provider: 'qwen3-embedding', model: 'qwen3-embedding', dimensions: 1024 }`
  - [x] Ensure discoverable via `providerRegistry.listProviders()`

- [x] Task 5: Update CLI help text and defaults (AC: 2, 3)
  - [x] Update `--embedding-provider` option description in `index-command.ts` to list all registered providers
  - [x] Ensure `--model` flag is passed through to Ollama providers correctly
  - [x] Verify collection naming works with new provider names (e.g., `wiki-paragraph-nomic-embed-text-20260215`)

- [x] Task 6: Write comprehensive tests for OllamaProvider (AC: All)
  - [x] Create `packages/embeddings/tests/providers/ollama.test.ts`
  - [x] Test constructor with default config merging
  - [x] Test constructor with custom baseUrl and model
  - [x] Test `getModelInfo()` returns correct provider/model/dimensions
  - [x] Test `validateConfig()` with valid config
  - [x] Test `validateConfig()` with missing model name
  - [x] Test `validateConfig()` with empty model name
  - [x] Test `embedBatch()` with empty input returns empty result
  - [x] Test `embedBatch()` calls correct Ollama API endpoint
  - [x] Test `embedBatch()` handles API error responses
  - [x] Test `embed()` delegates to `embedBatch()`
  - [x] Test retry logic with transient failures
  - [x] Test dimension caching after first successful embed
  - [x] Target: minimum 12 tests for OllamaProvider

- [x] Task 7: Write tests for health check utilities (AC: 1)
  - [x] Create `packages/embeddings/tests/providers/ollama-health.test.ts`
  - [x] Test `checkOllamaConnection()` with reachable server (mocked)
  - [x] Test `checkOllamaConnection()` with unreachable server (mocked)
  - [x] Test `listAvailableModels()` parsing response
  - [x] Test timeout handling
  - [x] Target: minimum 5 tests for health utilities

### Review Follow-ups (AI)

- [ ] [AI-Review][Low] Replace/remove legacy CLI tests that reference deleted OpenAI client and stale batch-processor API to keep full-suite health visible [apps/cli/tests/embedding/openai-client.test.ts:6]

## Dev Notes

### Architecture Requirements

**Package Structure:**
- All Ollama provider code goes in `packages/embeddings/src/providers/`
- Tests mirror source structure: `packages/embeddings/tests/providers/`
- No new dependencies needed - use native `fetch()` for HTTP calls
- Follows existing monorepo conventions

**Existing Infrastructure (from Story 1.5.1):**
- `EmbeddingProvider` interface: `packages/embeddings/src/provider.ts`
- `ProviderRegistry` singleton: `packages/embeddings/src/registry.ts`
- `LocalLLMConfig` type: `packages/embeddings/src/types.ts` (has `baseUrl` and `model` fields)
- OpenAI provider: `packages/embeddings/src/providers/openai.ts` (REFERENCE implementation - follow this pattern exactly)
- Auto-registration: `packages/embeddings/src/index.ts` (register new providers here)
- CLI already supports `--embedding-provider` flag: `apps/cli/src/cli/commands/index-command.ts`
- Pipeline already uses `providerRegistry.getProvider()`: `apps/cli/src/embedding/pipeline.ts`
- Collection naming already includes provider: `wiki-{strategy}-{provider}-{date}`

### Model Details

| Provider Name | Ollama Model | Size | Dimensions | Notes |
|--------------|-------------|------|------------|-------|
| `nomic-embed-text` | `nomic-embed-text` | 274MB | 768 | Outperforms OpenAI ada-002 and text-embedding-3-small |
| `qwen3-embedding` | `qwen3-embedding` | 639MB-4.7GB | Up to 4096 (flexible 32-4096) | #1 MTEB multilingual; 0.6B/4B/8B variants |

### Ollama API Reference

**Native Embedding API (`/api/embed`) - USE THIS:**
```
POST http://localhost:11434/api/embed
Content-Type: application/json

{
  "model": "nomic-embed-text",
  "input": ["text1", "text2", "text3"]   // string or string[] for batching
}

Response:
{
  "model": "nomic-embed-text",
  "embeddings": [[0.123, -0.456, ...], [0.789, -0.012, ...], ...],
  "total_duration": 123456789,
  "load_duration": 123456,
  "prompt_eval_count": 21
}
```

**Health Check:**
```
GET http://localhost:11434/
Response: "Ollama is running"
```

**List Models:**
```
GET http://localhost:11434/api/tags
Response: { "models": [{ "name": "nomic-embed-text:latest", ... }] }
```

**IMPORTANT:** Use native `fetch()` for HTTP calls. Do NOT add `ollama` npm package. The API is simple REST and does not warrant an additional dependency.

### Implementation Patterns

**Follow OpenAI provider pattern exactly. Key reference: `packages/embeddings/src/providers/openai.ts`**

```typescript
// OllamaProvider structure (pseudocode)
const DEFAULT_OLLAMA_URL = 'http://localhost:11434';
const DEFAULT_CONFIG = {
  baseUrl: DEFAULT_OLLAMA_URL,
  batchSize: 50,   // conservative for local hardware
  maxRetries: 3,
  baseDelay: 1000,
} as const;

export class OllamaProvider implements EmbeddingProvider {
  private config: Required<LocalLLMConfig>;
  private cachedDimensions: number | null = null;

  constructor(config: LocalLLMConfig) {
    this.config = R.mergeDeepRight(DEFAULT_CONFIG, config) as Required<LocalLLMConfig>;
  }

  async embed(text: string): Promise<number[]> {
    const result = await this.embedBatch([text]);
    // ... delegate pattern from OpenAI
  }

  async embedBatch(texts: string[]): Promise<BatchEmbeddingResult> {
    if (R.isEmpty(texts)) return emptyResult;
    // POST to /api/embed with { model, input: texts }
    // Parse response.embeddings
    // Cache dimensions from first result
  }

  getModelInfo(): ModelInfo {
    return {
      provider: this.config.model,  // e.g., 'nomic-embed-text'
      model: this.config.model,
      dimensions: this.cachedDimensions ?? 0,
      description: `Ollama local model: ${this.config.model}`,
    };
  }

  validateConfig(): ValidationResult {
    // Check model is non-empty
    // Check baseUrl is valid URL format
    // Do NOT make network calls in validateConfig (keep it synchronous-safe)
  }

  private async withRetry<T>(fn: () => Promise<T>): Promise<{ response: T; rateLimitHits: number }> {
    // Same exponential backoff pattern as OpenAI provider
  }
}
```

**Dimension Discovery Strategy:**
- Ollama models don't have a static dimension map like OpenAI
- First successful `embedBatch()` call caches the dimension from `response.embeddings[0].length`
- `getModelInfo()` returns `dimensions: 0` until first successful embed, then uses cached value
- Registration in `index.ts` uses known defaults (768 for nomic-embed-text, 1024 for qwen3-embedding)

**Error Handling:**
```typescript
export class OllamaApiError extends Error {
  constructor(
    message: string,
    public readonly statusCode?: number,
    public readonly cause?: Error
  ) {
    super(message);
    this.name = 'OllamaApiError';
  }
}
```

### Naming Conventions

- Files: `ollama.ts`, `ollama-health.ts` (kebab-case)
- Classes: `OllamaProvider`, `OllamaApiError` (PascalCase)
- Functions: `checkOllamaConnection`, `listAvailableModels` (camelCase)
- Constants: `DEFAULT_OLLAMA_URL`, `DEFAULT_CONFIG` (UPPER_SNAKE_CASE)
- ESM imports: `.js` extensions required (e.g., `import { ... } from './types.js'`)

### Testing Standards

- Vitest 4.0.18 with `vi.fn()` and `vi.spyOn()` for mocking
- Mock `global.fetch` for HTTP call testing (no real network calls in tests)
- Tests go in `packages/embeddings/tests/providers/`
- Follow existing `openai.test.ts` patterns for structure and assertions
- Use `describe`/`it` blocks with clear test descriptions

**Mock pattern for fetch:**
```typescript
const mockFetch = vi.fn();
global.fetch = mockFetch;

mockFetch.mockResolvedValueOnce({
  ok: true,
  json: () => Promise.resolve({
    model: 'nomic-embed-text',
    embeddings: [[0.1, 0.2, 0.3]],
  }),
});
```

### File Structure After Implementation

```
packages/embeddings/
├── src/
│   ├── index.ts              # Add nomic-embed-text + qwen3-embedding registrations + health exports
│   ├── types.ts              # No changes needed (LocalLLMConfig already exists)
│   ├── provider.ts           # No changes needed
│   ├── registry.ts           # No changes needed
│   └── providers/
│       ├── openai.ts         # No changes needed
│       ├── ollama.ts         # NEW: OllamaProvider class + OllamaApiError
│       └── ollama-health.ts  # NEW: Health check utilities
└── tests/
    ├── registry.test.ts      # No changes needed
    └── providers/
        ├── openai.test.ts    # No changes needed
        ├── ollama.test.ts    # NEW: OllamaProvider tests (12+ tests)
        └── ollama-health.test.ts  # NEW: Health check tests (5+ tests)
```

### Previous Story Intelligence

**From Story 1.5.1 (Embedding Provider Abstraction Layer):**
- Registry uses factory pattern: `{ name, factory, modelInfo }` registration
- Factory takes `(config: unknown)` and casts inside: `new OpenAIProvider(config as OpenAIConfig)`
- `R.mergeDeepRight(DEFAULT_CONFIG, config)` for config defaults
- `R.isEmpty(texts)` for empty batch guard
- `R.sortBy`, `R.pluck`, `R.range` used in embedBatch result processing
- Error classes extend `Error` with `this.name = 'ErrorClassName'`
- 34 tests total (21 registry + 13 OpenAI) - aim for similar coverage
- ESM `.js` extensions required in all relative imports

**Known Issue from 1.5.1:** `index-runner.ts` collection naming was verified working with provider in the name. The `loadOrCreateCheckpoint` function correctly uses `wiki-${options.strategy}-${embeddingProvider}-${options.dumpDate}`.

**Build/Test Commands:**
```bash
pnpm --filter @wikirag/embeddings build    # Build embeddings package
pnpm --filter @wikirag/embeddings test     # Run tests
pnpm build                                  # Full monorepo build with Turborepo
```

### References

- [Source: epics.md#Epic 1.5, Story 1.5.3] - Acceptance criteria and requirements
- [Source: architecture.md#Data Architecture] - Embedding providers, Ollama as primary local runtime
- [Source: architecture.md#Naming Patterns] - Naming conventions
- [Source: architecture.md#Data Manipulation] - Ramda.js usage requirements
- [Source: 1-5-1-embedding-provider-abstraction-layer.md] - Provider abstraction implementation details
- [Ollama Embedding Models](https://ollama.com/search?c=embedding) - Available embedding models
- [Ollama Embeddings Docs](https://docs.ollama.com/capabilities/embeddings) - API documentation
- [nomic-embed-text](https://ollama.com/library/nomic-embed-text) - 768 dims, outperforms OpenAI ada-002
- [qwen3-embedding](https://ollama.com/library/qwen3-embedding) - Flexible dims up to 4096, #1 MTEB multilingual

## Dev Agent Record

### Agent Model Used

claude-sonnet-4-6

### Debug Log References

None — all tasks completed without issues. All 57 tests pass (34 baseline + 16 OllamaProvider + 7 health).

### Completion Notes List

- Task 1: Implemented `OllamaProvider` in `packages/embeddings/src/providers/ollama.ts`. Follows OpenAI provider pattern exactly: `R.mergeDeepRight` for config defaults, `R.isEmpty` guard, `R.range`/`R.repeat` for index arrays, `withRetry<T>` with exponential backoff + jitter. `OllamaApiError` extends Error with `name`, `statusCode`, `cause`. Dimensions are 0 until first successful `embedBatch` call then cached. No new npm dependencies — uses native `fetch()`.
- Task 2: Implemented `checkOllamaConnection` and `listAvailableModels` in `packages/embeddings/src/providers/ollama-health.ts`. Both use `AbortController` + `setTimeout` for configurable timeouts (default 5 s). `checkOllamaConnection` swallows all errors and returns boolean; `listAvailableModels` rethrows with informative timeout message on AbortError.
- Task 3 & 4: Registered `nomic-embed-text` (768 dims) and `qwen3-embedding` (1024 dims) in `packages/embeddings/src/index.ts` using same factory pattern as OpenAI. Both export `OllamaProvider`, `OllamaApiError`, `DEFAULT_OLLAMA_URL`, `checkOllamaConnection`, `listAvailableModels`.
- Task 5: Updated `--embedding-provider` option description and JSDoc comment in `apps/cli/src/cli/commands/index-command.ts` to list `nomic-embed-text` and `qwen3-embedding` instead of obsolete `gpt-oss-14b`/`qwen3-14b` names.
- Task 6: 16 tests for `OllamaProvider` covering constructor, getModelInfo, validateConfig (valid/empty/whitespace model), embedBatch (empty, endpoint URL, success, error, dimension caching, retry, retry exhaustion), and embed (success + throws on failure).
- Task 7: 7 tests for health utilities covering `checkOllamaConnection` (ok/network error/non-ok status/AbortError) and `listAvailableModels` (success/server error/AbortError timeout message).
- Senior review fixes: resolved provider model override bug caused by CLI default model, aligned collection creation naming and API to `wiki-{strategy}-{provider}-{date}`, added `embeddingProvider` to Qdrant payload metadata, replaced provider/model vector-size inference with provider-aware logic, and added validation-focused CLI tests.

### File List

- `packages/embeddings/src/providers/ollama.ts` (created)
- `packages/embeddings/src/providers/ollama-health.ts` (created)
- `packages/embeddings/src/index.ts` (modified)
- `packages/embeddings/tests/providers/ollama.test.ts` (created)
- `packages/embeddings/tests/providers/ollama-health.test.ts` (created)
- `apps/cli/src/cli/commands/index-command.ts` (modified)
- `apps/cli/src/cli/commands/index-runner.ts` (modified during code review)
- `apps/cli/src/embedding/batch-processor.ts` (modified during code review)
- `apps/cli/src/embedding/pipeline.ts` (modified during code review)
- `apps/cli/src/embedding/qdrant-inserter.ts` (modified during code review)
- `apps/cli/src/embedding/types.ts` (modified during code review)
- `apps/cli/tests/cli/index-command.test.ts` (modified during code review)
- `apps/cli/tests/embedding/pipeline.test.ts` (modified during code review)
- `apps/cli/tests/embedding/qdrant-inserter.test.ts` (modified during code review)
- `packages/qdrant/src/collections.ts` (modified during code review)
- `packages/qdrant/src/types.ts` (modified during code review)
- `packages/qdrant/tests/collections.test.ts` (modified during code review)
- `_bmad-output/implementation-artifacts/1-5-3-local-model-provider-implementations.md` (modified during code review)

### Senior Developer Review (AI)

- Reviewer: kugtong33
- Date: 2026-02-20
- Outcome: Changes Requested -> Fixed (High/Medium), one Low follow-up recorded
- Validation summary:
  - ACs and task claims cross-checked against implementation and runtime call paths
  - Collection naming and provider metadata flow verified end-to-end through CLI pipeline and Qdrant insertion
  - Provider/model resolution validated for OpenAI and local Ollama providers
  - Git/story discrepancies resolved by updating Story artifacts and File List
- Targeted verification performed:
  - `pnpm --filter @wikirag/qdrant test` (pass)
  - `pnpm --filter @wikirag/embeddings test` (pass)
  - `pnpm --filter @wikirag/qdrant build && pnpm --filter @wikirag/cli build` (pass)
  - `pnpm --filter @wikirag/cli exec vitest tests/cli/index-command.test.ts` (pass)
  - `pnpm --filter @wikirag/cli exec vitest tests/embedding/qdrant-inserter.test.ts` (pass)

### Change Log

- 2026-02-20: Story 1.5.3 implemented — OllamaProvider class, OllamaApiError, health check utilities, nomic-embed-text and qwen3-embedding provider registrations, CLI help text update, 23 new tests (16 + 7). All 57 tests pass.
- 2026-02-20: Senior AI code review fixes applied — fixed provider/model resolution for local providers, corrected provider-aware collection creation flow, added embeddingProvider payload metadata, updated provider-aware vector size resolution, extended CLI validation tests, and recorded one low-severity legacy test-suite follow-up.
