# Story 2.5: Single Query Streaming Experience

Status: review

## Story
As a user, I want to type a question, submit it, and see the response stream in real-time.

## Acceptance Criteria
1. Status transitions: idle → loading → streaming → complete
2. Response text appears incrementally via SSE chunks
3. Request ID and timestamp displayed on completion
4. Errors show user-friendly message (no technical details)
5. Sensible defaults pre-loaded, zero setup required

## Tasks/Subtasks

- [x] Task 1: Create useStreamingQuery hook (AC1, AC2, AC3, AC4)
  - [x] 1.1: Create hooks/useStreamingQuery.ts — fetch-based SSE client with idle/loading/streaming/complete/error state machine
  - [x] 1.2: Write tests for useStreamingQuery (status transitions, chunk accumulation, error handling)
- [x] Task 2: Create StreamingResponse component (AC1, AC2, AC3, AC4)
  - [x] 2.1: Create components/StreamingResponse.tsx — renders status-appropriate UI per state
  - [x] 2.2: Write tests for StreamingResponse (loading, streaming, complete, error renders)
- [x] Task 3: Wire SingleQuery page with streaming (AC5)
  - [x] 3.1: Update pages/SingleQuery.tsx to wire textarea, submit button, and StreamingResponse
  - [x] 3.2: Update existing SingleQuery tests to cover submit flow
- [x] Task 4: Integration test and regression suite
  - [x] 4.1: Run full test suite, confirm no regressions

## Dev Notes

**Implementation:** SSE client via `fetch` + `ReadableStream` (POST endpoint, EventSource is GET-only). Parse SSE lines from stream chunks with line-by-line buffer splitting. Status machine: idle → loading → streaming → complete | error. Request ID from `crypto.randomUUID()` at submit time; `completedAt` ISO string on `stream.done` event. Network failures produce a generic friendly message.

**Key Files:** hooks/useStreamingQuery.ts, components/StreamingResponse.tsx, pages/SingleQuery.tsx (updated with form + streaming)

**Testing:** Vitest + React Testing Library; fetch mocked with ReadableStream returning SSE text for hook tests.

## Dev Agent Record

### Agent Model Used
claude-sonnet-4-6

### Debug Log References
- `EventSource` only supports GET — used `fetch` + `ReadableStream` + `getReader()` for POST-based SSE streaming.
- ESLint warning on `while (true)` with unused `no-constant-condition` disable: removed the directive since TypeScript + Vitest config didn't flag it as an error.
- `import.meta.env` guard: used `typeof import.meta !== 'undefined' && import.meta.env` to support both Vite (browser) and Vitest (jsdom) environments cleanly.

### Completion Notes List
- `useStreamingQuery` hook: Manages `StreamingStatus` (idle|loading|streaming|complete|error), `responseText` (accumulated chunks), `error` (friendly string), `requestId` (crypto.randomUUID on submit), `completedAt` (ISO on stream.done). Uses `fetch` + `ReadableStream.getReader()` + `TextDecoder` to parse SSE lines. Stateful via `useState` + `useCallback`.
- `StreamingResponse` component: idle → empty div; loading → `<div role="status">` with spinner; streaming → text with blinking cursor; complete → text + requestId + formatted timestamp; error → `<div role="alert">` with friendly message.
- `SingleQuery` page updated: Added `<form onSubmit>`, wired `<textarea>` to `setQuery`, added "Ask" `<button>` (disabled during loading/streaming), integrated `StreamingResponse`. Existing Story 2.4 tests still pass unchanged.
- 22 new tests: 8 `useStreamingQuery` + 8 `StreamingResponse` + 6 `SingleQueryStreaming`. All pass.
- Vite build: 1.16s, 236KB JS + 11KB CSS. No regressions in any other package.

### File List
- `apps/web/src/hooks/useStreamingQuery.ts` — NEW: SSE streaming hook with status machine
- `apps/web/src/components/StreamingResponse.tsx` — NEW: Status-aware response display component
- `apps/web/src/pages/SingleQuery.tsx` — MODIFIED: Added form, submit button, setQuery wiring, StreamingResponse integration
- `apps/web/tests/useStreamingQuery.test.tsx` — NEW: 8 hook tests (fetch mock with ReadableStream)
- `apps/web/tests/StreamingResponse.test.tsx` — NEW: 8 component render tests
- `apps/web/tests/SingleQueryStreaming.test.tsx` — NEW: 6 integration tests for submit flow

### Change Log
2026-02-21: Story 2.5 implemented by claude-sonnet-4-6. fetch-based SSE streaming hook, StreamingResponse component, SingleQuery form wired up. 22 new tests, all passing. Zero new regressions.
