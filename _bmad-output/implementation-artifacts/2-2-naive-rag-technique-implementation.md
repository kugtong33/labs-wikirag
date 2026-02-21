# Story 2.2: Naive RAG Technique Implementation

Status: done

## Story
As a user, I want a Naive RAG technique that performs basic retrieve-and-generate, so that I can query Wikipedia and get responses using the simplest RAG approach.

## Acceptance Criteria
1. Pipeline executes: passthrough query → no pre-retrieval → vector similarity retrieval from Qdrant → no post-retrieval → LLM generation
2. Response includes content generated from retrieved Wikipedia paragraphs
3. Works for factual, open-ended, vague, and meta-question query types
4. Uses OpenAI for embeddings and generation
5. Retrieves top 5-10 similar paragraphs from Qdrant

## Tasks / Subtasks

### Review Follow-ups (AI)

- [ ] [AI-Review][Low] Re-index existing Qdrant collections so legacy points include `paragraphText` payload and generation quality improves immediately without fallback title/section context [packages/core/src/techniques/naive-rag/retrieval-adapter.ts:27]

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
- Senior review fixes: retrieval now prefers `paragraphText` payload with legacy fallback, enforces topK clamp to 5-10 for AC compliance, adds query-category coverage tests, and adds an adapter-chain integration test.
- Historical implementation evidence validated against commit `875d734` (Story 2.2 implementation commit) to close git/story traceability gap in clean working tree reviews.

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
- `packages/core/src/techniques/naive-rag/retrieval-adapter.ts` — MODIFIED (review fix): paragraph-text preference + topK clamp (5-10)
- `packages/core/tests/techniques/naive-rag/retrieval-adapter.test.ts` — MODIFIED (review fix): paragraph-text preference + topK clamp tests
- `packages/core/tests/techniques/naive-rag/generation-adapter.test.ts` — MODIFIED (review fix): factual/open-ended/vague/meta query-category coverage
- `packages/core/tests/techniques/naive-rag/integration.test.ts` — NEW (review fix): end-to-end adapter-chain integration tests
- `apps/cli/src/embedding/types.ts` — MODIFIED (review fix): optional `paragraphText` payload field
- `apps/cli/src/embedding/batch-processor.ts` — MODIFIED (review fix): persists paragraph text into payload at embedding time
- `apps/cli/src/embedding/qdrant-inserter.ts` — MODIFIED (review fix): forwards `paragraphText` to Qdrant payload
- `packages/qdrant/src/types.ts` — MODIFIED (review fix): optional `paragraphText` in `WikipediaPayload`
- `_bmad-output/implementation-artifacts/2-2-naive-rag-technique-implementation.md` — MODIFIED during code review

### Senior Developer Review (AI)

- Reviewer: kugtong33
- Date: 2026-02-22
- Outcome: Changes Requested -> Fixed (High/Medium) + 1 Low follow-up item recorded
- Validation summary:
  - AC2 corrected by supporting persisted paragraph text in payload with safe fallback for legacy collections
  - AC3 validated with explicit factual/open-ended/vague/meta query coverage plus integration tests
  - AC5 enforced by clamping retrieval `topK` into the required 5-10 range
  - Git/story discrepancy addressed with commit-linked traceability note for clean-tree reviews
- Targeted verification performed:
  - `pnpm --filter @wikirag/core test -- --run` (pass)
  - `pnpm --filter @wikirag/qdrant build && pnpm --filter @wikirag/core build && pnpm --filter @wikirag/cli build` (pass)
  - `pnpm --filter @wikirag/cli exec vitest tests/embedding/qdrant-inserter.test.ts --run` (pass)

### Change Log

2026-02-21: Story implemented by claude-sonnet-4-6
2026-02-22: Senior AI review fixes applied - added paragraph-text payload support with fallback mapping, enforced topK 5-10 in naive retrieval, expanded query-category/integration tests, and updated story traceability.
