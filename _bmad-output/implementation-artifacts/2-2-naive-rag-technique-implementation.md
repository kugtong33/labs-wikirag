# Story 2.2: Naive RAG Technique Implementation

Status: review

## Story
As a user, I want a Naive RAG technique that performs basic retrieve-and-generate, so that I can query Wikipedia and get responses using the simplest RAG approach.

## Acceptance Criteria
1. Pipeline executes: passthrough query → no pre-retrieval → vector similarity retrieval from Qdrant → no post-retrieval → LLM generation
2. Response includes content generated from retrieved Wikipedia paragraphs
3. Works for factual, open-ended, vague, and meta-question query types
4. Uses OpenAI for embeddings and generation
5. Retrieves top 5-10 similar paragraphs from Qdrant

## Dev Notes

**Implementation:** Create packages/core/src/techniques/naive-rag/ with adapters implementing Story 2.1 interfaces. Use @wikirag/qdrant for retrieval, OpenAI SDK for generation. Register technique in registry.

**Key Files:** query-adapter.ts (passthrough), retrieval-adapter.ts (Qdrant similarity search), generation-adapter.ts (OpenAI chat completion with context).

**Testing:** Unit tests with mocked Qdrant and OpenAI, integration test with real pipeline execution.

## Dev Agent Record

### Agent Model Used

claude-sonnet-4-6

### Debug Log References

Note: the Qdrant payload (`WikipediaPayload`) does not store paragraph text — only metadata (title, section, position). `RetrievedDocument.content` is composed as `articleTitle — sectionName`. The generation adapter still works but LLM context quality improves once indexing stores raw text in the payload.

### Completion Notes List

- `PassthroughQueryAdapter`: sets `processedQuery = context.query`, no transformation
- `NaiveRagRetrievalAdapter`: dependency-injected `EmbeddingProvider` + `SearchManager`; embeds query, searches Qdrant, maps to `RetrievedDocument[]`
- `NaiveRagGenerationAdapter`: dependency-injected OpenAI client; builds prompt from retrieved docs + query, calls `gpt-4o-mini` (configurable)
- `createNaiveRagTechnique(config)` factory for flexible instantiation; `registerNaiveRag()` for one-call startup registration
- 31 new tests (7 query + 12 retrieval + 12 generation); 51 total in packages/core — all pass

### File List

- `packages/core/package.json` — MODIFIED: added openai, @wikirag/qdrant, @wikirag/embeddings dependencies
- `packages/core/src/index.ts` — MODIFIED: added naive-rag exports
- `packages/core/src/techniques/naive-rag/query-adapter.ts` — NEW: PassthroughQueryAdapter
- `packages/core/src/techniques/naive-rag/retrieval-adapter.ts` — NEW: NaiveRagRetrievalAdapter
- `packages/core/src/techniques/naive-rag/generation-adapter.ts` — NEW: NaiveRagGenerationAdapter
- `packages/core/src/techniques/naive-rag/index.ts` — NEW: createNaiveRagTechnique, registerNaiveRag factory/registrar
- `packages/core/tests/techniques/naive-rag/query-adapter.test.ts` — NEW: 7 tests
- `packages/core/tests/techniques/naive-rag/retrieval-adapter.test.ts` — NEW: 12 tests
- `packages/core/tests/techniques/naive-rag/generation-adapter.test.ts` — NEW: 12 tests

### Change Log

2026-02-21: Story implemented by claude-sonnet-4-6
