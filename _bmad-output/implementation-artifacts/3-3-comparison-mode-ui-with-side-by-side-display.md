# Story 3.3: Comparison Mode UI with Side-by-Side Display

Status: ready-for-dev

## Story
As a user, I want to see two RAG technique results side-by-side in the browser.

## Acceptance Criteria
1. Two panels display side-by-side, each streaming independently
2. Each panel shows technique name and streaming status independently
3. Comparison store manages two independent stream states
4. One technique completing doesn't block the other

## Dev Notes
**Implementation:** apps/web comparison mode with dual technique selectors and streaming panels.
**Key Files:** pages/Comparison.tsx, components/ComparisonPanel.tsx, stores/comparison-store.ts, hooks/useDualStreaming.ts
## Dev Agent Record
_To be filled by dev agent_
