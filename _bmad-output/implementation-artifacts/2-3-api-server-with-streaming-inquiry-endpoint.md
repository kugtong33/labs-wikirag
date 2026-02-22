# Story 2.3: API Server with Streaming Inquiry Endpoint

Status: done

## Story
As a user, I want to submit queries to an API that streams responses back in real-time, so that I can see answers as they are generated.

## Acceptance Criteria
1. POST /api/inquiry with query and technique returns SSE stream (response.chunk, stream.done, stream.error)
2. First chunk streams within 10 seconds, full response within 60 seconds
3. GET /api/techniques returns all registered techniques in {data, meta} format
4. GET /api/health confirms API and Qdrant connectivity
5. Errors follow RFC 9457 format, no stack traces exposed
6. Default technique (Naive RAG) used if not specified

## Tasks/Subtasks

- [x] Task 1: Set up Express 5 server with dependencies and Pino logging
  - [x] 1.1: Install Express 5 v5.2.1, Pino v10.2.0, pino-http, and dev dependencies (@types/express, supertest, vitest)
  - [x] 1.2: Create apps/api/src/server.ts with Express app factory (createApp) and Pino logger setup
  - [x] 1.3: Update apps/api/src/index.ts as the entry point that starts the server on PORT
- [x] Task 2: Implement GET /api/health endpoint (AC4)
  - [x] 2.1: Create apps/api/src/routes/health.ts with health route checking Qdrant connectivity
  - [x] 2.2: Write tests for health endpoint (healthy + unhealthy Qdrant scenarios)
- [x] Task 3: Implement GET /api/techniques endpoint (AC3)
  - [x] 3.1: Create apps/api/src/routes/techniques.ts returning {data, meta} format
  - [x] 3.2: Write tests for techniques endpoint
- [x] Task 4: Implement POST /api/inquiry with SSE streaming (AC1, AC2, AC6)
  - [x] 4.1: Create pipeline executor that runs technique adapters in sequence
  - [x] 4.2: Create apps/api/src/routes/inquiry.ts with SSE streaming response
  - [x] 4.3: Write tests for inquiry endpoint (SSE stream parsing, default technique, error scenarios)
- [x] Task 5: Implement RFC 9457 error middleware (AC5)
  - [x] 5.1: Create apps/api/src/middleware/error-handler.ts with RFC 9457 problem details format
  - [x] 5.2: Write tests for error handler middleware
- [x] Task 6: Integration and regression testing
  - [ ] 6.1: Run full test suite across all packages, ensure no regressions
  - [x] 6.2: Validate all acceptance criteria are met

### Review Follow-ups (AI)

- [ ] [AI-Review][Low] Fix legacy CLI import-path breakage causing suite bootstrap failure in `openai-client.test.ts` before release sign-off [apps/cli/tests/embedding/openai-client.test.ts:6]
- [ ] [AI-Review][Low] Stabilize CLI embedding pipeline/batch tests so monorepo `pnpm test` can pass cleanly end-to-end [apps/cli/tests/embedding/batch-processor.test.ts:46]

## Dev Notes

**Implementation:** Express 5 v5.2.1 server in apps/api with SSE endpoints. Use Pino v10.2.0 for logging. Integrate packages/core technique execution. RFC 9457 error middleware.

**Key Files:** apps/api/src/server.ts, routes/inquiry.ts (SSE), routes/techniques.ts, routes/health.ts, middleware/error-handler.ts

**Testing:** Supertest for HTTP endpoints, SSE client testing, error scenario coverage.

## Dev Agent Record

### Agent Model Used
claude-opus-4-6 / claude-sonnet-4-6

### Debug Log References
- TypeScript TS2742 error: Exported `Router` constants required explicit `IRouter` type annotation due to pnpm symlink path portability constraint. Fixed by adding `: IRouter` annotation on all three route exports.
- Vitest mock hoisting: `vi.mock` factory for `pipeline-executor.js` was hoisted before variable initialization. Fixed using `vi.hoisted()` to lift `mockExecutePipeline` before mock registration.
- Supertest SSE parsing: `res.text` is `undefined` when using custom `.parse()` callback — parsed body arrives in `res.body`. Fixed test assertions to use `res.body as string`.

### Completion Notes List
- `createApp()` factory in `server.ts`: Express app with JSON body parsing, pino-http request logging, route mounts, and RFC 9457 error handler. Not bound to a port — testable without `listen()`.
- `index.ts`: Entry point; calls `discoverAndRegisterTechniques()` at startup, then `createApp().listen(PORT)`.
- `healthRouter` (GET /api/health): Calls `qdrantClient.ensureConnected()` — returns `{status: 'ok', qdrant: 'connected', timestamp}` on success, `{status: 'degraded', qdrant: 'disconnected', timestamp}` with HTTP 503 on failure.
- `techniquesRouter` (GET /api/techniques): Returns `{data: [{name, description}], meta: {count, timestamp}}` from `techniqueRegistry.list()`.
- `inquiryRouter` (POST /api/inquiry): Validates `query` field (400 if missing), defaults to `NAIVE_RAG_NAME`, sets SSE headers, calls `executePipeline()`, emits `response.chunk` → `stream.done`. Catches errors as `stream.error` SSE event.
- `executePipeline()`: Chains all adapter stages in order (query → preRetrieval? → retrieval → postRetrieval? → generation) without binding to any specific technique.
- `errorHandler` middleware: 4-argument Express error handler; maps `ApiError` to RFC 9457 `application/problem+json`; all unknown errors become generic 500; no stack traces exposed.
- `ApiError` class: Structured error with HTTP status, title, optional detail, and RFC 9457 type URI.
- 17 new tests total: 3 health + 4 techniques + 5 inquiry + 5 error-handler. All pass.
- Senior review fixes applied: inquiry route now enforces AC2 timing boundaries with configurable first-chunk watchdog and total deadline, sanitizes SSE error messages to avoid internal detail leakage, and adds timing/sanitization test coverage.
- Historical implementation for this story was validated against commit `cf0ca5d` to preserve traceability when reviewing on a clean working tree.
- Adversarial review remediation (round 2): removed synthetic empty watchdog chunk behavior; timeouts now emit RFC 9457-shaped `stream.error` payloads, and AC2 deadlines are enforced with explicit first-chunk/total timeout problem details.
- Added API boundary hardening for inquiry input (`query` control-character sanitization and max-length validation) and request correlation support via `X-Request-Id` generation + propagation.
- Re-ran validation after fixes: API package tests/build pass; monorepo `pnpm test` still reports pre-existing CLI embedding-suite failures (captured as follow-ups).

### File List
- `apps/api/package.json` — MODIFIED: Added express, pino, pino-http dependencies; supertest, @types/express, vitest devDependencies; updated test script
- `apps/api/vitest.config.ts` — NEW: Vitest config matching packages/core pattern
- `apps/api/src/index.ts` — MODIFIED: Full entry point replacing stub; registers naive-rag, starts server on PORT
- `apps/api/src/server.ts` — NEW: Express app factory (createApp) with pino-http logging and route mounting
- `apps/api/src/pipeline-executor.ts` — NEW: executePipeline() sequences all adapter stages for a given Technique
- `apps/api/src/routes/health.ts` — NEW: GET /api/health with Qdrant connectivity check
- `apps/api/src/routes/techniques.ts` — NEW: GET /api/techniques returning {data, meta} envelope
- `apps/api/src/routes/inquiry.ts` — NEW: POST /api/inquiry with SSE streaming and default technique
- `apps/api/src/middleware/error-handler.ts` — NEW: RFC 9457 error handler + ApiError class
- `apps/api/tests/health.test.ts` — NEW: 3 tests for health endpoint
- `apps/api/tests/techniques.test.ts` — NEW: 4 tests for techniques endpoint
- `apps/api/tests/inquiry.test.ts` — NEW: 5 tests for inquiry SSE streaming
- `apps/api/tests/error-handler.test.ts` — NEW: 5 tests for RFC 9457 error handling
- `apps/api/src/routes/inquiry.ts` — MODIFIED (review fix): adds first-chunk watchdog, 60s inquiry deadline, and safe SSE error messaging
- `apps/api/tests/inquiry.test.ts` — MODIFIED (review fix): adds timing-boundary and sanitization assertions
- `_bmad-output/implementation-artifacts/2-3-api-server-with-streaming-inquiry-endpoint.md` — MODIFIED during code review
- `apps/api/src/routes/inquiry.ts` — MODIFIED (review fix v2): RFC 9457-shaped stream error payloads, strict timeout problem signaling, and query sanitization/length validation
- `apps/api/src/server.ts` — MODIFIED (review fix v2): request correlation via generated/preserved `X-Request-Id`
- `apps/api/src/middleware/error-handler.ts` — MODIFIED (review fix v2): includes `requestId` in structured error logs
- `apps/api/tests/inquiry.test.ts` — MODIFIED (review fix v2): validates RFC 9457 stream.error shape, timeout semantics, and sanitization behavior
- `apps/api/tests/health.test.ts` — MODIFIED (review fix v2): validates `x-request-id` response header
- `apps/api/tests/error-handler.test.ts` — MODIFIED (review fix v2): removes server module mock that interfered with logger behavior
- `pnpm-lock.yaml` — MODIFIED in historical implementation commit `cf0ca5d` (added for File List traceability)
- `_bmad-output/implementation-artifacts/sprint-status.yaml` — MODIFIED in historical implementation commit `cf0ca5d` (added for File List traceability)

### Senior Developer Review (AI)

- Reviewer: kugtong33
- Date: 2026-02-22
- Outcome: Changes Requested -> Fixed (High/Medium), with low-severity follow-ups retained
- Validation summary:
  - AC2 gap addressed by replacing synthetic empty watchdog output with explicit timeout problem events and deadline enforcement
  - AC5 gap addressed by emitting RFC 9457-shaped problem details in `stream.error` payloads while keeping internals private
  - Security/input hardening added for `query` (control-character stripping + max-length validation)
  - Request-correlation observability added via `X-Request-Id` generation/propagation and error-log inclusion
  - Git/story discrepancy documentation updated with historically changed-but-unlisted files from commit `cf0ca5d`
- Targeted verification performed:
  - `pnpm --filter @wikirag/api test -- --run` (pass)
  - `pnpm --filter @wikirag/api build` (pass)
  - `pnpm test` (fails in CLI embedding suite; recorded as follow-ups)

### Change Log
2026-02-21: Story 2.3 implemented by claude-opus-4-6/claude-sonnet-4-6. Express 5 API server with SSE inquiry endpoint, techniques listing, health check, and RFC 9457 error handling. 17 new tests added, all passing.
2026-02-22: Senior AI review fixes applied - added inquiry timing guards and SSE error sanitization, expanded inquiry tests, corrected task/state documentation, and recorded monorepo regression follow-up.
2026-02-22: Senior AI adversarial re-review fixes applied - converted stream error payloads to RFC 9457 shape, replaced synthetic first-chunk behavior with timeout problem signaling, added query sanitization/length validation, added request-id correlation, and updated traceability/file-list documentation.
