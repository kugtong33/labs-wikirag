# Story 2.5: Single Query Streaming Experience

Status: ready-for-dev

## Story
As a user, I want to type a question, submit it, and see the response stream in real-time.

## Acceptance Criteria
1. Status transitions: idle → loading → streaming → complete
2. Response text appears incrementally via SSE chunks
3. Request ID and timestamp displayed on completion
4. Errors show user-friendly message (no technical details)
5. Sensible defaults pre-loaded, zero setup required

## Dev Notes
**Implementation:** SSE client in React, streaming text display with Zustand state management. EventSource API for SSE connection.
**Key Files:** hooks/useStreamingQuery.ts, components/StreamingResponse.tsx, stores/query-store.ts
## Dev Agent Record
_To be filled by dev agent_
