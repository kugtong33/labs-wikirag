# Story 1.4: Embedding Generation and Qdrant Insertion

Status: ready-for-dev

## Story

As an operator,
I want each extracted paragraph to be embedded via OpenAI and inserted into Qdrant with its metadata,
So that Wikipedia content becomes searchable through vector similarity.

## Acceptance Criteria

1. **Given** a stream of parsed paragraphs with metadata, **When** the embedding pipeline processes them, **Then** each paragraph is embedded using the configured OpenAI embedding model **And** the embedding is inserted into the appropriate Qdrant collection with its metadata payload (articleTitle, sectionName, paragraphPosition, dumpVersion, embeddingModel) **And** insertions are batched for efficiency **And** the OpenAI API key is read from environment variables, never hardcoded.

2. **Given** paragraphs are processed in batches, **When** embeddings are generated, **Then** the batch size is configurable (default: 100) **And** rate limiting is respected to avoid API errors.

3. **Given** an embedding is generated, **When** it is inserted into Qdrant, **Then** the vector and payload are stored together **And** the collection name follows the `wiki-{strategy}-{dump_date}` convention.

4. **Given** the OpenAI API returns an error, **When** processing a batch, **Then** the error is logged and the batch is retried with exponential backoff **And** processing continues after max retries.

5. **Given** embeddings are being generated, **When** progress is monitored, **Then** metrics are logged (paragraphs processed, embeddings generated, API calls made, errors encountered).

## Tasks / Subtasks

- [ ] Task 1: Set up OpenAI client wrapper (AC: 1, 2)
  - [ ] 1.1 Add openai dependency to apps/cli/package.json
  - [ ] 1.2 Create src/embedding/openai-client.ts with client wrapper
  - [ ] 1.3 Read OPENAI_API_KEY from environment variables
  - [ ] 1.4 Implement embeddings generation with configurable model
  - [ ] 1.5 Add rate limiting and retry logic with exponential backoff
  - [ ] 1.6 Use Ramda for data transformations
- [ ] Task 2: Implement batch processing (AC: 2)
  - [ ] 2.1 Create src/embedding/batch-processor.ts
  - [ ] 2.2 Implement batch accumulation (default size: 100)
  - [ ] 2.3 Process batches with OpenAI embeddings API
  - [ ] 2.4 Handle partial batch failures
  - [ ] 2.5 Use Ramda for batch grouping and transformation
- [ ] Task 3: Implement Qdrant insertion pipeline (AC: 3)
  - [ ] 3.1 Create src/embedding/qdrant-inserter.ts
  - [ ] 3.2 Consume @wikirag/qdrant package for insertions
  - [ ] 3.3 Add dumpVersion and embeddingModel to payload
  - [ ] 3.4 Batch insert vectors to Qdrant (100-500 per batch)
  - [ ] 3.5 Ensure collection exists before insertion
- [ ] Task 4: Create embedding pipeline orchestrator (AC: 1, 5)
  - [ ] 4.1 Create src/embedding/pipeline.ts
  - [ ] 4.2 Wire parseWikipediaDump → batch → embed → insert
  - [ ] 4.3 Implement progress logging (every N paragraphs)
  - [ ] 4.4 Track metrics (total processed, errors, API calls)
  - [ ] 4.5 Use async generator pattern for streaming
- [ ] Task 5: Add error handling and resilience (AC: 4)
  - [ ] 5.1 Create custom EmbeddingError class
  - [ ] 5.2 Implement retry logic with exponential backoff
  - [ ] 5.3 Handle OpenAI rate limits (429 errors)
  - [ ] 5.4 Handle Qdrant errors gracefully
  - [ ] 5.5 Log errors but continue processing
- [ ] Task 6: Add comprehensive tests (AC: All)
  - [ ] 6.1 Create tests/embedding/openai-client.test.ts
  - [ ] 6.2 Create tests/embedding/batch-processor.test.ts
  - [ ] 6.3 Create tests/embedding/qdrant-inserter.test.ts
  - [ ] 6.4 Create tests/embedding/pipeline.test.ts
  - [ ] 6.5 Mock OpenAI API calls in tests
  - [ ] 6.6 Mock Qdrant client in tests
  - [ ] 6.7 Run pnpm test from apps/cli (all tests pass)

## Dev Notes

### Architecture Compliance

**Monorepo Context** [Source: architecture.md#Starter Template Evaluation]
```
apps/cli/
├── src/
│   ├── parser/          # From Story 1.3
│   └── embedding/       # NEW: Embedding and insertion (this story)
│       ├── types.ts
│       ├── errors.ts
│       ├── openai-client.ts
│       ├── batch-processor.ts
│       ├── qdrant-inserter.ts
│       └── pipeline.ts
└── tests/
    ├── parser/          # From Story 1.3
    └── embedding/       # NEW: Embedding tests
```

**Package Dependencies** [Source: architecture.md#Cross-Component Dependencies]
- `apps/cli` → consumes `@wikirag/qdrant` (from Story 1.2)
- `apps/cli` → uses OpenAI SDK for embeddings
- Qdrant collection management already implemented in Story 1.2

**Naming Conventions** [Source: architecture.md#Naming Patterns]
- File naming: `kebab-case` (openai-client.ts, batch-processor.ts)
- TypeScript: PascalCase for types, camelCase for functions
- Qdrant payload fields: `camelCase` (articleTitle, dumpVersion, embeddingModel)

### Technical Requirements

**OpenAI Embeddings API** [Source: architecture.md#Technical Constraints]
- Model: `text-embedding-3-small` (1536 dimensions) as default
- Alternative: `text-embedding-3-large` (3072 dimensions)
- API endpoint: `/v1/embeddings`
- Input: array of strings (batch size: 1-2048)
- Output: array of embeddings (number[])

**Embedding Strategy** [Source: epics.md Story 1.4]
- Strategy parameter: "paragraph" (default), "chunked", "document"
- Determines collection name: `wiki-paragraph-20260210`
- Different strategies use different vector collections

**Qdrant Payload Schema** [Source: packages/qdrant/src/types.ts from Story 1.2]
```typescript
interface WikipediaPayload {
  articleTitle: string;
  sectionName: string;
  paragraphPosition: number;
  dumpVersion: string;      // NEW: "20260210"
  embeddingModel: string;   // NEW: "text-embedding-3-small"
}
```

**Batch Processing** [Source: architecture.md#Performance Requirements]
- OpenAI batch size: 100 texts per request (configurable)
- Qdrant batch size: 100-500 vectors per insert
- Rate limiting: respect OpenAI rate limits (3500 RPM for standard tier)
- Retry logic: exponential backoff on 429/500 errors

**Environment Variables** [Source: architecture.md#Authentication & Security]
- `OPENAI_API_KEY` - required for embedding generation
- `QDRANT_URL` - Qdrant connection URL (from Story 1.1)
- `EMBEDDING_MODEL` - optional, defaults to "text-embedding-3-small"
- `DUMP_VERSION` - Wikipedia dump date (YYYYMMDD format)

### Library/Framework Requirements

| Dependency | Version | Scope | Notes |
|-----------|---------|-------|-------|
| openai | ^4.77.3 | apps/cli dependency | Official OpenAI Node.js SDK |
| @wikirag/qdrant | workspace:* | apps/cli dependency | From Story 1.2 |
| ramda | ^0.32.0 | apps/cli dependency | Already available |
| @types/ramda | ^0.31.1 | apps/cli devDependency | Already available |
| vitest | ^4.0.18 | apps/cli devDependency | Already available |

**OpenAI SDK v4 Specifics:**
- TypeScript native with full type safety
- Uses `fetch` under the hood (Node.js 18+)
- Automatic retry with exponential backoff
- Stream support for chat completions (not needed for embeddings)
- Documentation: https://github.com/openai/openai-node

### Ramda.js Integration

**Mandatory Ramda Usage** [Source: architecture.md#Data Manipulation & Functional Utilities]

All data transformations MUST use Ramda.js.

**Specific Ramda Patterns for This Story:**

```typescript
// Batch paragraphs using Ramda
import * as R from 'ramda';

const batchParagraphs = R.splitEvery(100); // Split into batches of 100

// Extract content for embedding
const extractContent = R.pluck('content');

// Add metadata to embedded paragraphs
const addEmbeddingMetadata = R.curry(
  (dumpVersion: string, embeddingModel: string, paragraph: any, embedding: number[]) => ({
    vector: embedding,
    payload: {
      articleTitle: paragraph.articleTitle,
      sectionName: paragraph.sectionName,
      paragraphPosition: paragraph.paragraphPosition,
      dumpVersion,
      embeddingModel,
    }
  })
);

// Safe error handling
const isRateLimitError = R.pipe(
  R.prop('status'),
  R.equals(429)
);
```

### Previous Story Intelligence

**From Story 1.1** [Source: _bmad-output/implementation-artifacts/1-1-*.md]
- Environment variables pattern: read from .env with fallback
- apps/cli/.env.example already has OPENAI_API_KEY placeholder
- Turborepo build system already configured

**From Story 1.2** [Source: _bmad-output/implementation-artifacts/1-2-*.md]
- `@wikirag/qdrant` package available with:
  - `collectionManager.createCollection(strategy, dumpDate, vectorSize)`
  - `collectionManager.collectionExists(collectionName)`
  - Collection naming convention: `wiki-{strategy}-{dump_date}`
  - Insert API: need to use Qdrant client directly for batch inserts
- Error handling pattern: Custom error classes with operation context
- Ramda usage examples: R.pathOr, R.propOr for safe access

**From Story 1.3** [Source: _bmad-output/implementation-artifacts/1-3-*.md]
- Async generator pattern for streaming: `async function* pipeline()`
- Ramda functional composition: R.pipe, R.map, R.filter
- Progress logging pattern: log every N items
- Custom error class pattern: WikipediaParserError
- Test mocking pattern: Mock external services (OpenAI, Qdrant)

**From Git History**
- All stories use comprehensive JSDoc comments
- All tests use nested describe blocks
- Singleton pattern for client wrappers
- One class per file organization

### Testing Strategy

**Test Coverage Requirements**
- Unit tests for each module (openai-client, batch-processor, qdrant-inserter, pipeline)
- Mock OpenAI API with predefined responses
- Mock Qdrant client using existing patterns from Story 1.2 tests
- Test error scenarios (rate limits, network errors, malformed responses)
- Test batch processing edge cases (partial batches, empty batches)
- Test retry logic with exponential backoff

**Mocking OpenAI API:**
```typescript
import { vi } from 'vitest';

const mockOpenAI = {
  embeddings: {
    create: vi.fn().mockResolvedValue({
      data: [
        { embedding: [0.1, 0.2, ...], index: 0 },
        { embedding: [0.3, 0.4, ...], index: 1 },
      ]
    })
  }
};
```

**Mocking Qdrant:**
```typescript
// Reuse mocking patterns from packages/qdrant/tests
const mockQdrantClient = {
  upsert: vi.fn().mockResolvedValue({ status: 'ok' })
};
```

### Anti-Patterns to Avoid

- Do NOT hardcode OPENAI_API_KEY (read from environment)
- Do NOT process all paragraphs at once (use streaming/batching)
- Do NOT ignore rate limits (implement backoff and retry)
- Do NOT insert vectors one at a time (use batch inserts)
- Do NOT swallow errors silently (log and track failures)
- Do NOT use different payload structure than Story 1.2
- Do NOT use native array methods (map, filter) - use Ramda

### Implementation Notes

**Embedding Pipeline Flow:**
```
parseWikipediaDump()
  → batchParagraphs(100)
  → embedBatch(openai)
  → insertBatch(qdrant)
  → log progress
  → continue
```

**Retry Logic (Exponential Backoff):**
```typescript
async function withRetry<T>(
  fn: () => Promise<T>,
  maxRetries: number = 3,
  baseDelay: number = 1000
): Promise<T> {
  // Retry with exponential backoff: 1s, 2s, 4s, 8s
}
```

**Progress Metrics:**
```typescript
interface EmbeddingMetrics {
  paragraphsProcessed: number;
  embeddingsGenerated: number;
  apiCallsMade: number;
  errors: number;
  rateLimitHits: number;
  startTime: number;
  estimatedTimeRemaining?: number;
}
```

### References

- [Source: architecture.md#Technical Constraints] - OpenAI as embedding provider
- [Source: architecture.md#Data Architecture] - Collection naming conventions
- [Source: architecture.md#Authentication & Security] - API key management
- [Source: epics.md#Story 1.4] - Acceptance criteria and requirements
- [Source: packages/qdrant/src/types.ts] - WikipediaPayload interface
- [OpenAI Embeddings Guide](https://platform.openai.com/docs/guides/embeddings) - API documentation
- [OpenAI Node.js SDK](https://github.com/openai/openai-node) - Official SDK

## Dev Agent Record

### Agent Model Used

_To be filled by dev agent_

### Debug Log References

_To be filled by dev agent_

### Completion Notes List

_To be filled by dev agent_

### Change Log

_To be filled by dev agent_

### File List

_To be filled by dev agent_
