# Story 1-5.4: Provider Benchmarking & Quality Comparison

Status: review

## Story

As an operator,
I want to benchmark embedding provider performance and quality,
So that I can make data-driven decisions about which provider to use.

## Acceptance Criteria

**Given** multiple embedding providers are available
**When** I run a benchmarking utility with sample paragraphs
**Then** I see performance metrics for each provider (embeddings/sec, latency, memory usage)
**And** I see embedding dimensions and model information for each provider

**Given** I have indexed Wikipedia with different providers
**When** I run quality comparison queries
**Then** I can compare retrieval quality across providers (precision, recall, relevance)
**And** results help me understand which provider works best for my use case

**Given** I want to document provider characteristics
**When** I review the benchmarking results
**Then** README.md includes a provider comparison table (cost, speed, quality, hardware requirements)
**And** guidance helps operators choose the right provider for their needs

## Tasks / Subtasks

- [x] Task 1: Define benchmark types and result interfaces (AC: 1)
  - [x] Create `packages/embeddings/src/benchmark-types.ts` with benchmark result types
  - [x] Define `BenchmarkResult` interface: provider, model, dimensions, embeddingsPerSec, avgLatencyMs, p95LatencyMs, p99LatencyMs, memoryUsageMb, totalTexts, totalDurationMs
  - [x] Define `BenchmarkConfig` interface: sampleTexts, warmupRounds, benchmarkRounds, batchSize
  - [x] Define `QualityComparisonResult` interface: provider, query, results (ranked list with scores), precision, recall, relevance
  - [x] Export types from `packages/embeddings/src/index.ts`

- [x] Task 2: Implement provider benchmark runner (AC: 1)
  - [x] Create `packages/embeddings/src/benchmark.ts` with `runBenchmark(provider, config)` function
  - [x] Implement warmup phase: run N warmup rounds (discarded) to load models into memory
  - [x] Implement timing phase: run N benchmark rounds, collect per-batch latency
  - [x] Calculate performance stats: embeddingsPerSec, avgLatencyMs, p95, p99 using Ramda
  - [x] Track memory usage via `process.memoryUsage().heapUsed` before/after
  - [x] Collect ModelInfo from provider for dimensions and metadata
  - [x] Return `BenchmarkResult` with all metrics

- [x] Task 3: Create CLI benchmark command (AC: 1)
  - [x] Create `apps/cli/src/cli/commands/benchmark-command.ts` with Commander.js
  - [x] Add `benchmark` subcommand: `wikirag benchmark [--providers <list>] [--sample-file <path>] [--rounds <n>]`
  - [x] `--providers` flag: comma-separated list or `all` for all registered providers (default: `all`)
  - [x] `--sample-file` flag: path to text file with sample paragraphs (one per line)
  - [x] `--rounds` flag: number of benchmark rounds (default: 5)
  - [x] `--batch-size` flag: batch size per round (default: 10)
  - [x] Include built-in sample paragraphs (5-10 hardcoded Wikipedia-style paragraphs) as fallback
  - [x] Register command in CLI entry point

- [x] Task 4: Implement benchmark result formatting and display (AC: 1)
  - [x] Create `apps/cli/src/cli/commands/benchmark-formatter.ts`
  - [x] Format results as aligned console table with columns: Provider, Model, Dimensions, Emb/sec, Avg Latency, P95, P99, Memory
  - [x] Sort providers by embeddings/sec (fastest first)
  - [x] Use Ramda for all data transformation and sorting
  - [x] Display summary comparison at end of benchmark run
  - [x] Output machine-readable JSON when `--json` flag is used

- [x] Task 5: Implement quality comparison utility (AC: 2)
  - [x] Create `apps/cli/src/cli/commands/quality-command.ts` with Commander.js
  - [x] Add `quality` subcommand: `wikirag quality --query <text> --collections <list>`
  - [x] `--query` flag: search query text
  - [x] `--collections` flag: comma-separated Qdrant collection names to compare
  - [x] `--top-k` flag: number of results per collection (default: 5)
  - [x] For each collection: query Qdrant, retrieve top-k results with scores
  - [x] Display side-by-side comparison of results from each collection
  - [x] Show vector similarity scores and result overlap between providers

- [x] Task 6: Write comprehensive tests (AC: All)
  - [x] Create `packages/embeddings/tests/benchmark.test.ts`
  - [x] Test `runBenchmark()` with mocked provider returning fixed embeddings
  - [x] Test warmup phase runs correct number of rounds
  - [x] Test latency calculation (avg, p95, p99) with known inputs
  - [x] Test embeddings/sec calculation
  - [x] Test memory tracking produces positive values
  - [x] Create `apps/cli/tests/commands/benchmark-command.test.ts`
  - [x] Test CLI argument parsing for benchmark command
  - [x] Test built-in sample paragraphs are available
  - [x] Test JSON output flag
  - [x] Target: minimum 12 tests total (40 new tests delivered: 17 embeddings + 23 CLI)

- [x] Task 7: Update README.md with provider comparison documentation (AC: 3)
  - [x] Add "Embedding Providers" section to project README.md
  - [x] Create provider comparison table with columns: Provider, Model, Dimensions, Cost, Speed, Quality, Hardware
  - [x] Document how to run benchmarks (`wikirag benchmark`)
  - [x] Document how to run quality comparisons (`wikirag quality`)
  - [x] Add guidance for choosing providers based on use case
  - [x] Include hardware requirements (i7-6700K + NVIDIA GTX 1070 minimum for local providers)

## Dev Notes

### Architecture Requirements

**Package Structure:**
- Benchmark core logic (types, runner) goes in `packages/embeddings/` (shared, reusable)
- CLI commands go in `apps/cli/src/cli/commands/` (CLI-specific)
- Tests mirror source structure in each package

**Existing Infrastructure (from Stories 1.5.1-1.5.3):**
- `EmbeddingProvider` interface: `packages/embeddings/src/provider.ts`
- `ProviderRegistry` singleton: `packages/embeddings/src/registry.ts` - use `listProviders()` and `getProvider()`
- `ModelInfo` type: has provider, model, dimensions, description fields
- `BatchEmbeddingResult` type: has embeddings, successIndices, failedIndices, rateLimitHits
- CLI Commander.js patterns: `apps/cli/src/cli/commands/index-command.ts`
- Qdrant client: `@wikirag/qdrant` package for quality comparison queries

**CRITICAL: Stories 1.5.2 and 1.5.3 may or may not be implemented when this story starts.**
- The benchmark utility should work with whatever providers are registered at runtime
- Use `providerRegistry.listProviders()` to discover available providers dynamically
- If only OpenAI is registered, benchmark just OpenAI - don't fail if local providers aren't available
- The quality comparison command requires indexed collections to already exist in Qdrant

### Benchmark Design

**Performance Metrics to Collect:**

| Metric | Source | Calculation |
|--------|--------|-------------|
| Embeddings/sec | Timing | totalTexts / totalDurationSec |
| Avg Latency (ms) | Per-batch times | R.mean(batchLatencies) |
| P95 Latency (ms) | Per-batch times | Sort and take 95th percentile |
| P99 Latency (ms) | Per-batch times | Sort and take 99th percentile |
| Memory (MB) | process.memoryUsage() | (heapUsed after - heapUsed before) / 1024 / 1024 |
| Dimensions | ModelInfo | provider.getModelInfo().dimensions |

**Percentile Calculation (using Ramda):**
```typescript
const calculatePercentile = (sortedValues: number[], percentile: number): number => {
  const index = Math.ceil((percentile / 100) * sortedValues.length) - 1;
  return R.nth(Math.max(0, index), sortedValues) ?? 0;
};

const p95 = R.pipe(
  R.sort(R.subtract),
  (sorted: number[]) => calculatePercentile(sorted, 95)
)(batchLatencies);
```

**Warmup Phase:**
- Local models (Ollama) need warmup to load model into GPU memory
- Run 1-2 warmup rounds before timing begins
- Warmup results are discarded from calculations

**Built-in Sample Paragraphs:**
Include 5-10 representative Wikipedia paragraphs covering diverse topics (science, history, geography, technology) to ensure consistent benchmarking when no external sample file is provided.

### Quality Comparison Design

**Approach:** Side-by-side Qdrant search across collections indexed with different providers.

```typescript
// For each collection:
// 1. Get the provider name from collection name (wiki-paragraph-{provider}-{date})
// 2. Generate query embedding using that collection's provider
// 3. Search Qdrant for top-k nearest neighbors
// 4. Display results with scores

// Key insight: each collection was indexed with a different embedding model,
// so the query embedding must use the SAME model for fair comparison
```

**Result Display:**
```
Query: "What is quantum computing?"

Provider: openai (wiki-paragraph-openai-20260215)
  1. [0.89] Quantum computing - Introduction
  2. [0.85] Quantum mechanics - Applications
  3. [0.82] Computer science - Quantum algorithms
  ...

Provider: nomic-embed-text (wiki-paragraph-nomic-embed-text-20260215)
  1. [0.91] Quantum computing - Overview
  2. [0.87] Quantum information science
  3. [0.84] Quantum mechanics - Modern applications
  ...

Overlap: 2/5 results shared between providers
```

**Important:** Query embedding generation requires the provider to be running and configured. For OpenAI, the API key is needed. For local providers, Ollama must be running. The quality command should gracefully handle providers that aren't available.

### CLI Command Patterns

**Follow existing Commander.js patterns from `index-command.ts`:**

```typescript
// benchmark-command.ts
export interface BenchmarkCommandOptions {
  providers?: string;     // comma-separated or 'all'
  sampleFile?: string;    // path to text file
  rounds?: number;        // benchmark rounds
  batchSize?: number;     // texts per batch
  json?: boolean;         // output JSON format
}

export function createBenchmarkCommand(): Command {
  const command = new Command('benchmark');
  command
    .description('Benchmark embedding provider performance')
    .option('--providers <list>', 'Comma-separated provider names or "all"', 'all')
    .option('--sample-file <path>', 'Text file with sample paragraphs (one per line)')
    .option('--rounds <n>', 'Number of benchmark rounds', parseInt, 5)
    .option('--batch-size <size>', 'Texts per batch', parseInt, 10)
    .option('--json', 'Output results as JSON')
    .action(async (options: BenchmarkCommandOptions) => { ... });
  return command;
}
```

**Console Output Pattern (follow existing emoji conventions):**
```
🔬 Embedding Provider Benchmark
═══════════════════════════════════════════════════
Providers: openai, nomic-embed-text, qwen3-embedding
Rounds: 5 | Batch Size: 10 | Sample Texts: 10
═══════════════════════════════════════════════════

⏳ Benchmarking openai...
  Warmup: 1 round
  Benchmark: 5 rounds × 10 texts = 50 embeddings
  ✅ Complete: 125.3 emb/sec

⏳ Benchmarking nomic-embed-text...
  ...

📊 Results
┌──────────────────┬─────────────────────┬──────┬──────────┬─────────┬──────────┬────────┐
│ Provider         │ Model               │ Dims │ Emb/sec  │ Avg (ms)│ P95 (ms) │ Mem MB │
├──────────────────┼─────────────────────┼──────┼──────────┼─────────┼──────────┼────────┤
│ openai           │ text-embedding-3-sm │ 1536 │   125.3  │    79.8 │   112.4  │   12.3 │
│ nomic-embed-text │ nomic-embed-text    │  768 │    45.2  │   221.4 │   298.1  │  156.7 │
│ qwen3-embedding  │ qwen3-embedding     │ 1024 │    32.8  │   304.9 │   412.3  │  892.4 │
└──────────────────┴─────────────────────┴──────┴──────────┴─────────┴──────────┴────────┘
```

### Naming Conventions

- Files: `benchmark.ts`, `benchmark-types.ts`, `benchmark-command.ts`, `benchmark-formatter.ts`, `quality-command.ts` (kebab-case)
- Classes/Types: `BenchmarkResult`, `BenchmarkConfig`, `QualityComparisonResult` (PascalCase, no I prefix)
- Functions: `runBenchmark`, `formatBenchmarkResults`, `calculatePercentile` (camelCase)
- Constants: `DEFAULT_ROUNDS`, `DEFAULT_BATCH_SIZE`, `SAMPLE_PARAGRAPHS` (UPPER_SNAKE_CASE)
- ESM imports: `.js` extensions required

### Testing Standards

- Vitest 4.0.18
- Mock `EmbeddingProvider` interface for benchmark tests (no real API calls)
- Mock Qdrant client for quality comparison tests
- Tests in `packages/embeddings/tests/` and `apps/cli/tests/commands/`
- Use `vi.fn()` for mock providers that return fixed embedding vectors

**Mock provider pattern for benchmark tests:**
```typescript
const mockProvider: EmbeddingProvider = {
  embed: vi.fn().mockResolvedValue(new Array(768).fill(0.1)),
  embedBatch: vi.fn().mockResolvedValue({
    embeddings: texts.map(() => new Array(768).fill(0.1)),
    successIndices: R.range(0, texts.length),
    failedIndices: [],
    errors: [],
    rateLimitHits: 0,
  }),
  getModelInfo: vi.fn().mockReturnValue({
    provider: 'test',
    model: 'test-model',
    dimensions: 768,
  }),
  validateConfig: vi.fn().mockReturnValue({ valid: true, errors: [] }),
};
```

### File Structure After Implementation

```
packages/embeddings/
├── src/
│   ├── index.ts              # Add benchmark exports
│   ├── benchmark-types.ts    # NEW: Benchmark type definitions
│   ├── benchmark.ts          # NEW: Benchmark runner logic
│   └── providers/            # No changes
└── tests/
    ├── benchmark.test.ts     # NEW: Benchmark runner tests
    └── providers/            # No changes

apps/cli/
├── src/
│   └── cli/
│       └── commands/
│           ├── index-command.ts         # No changes
│           ├── benchmark-command.ts     # NEW: CLI benchmark command
│           ├── benchmark-formatter.ts   # NEW: Result formatting
│           └── quality-command.ts       # NEW: Quality comparison command
└── tests/
    └── commands/
        └── benchmark-command.test.ts    # NEW: CLI command tests
```

### Previous Story Intelligence

**From Story 1.5.1:**
- Registry `listProviders()` returns `Array<{ name: string; modelInfo: ModelInfo }>` - use this for provider discovery
- `getProvider(name, config)` creates provider instances - need config per provider for benchmarking
- OpenAI needs `{ apiKey }`, local providers need `{ model, baseUrl }`
- Provider config varies by type - benchmark command must handle this

**From Story 1.5.3:**
- Local providers use `nomic-embed-text` (768 dims) and `qwen3-embedding` (up to 4096 dims)
- Ollama providers need warmup to load models into GPU memory
- Local providers are significantly slower than OpenAI API but have zero per-token cost

**Build/Test Commands:**
```bash
pnpm --filter @wikirag/embeddings build    # Build embeddings package
pnpm --filter @wikirag/embeddings test     # Run embeddings tests
pnpm --filter @wikirag/cli build           # Build CLI
pnpm --filter @wikirag/cli test            # Run CLI tests
pnpm build                                  # Full monorepo build
```

### Provider Config Resolution

**The benchmark command needs to construct provider-specific configs. Strategy:**

```typescript
// Resolve provider config based on provider name and environment
function resolveProviderConfig(providerName: string): unknown {
  switch (providerName) {
    case 'openai':
      return {
        apiKey: process.env.OPENAI_API_KEY,
        model: 'text-embedding-3-small',
      };
    default:
      // Assume Ollama-based local provider
      return {
        model: providerName,
        baseUrl: process.env.OLLAMA_BASE_URL || 'http://localhost:11434',
      };
  }
}
```

This allows the benchmark to run against any registered provider without manual config.

### References

- [Source: epics.md#Epic 1.5, Story 1.5.4] - Acceptance criteria and requirements
- [Source: architecture.md#Data Architecture] - Embedding quality benchmarking requirement
- [Source: architecture.md#Naming Patterns] - Naming conventions
- [Source: architecture.md#Data Manipulation] - Ramda.js usage requirements
- [Source: prd.md#FR39-FR41] - Embedding provider extensibility requirements
- [Source: prd.md#Quality Scoring] - Quality dimensions (context relevance, recall, groundedness, etc.)
- [Source: 1-5-1-embedding-provider-abstraction-layer.md] - Registry API and provider patterns
- [Source: 1-5-3-local-model-provider-implementations.md] - Model details and dimension info

## Dev Agent Record

### Agent Model Used

claude-sonnet-4-6

### Debug Log References

No debug issues encountered. Pre-existing CLI test failures (pipeline.test.ts, batch-processor.test.ts) confirmed pre-existing from Story 1.5.1 naming convention change — not introduced by this story.

### Completion Notes List

- 40 new tests delivered (17 in packages/embeddings/tests/benchmark.test.ts + 23 in apps/cli/tests/commands/benchmark-command.test.ts), exceeding the 12-test minimum
- `extractProviderFromCollection()` exported from quality-command.ts and tested in benchmark-command.test.ts
- Quality command uses naive precision/recall with 0.5 score threshold (no ground-truth labels available at CLI level)
- Memory delta clamped to 0 via Math.max(0, ...) to handle GC during benchmark

### File List

- `packages/embeddings/src/benchmark-types.ts` — NEW: BenchmarkConfig, BenchmarkResult, QualityResult, QualityComparisonResult
- `packages/embeddings/src/benchmark.ts` — NEW: runBenchmark(), calculatePercentile()
- `packages/embeddings/src/index.ts` — MODIFIED: added benchmark type/function exports
- `packages/embeddings/tests/benchmark.test.ts` — NEW: 17 tests for benchmark runner
- `apps/cli/src/cli/commands/benchmark-command.ts` — NEW: benchmark CLI command
- `apps/cli/src/cli/commands/benchmark-formatter.ts` — NEW: table and JSON formatting
- `apps/cli/src/cli/commands/quality-command.ts` — NEW: quality comparison CLI command
- `apps/cli/src/index.ts` — MODIFIED: registered benchmark and quality commands
- `apps/cli/tests/commands/benchmark-command.test.ts` — NEW: 23 CLI command tests
- `README.md` — MODIFIED: added Embedding Providers section with comparison table and command docs

### Change Log

2026-02-20: Story implemented by claude-sonnet-4-6
