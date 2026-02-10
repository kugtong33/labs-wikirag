# Story 3.2: Comparison API Endpoint with Parallel SSE Streams

Status: ready-for-dev

## Story
As a user, I want to run the same query through two RAG techniques simultaneously via the API.

## Acceptance Criteria
1. POST /api/comparison with query and two technique IDs
2. Two independent SSE streams (neither waits for the other)
3. Each stream uses typed events (response.chunk, stream.done, stream.error)
4. Response follows {data, meta} wrapper format

## Dev Notes
**Implementation:** apps/api/src/routes/comparison.ts with dual SSE connections. Promise.all for parallel execution.
**Key Files:** routes/comparison.ts, streaming dual SSE response handler
## Dev Agent Record
_To be filled by dev agent_
