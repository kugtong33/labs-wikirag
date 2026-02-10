# Story 2.2: Naive RAG Technique Implementation

Status: ready-for-dev

## Story
As a user, I want a Naive RAG technique that performs basic retrieve-and-generate, so that I can query Wikipedia and get responses using the simplest RAG approach.

## Acceptance Criteria
1. Pipeline executes: passthrough query → no pre-retrieval → vector similarity retrieval from Qdrant → no post-retrieval → LLM generation
2. Response includes content generated from retrieved Wikipedia paragraphs
3. Works for factual, open-ended, vague, and meta-question query types
4. Uses OpenAI for embeddings and generation
5. Retrieves top 5-10 similar paragraphs from Qdrant

## Dev Notes

**Implementation:** Create packages/core/src/techniques/naive-rag/ with adapters implementing Story 2.1 interfaces. Use @wikirag/qdrant for retrieval, OpenAI SDK for generation. Register technique in registry.

**Key Files:** query-adapter.ts (passthrough), retrieval-adapter.ts (Qdrant similarity search), generation-adapter.ts (OpenAI chat completion with context).

**Testing:** Unit tests with mocked Qdrant and OpenAI, integration test with real pipeline execution.

## Dev Agent Record
_To be filled by dev agent_
