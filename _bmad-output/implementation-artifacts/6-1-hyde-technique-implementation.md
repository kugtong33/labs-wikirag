# Story 6.1: HyDE Technique Implementation

Status: ready-for-dev

## Story
As a user, I want HyDE technique that generates hypothetical answers first for better vague query matching.

## Acceptance Criteria
1. Pre-retrieval stage generates hypothetical document/answer
2. Hypothetical document embedded and used for similarity search
3. Retrieval results more relevant for vague queries than Naive RAG
4. Registered and discoverable without modifying core code
5. Selectable in both modes

## Dev Notes
**Implementation:** packages/core/src/techniques/hyde/ with pre-retrieval hypothetical document generation.
**Key Files:** pre-retrieval-adapter.ts (LLM generates hypothesis, embed hypothesis for search)
## Dev Agent Record
_To be filled by dev agent_
