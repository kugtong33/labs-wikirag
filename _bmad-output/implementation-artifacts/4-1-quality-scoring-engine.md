# Story 4.1: Quality Scoring Engine

Status: ready-for-dev

## Story
As a user, I want each RAG response scored automatically across quality dimensions.

## Acceptance Criteria
1. Scores 5 dimensions: context relevance, context recall, groundedness, answer relevance, answer correctness
2. Uses LLM-as-Judge evaluation
3. Scoring completes within 15 seconds per response
4. Scoring doesn't block response stream (runs async after generation)

## Dev Notes
**Implementation:** packages/core/src/scoring/ with LLM-based evaluators for each dimension. Async execution after generation completes.
**Key Files:** scoring-engine.ts, evaluators/context-relevance.ts, evaluators/groundedness.ts
## Dev Agent Record
_To be filled by dev agent_
