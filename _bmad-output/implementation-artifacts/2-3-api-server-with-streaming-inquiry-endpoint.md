# Story 2.3: API Server with Streaming Inquiry Endpoint

Status: ready-for-dev

## Story
As a user, I want to submit queries to an API that streams responses back in real-time, so that I can see answers as they are generated.

## Acceptance Criteria
1. POST /api/inquiry with query and technique returns SSE stream (response.chunk, stream.done, stream.error)
2. First chunk streams within 10 seconds, full response within 60 seconds
3. GET /api/techniques returns all registered techniques in {data, meta} format
4. GET /api/health confirms API and Qdrant connectivity
5. Errors follow RFC 9457 format, no stack traces exposed
6. Default technique (Naive RAG) used if not specified

## Dev Notes

**Implementation:** Express 5 v5.2.1 server in apps/api with SSE endpoints. Use Pino v10.2.0 for logging. Integrate packages/core technique execution. RFC 9457 error middleware.

**Key Files:** apps/api/src/server.ts, routes/inquiry.ts (SSE), routes/techniques.ts, routes/health.ts, middleware/error-handler.ts

**Testing:** Supertest for HTTP endpoints, SSE client testing, error scenario coverage.

## Dev Agent Record
_To be filled by dev agent_
