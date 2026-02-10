# Story 7.1: Self-RAG Technique Implementation

Status: ready-for-dev

## Story
As a user, I want Self-RAG that iteratively refines retrieval through self-reflection.

## Acceptance Criteria
1. Pipeline iterates: initial retrieval → self-reflection on quality → query rewrite → improved retrieval
2. Generation uses refined context from best iteration
3. Registered and discoverable without modifying core code
4. Selectable in both modes
5. All 5 MVP techniques now available (Naive, Simple, Corrective, HyDE, Self-RAG)

## Dev Notes
**Implementation:** packages/core/src/techniques/self-rag/ with iterative refinement in pre-retrieval and post-retrieval adapters.
**Key Files:** pre-retrieval-adapter.ts (reflection + rewrite), retrieval coordination for iterations
## Dev Agent Record
_To be filled by dev agent_
