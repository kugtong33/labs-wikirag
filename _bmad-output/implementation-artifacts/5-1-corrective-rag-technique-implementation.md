# Story 5.1: Corrective RAG Technique Implementation

Status: ready-for-dev

## Story
As a user, I want Corrective RAG that evaluates and corrects retrieved context before generation.

## Acceptance Criteria
1. Post-retrieval stage evaluates retrieved paragraphs for relevance and accuracy
2. Low-quality/irrelevant retrievals discarded or re-retrieved
3. Corrected context passed to generation stage
4. Registered and discoverable without modifying core code
5. Selectable in both single query and comparison modes

## Dev Notes
**Implementation:** packages/core/src/techniques/corrective-rag/ with post-retrieval evaluator adapter.
**Key Files:** post-retrieval-adapter.ts (evaluation + correction logic)
## Dev Agent Record
_To be filled by dev agent_
