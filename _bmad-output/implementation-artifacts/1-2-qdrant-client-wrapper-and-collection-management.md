# Story 1.2: Qdrant Client Wrapper and Collection Management

Status: done

## Story

As a developer,
I want a shared Qdrant client package that manages collections and performs similarity searches,
So that both the API and CLI use consistent vector operations with enforced naming conventions.

## Acceptance Criteria

1. **Given** the `packages/qdrant` package is imported, **When** I create a new collection for an embedding strategy, **Then** the collection name follows the convention `wiki-{strategy}-{dump_date}` **And** the collection is configured with the correct vector dimensions for the embedding model.

2. **Given** I want to check if a collection exists, **When** I call the exists method with a collection name, **Then** it returns true if the collection exists, false otherwise.

3. **Given** I want to delete a collection, **When** I call the delete method with a collection name, **Then** the collection is removed from Qdrant.

4. **Given** vectors with metadata payloads exist in a collection, **When** I perform a similarity search with a query vector, **Then** results are returned with their payload metadata (articleTitle, sectionName, paragraphPosition, dumpVersion, embeddingModel) **And** results are ordered by similarity score.

5. **Given** the Qdrant client is configured, **When** I connect to Qdrant, **Then** the connection uses the URL from environment variables (QDRANT_URL) **And** the client is ready for operations.

## Tasks / Subtasks

- [x] Task 1: Initialize packages/qdrant structure (AC: 1)
  - [x] 1.1 Create package.json with @wikirag/qdrant namespace
  - [x] 1.2 Create tsconfig.json extending from @wikirag/tsconfig
  - [x] 1.3 Add @qdrant/js-client-rest dependency
  - [x] 1.4 Create src/index.ts with package exports
- [x] Task 2: Implement Qdrant client wrapper (AC: 5)
  - [x] 2.1 Create src/client.ts with QdrantClientWrapper class
  - [x] 2.2 Implement connection logic using QDRANT_URL from env
  - [x] 2.3 Add connection health check method
  - [x] 2.4 Export singleton client instance
- [x] Task 3: Implement collection management (AC: 1, 2, 3)
  - [x] 3.1 Create src/collections.ts with CollectionManager class
  - [x] 3.2 Implement createCollection with naming convention enforcement (wiki-{strategy}-{dump_date})
  - [x] 3.3 Implement collectionExists method
  - [x] 3.4 Implement deleteCollection method
  - [x] 3.5 Add collection configuration with vector dimensions parameter
- [x] Task 4: Implement similarity search (AC: 4)
  - [x] 4.1 Create src/search.ts with SearchManager class
  - [x] 4.2 Implement similaritySearch method accepting query vector and collection name
  - [x] 4.3 Ensure results include full payload metadata
  - [x] 4.4 Ensure results are ordered by similarity score (descending)
- [x] Task 5: Define TypeScript types (AC: 4)
  - [x] 5.1 Create src/types.ts with WikipediaPayload interface
  - [x] 5.2 Define SearchResult type with score and payload
  - [x] 5.3 Define CollectionConfig type
  - [x] 5.4 Export all types from index.ts
- [x] Task 6: Add tests (AC: All)
  - [x] 6.1 Create tests/client.test.ts with connection tests
  - [x] 6.2 Create tests/collections.test.ts with collection CRUD tests
  - [x] 6.3 Create tests/search.test.ts with similarity search tests
  - [x] 6.4 Run `pnpm test` from packages/qdrant (14 tests passed)

## Dev Notes

### Architecture Compliance

**Package Structure** [Source: architecture.md#Project Structure & Boundaries]
```
packages/qdrant/
├── package.json
├── tsconfig.json
├── src/
│   ├── index.ts           # Package exports
│   ├── client.ts          # Qdrant client wrapper (FR23)
│   ├── collections.ts     # Collection management + naming
│   ├── search.ts          # Similarity search operations (FR24, FR25)
│   └── types.ts           # Type definitions
└── tests/
    ├── client.test.ts
    ├── collections.test.ts
    └── search.test.ts
```

**Package Boundaries** [Source: architecture.md#Architectural Boundaries]
- `packages/qdrant` owns all vector DB communication
- No direct `@qdrant/js-client-rest` usage in apps
- Collection naming convention enforced in `collections.ts`
- Both `apps/api` and `apps/cli` consume this package

**Naming Conventions** [Source: architecture.md#Naming Patterns]
- File naming: `kebab-case` (client.ts, collections.ts, search.ts)
- TypeScript: PascalCase for types/classes, camelCase for functions/variables
- Qdrant payload fields: `camelCase` (articleTitle, sectionName, paragraphPosition, dumpVersion, embeddingModel)

### Technical Requirements

**Collection Naming Convention** [Source: architecture.md#Data Architecture]
- Format: `wiki-{strategy}-{dump_date}`
- Examples: `wiki-paragraph-20260209`, `wiki-chunked-20260209`
- Separate collection per embedding strategy
- Allows re-indexing without deleting existing data

**Collection Schema** [Source: architecture.md#Data Architecture]
Qdrant has two fields per document:
- `vector`: The embedding array
- `payload`: JSON metadata with fields:
  - `articleTitle`: string - Wikipedia article title
  - `sectionName`: string - Section within article (or empty string for no section)
  - `paragraphPosition`: number - Position of paragraph in article/section
  - `dumpVersion`: string - Wikipedia dump date (YYYYMMDD format)
  - `embeddingModel`: string - OpenAI model used (e.g., "text-embedding-3-small")

**Vector Dimensions** [Source: PRD, OpenAI docs]
- OpenAI text-embedding-3-small: 1536 dimensions
- OpenAI text-embedding-3-large: 3072 dimensions
- OpenAI text-embedding-ada-002: 1536 dimensions
- Must be configurable when creating collection

**Environment Variables** [Source: architecture.md#Authentication & Security]
- `QDRANT_URL`: Connection URL (default: http://localhost:6333)
- `QDRANT_API_KEY`: Optional, for remote instances (Phase 2)
- Read from environment, never hardcoded

### Library/Framework Requirements

| Dependency | Version | Scope | Notes |
|-----------|---------|-------|-------|
| @qdrant/js-client-rest | ^1.12.2 | dependency | Official Qdrant TypeScript client |
| @wikirag/tsconfig | workspace:* | devDependency | Shared TypeScript config |
| typescript | ^5.9.3 | devDependency | Via tsconfig package |
| vitest | ^4.0.18 | devDependency | Testing framework |

### API Surface

**client.ts exports:**
```typescript
class QdrantClientWrapper {
  constructor(url?: string);
  async connect(): Promise<void>;
  async healthCheck(): Promise<boolean>;
  getClient(): QdrantClient;
}

export const qdrantClient: QdrantClientWrapper;
```

**collections.ts exports:**
```typescript
class CollectionManager {
  constructor(client: QdrantClientWrapper);
  async createCollection(
    strategy: string,
    dumpDate: string,
    vectorSize: number
  ): Promise<string>; // Returns collection name
  async collectionExists(collectionName: string): Promise<boolean>;
  async deleteCollection(collectionName: string): Promise<void>;
  async listCollections(): Promise<string[]>;
}

export const collectionManager: CollectionManager;
```

**search.ts exports:**
```typescript
class SearchManager {
  constructor(client: QdrantClientWrapper);
  async similaritySearch(
    collectionName: string,
    queryVector: number[],
    limit: number = 10
  ): Promise<SearchResult[]>;
}

export const searchManager: SearchManager;
```

**types.ts exports:**
```typescript
interface WikipediaPayload {
  articleTitle: string;
  sectionName: string;
  paragraphPosition: number;
  dumpVersion: string;
  embeddingModel: string;
}

interface SearchResult {
  id: string | number;
  score: number;
  payload: WikipediaPayload;
  vector?: number[];
}

interface CollectionConfig {
  name: string;
  vectorSize: number;
  distance: 'Cosine' | 'Euclid' | 'Dot';
}
```

### Implementation Notes

**Singleton Pattern**
- Export singleton instances (qdrantClient, collectionManager, searchManager)
- Initialized lazily on first use
- Ensures consistent client instance across API and CLI

**Error Handling**
- Wrap Qdrant client errors in custom QdrantError class
- Include collection name and operation in error messages
- Don't expose Qdrant internals in error messages

**Collection Configuration**
- Use Cosine distance by default (standard for text embeddings)
- Configure HNSW indexing parameters for optimal search performance
- Set on_disk_payload: true for large collections

**Testing Strategy**
- Unit tests mock the Qdrant client
- Integration tests require running Qdrant (use docker-compose)
- Test collection naming convention enforcement
- Test search result ordering and payload structure

### Anti-Patterns to Avoid

- Do NOT use `latest` tag for @qdrant/js-client-rest - pin to specific version
- Do NOT hardcode QDRANT_URL - always read from environment
- Do NOT expose raw Qdrant client in public API - use wrapper methods
- Do NOT create collections without enforcing naming convention
- Do NOT return search results without payload metadata

### References

- [Source: architecture.md#Data Architecture] - Collection strategy and schema
- [Source: architecture.md#Project Structure & Boundaries] - Package structure
- [Source: architecture.md#Naming Patterns] - Naming conventions
- [Source: architecture.md#Architectural Boundaries] - Package boundaries
- [Source: epics.md#Story 1.2] - Acceptance criteria
- [Qdrant TypeScript Client Docs](https://qdrant.tech/documentation/frameworks/typescript/)

## Dev Agent Record

### Agent Model Used

Claude Sonnet 4.5

### Debug Log References

- Initial build failed due to Qdrant type mismatches with vectors and collection info
- Fixed by adding proper type guards for vector handling (number[] vs number[][])
- Fixed collection info extraction with defensive type checking
- All tests passed on first run after type fixes

### Completion Notes List

- Created @wikirag/qdrant package with Qdrant client wrapper
- Implemented QdrantClientWrapper with environment-based configuration
- Implemented CollectionManager with wiki-{strategy}-{dump_date} naming convention enforcement
- Implemented SearchManager with similarity search and payload metadata support
- Created comprehensive TypeScript types (WikipediaPayload, SearchResult, CollectionConfig, QdrantError)
- Added singleton exports for easy consumption (qdrantClient, collectionManager, searchManager)
- Created 14 unit tests covering client, collections, and search functionality
- Added vitest configuration for test runner

### Change Log

- 2026-02-09: Story 1.2 implemented — Qdrant client wrapper and collection management complete

### File List

- packages/qdrant/package.json (modified - added @qdrant/js-client-rest and vitest)
- packages/qdrant/src/index.ts (modified - added exports)
- packages/qdrant/src/types.ts (new)
- packages/qdrant/src/client.ts (new)
- packages/qdrant/src/collections.ts (new)
- packages/qdrant/src/search.ts (new)
- packages/qdrant/vitest.config.ts (new)
- packages/qdrant/tests/client.test.ts (new)
- packages/qdrant/tests/collections.test.ts (new)
- packages/qdrant/tests/search.test.ts (new)
