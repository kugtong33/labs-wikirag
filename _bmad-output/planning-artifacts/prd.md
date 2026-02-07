---
stepsCompleted: [step-01-init, step-02-discovery, step-03-success, step-04-journeys, step-05-domain, step-06-innovation, step-07-project-type, step-08-scoping, step-09-functional, step-10-nonfunctional, step-11-polish, step-12-complete]
inputDocuments: [product-brief-labs-wikirag-2026-02-05.md]
workflowType: 'prd'
documentCounts:
  briefs: 1
  research: 0
  brainstorming: 0
  projectDocs: 0
classification:
  projectType: web_app
  domain: scientific
  complexity: medium
  projectContext: greenfield
---

# Product Requirements Document - labs-wikirag

**Author:** kugtong33
**Date:** 2026-02-07

## Executive Summary

WikiRAG is a modular RAG exploration platform that uses the full English Wikipedia as its knowledge base. It provides a plugin-style architecture where different RAG techniques can be swapped in, compared side-by-side, and evaluated with quality scores against real-world queries.

**Core Differentiator:** Breadth of RAG techniques, real-world scale corpus, and side-by-side comparison in a single platform - enabling practitioners to develop genuine intuition about which techniques suit which problems.

**Target Users:**
- **Learners** - Developers exploring RAG concepts through hands-on experimentation
- **Evaluators** - Researchers making data-backed decisions about RAG technique selection
- **Contributors** - Developers extending the platform with new RAG modules via adapter interfaces
- **Operators** - Anyone setting up and deploying the platform locally

**Tech Stack:** TypeScript throughout. Mastra framework (primary), LangChain.js (gap-filling), Qdrant (vector storage), OpenAI (embeddings), React SPA (PWA), Docker.

## Success Criteria

### User Success

- Users observe experiential differences between RAG techniques on the same query - visible differences in response accuracy, relevance, and structure
- Users see technical differences backed by benchmarked quality scores per query (context relevance, context recall, groundedness, answer relevance, answer correctness)
- Comparison mode produces clear "aha!" moments: e.g., corrective RAG fixes an answer that naive RAG got wrong, or HyDE handles a vague query that simple RAG fails on
- Default configuration allows immediate querying with zero setup
- RAG technique selection is straightforward via dropdown

### Business Success

- All 9 RAG techniques implemented and functional (5 MVP, 4 post-MVP)
- Working, demonstrable proof-of-concept for personal portfolio
- Conceptual mastery sufficient to apply RAG techniques in other projects
- New RAG modules can be added via adapter pattern without modifying core code

### Technical Success

- Full English Wikipedia dump indexed (per-paragraph with metadata) and queryable via Qdrant
- Query responses return within 60 seconds in local Docker environment
- PWA installable via browser and functional with sensible defaults
- Comparison mode runs 2 techniques simultaneously with side-by-side output
- Plugin architecture supports interchangeable modules at each pipeline stage

### Measurable Outcomes

| Outcome | Target | Measurement |
|---------|--------|-------------|
| RAG techniques (MVP) | 5 | Naive, simple, corrective, HyDE, self-RAG |
| RAG techniques (total) | 9 | + adaptive, speculative, advanced, branched |
| Response time | < 60s | End-to-end in local Docker |
| Embedding strategies (MVP) | 1 | Per-paragraph with metadata |
| Embedding strategies (total) | 3 | + optimal chunking, per-document |
| Quality dimensions scored | 5 | Context relevance, recall, groundedness, answer relevance, correctness |

## Product Scope

### MVP (Phase 1)

**MVP Approach:** Platform MVP - build the modular pipeline architecture first, then incrementally add RAG techniques across epics.

**Resource:** Solo developer (kugtong33), TypeScript full-stack.

| Capability | Detail |
|-----------|--------|
| RAG Pipeline Architecture | Plugin-style adapters at each stage (query, pre-retrieval, retrieval, post-retrieval, generation) |
| RAG Techniques (5) | Naive, simple, corrective, HyDE, self-RAG (delivered incrementally across epics) |
| Data Ingestion | CLI for full English Wikipedia dump, per-paragraph embedding with metadata, streaming + resume |
| Vector Storage | Qdrant with OpenAI embeddings |
| Web UI (PWA) | React SPA, single query mode, comparison mode (2 techniques), streaming responses |
| API Layer | TypeScript API with streaming endpoints (SSE/WebSocket) |
| Basic Quality Scoring | LLM-as-a-Judge scoring per query displayed in UI |
| Docker Infrastructure | docker-compose with API, PWA, and Qdrant containers |
| Default Configuration | Zero-setup querying once services are running |

**Epic Delivery Strategy:** RAG techniques delivered incrementally - pipeline architecture and naive RAG first, subsequent techniques in follow-on epics. All 5 must be complete for MVP to be considered done.

### Growth (Phase 2)

- 4 additional RAG techniques (adaptive, speculative, advanced, branched)
- Batch evaluation via CLI (RAGAS, LangChain/LangSmith, TruLens)
- Golden dataset evaluation (200 queries: 50 per type - factual, open-ended, vague, meta)
- Additional embedding strategies (optimal chunking, per-document)
- Open-source embedding model alternatives
- Multi-comparison mode (3+ techniques simultaneously)

### Vision (Phase 3)

- Integration with other vector databases (Pinecone, Weaviate, Chroma, pgvector)
- Multimodal RAG support (images, audio, video)
- "Rabbit hole" chained exploration queries
- Pipeline execution status visualization in UI
- Custom document corpora beyond Wikipedia

## User Journeys

### Journey 1: The Learner - "What's the deal with RAG?"

**Persona:** Alex, a mid-level developer who's been using LLMs at work but keeps hearing about RAG techniques. Has seen tutorials but never compared techniques side-by-side on real data.

**Opening Scene:** Alex finds WikiRAG on GitHub while researching RAG approaches for a project at work. They clone the repo, run `docker compose up` to start the API and PWA containers, and open the browser. The UI loads immediately - no configuration needed.

**Rising Action:** Alex types "What caused the fall of the Roman Empire?" using the default naive RAG technique. Gets a reasonable answer. Curious, they switch the dropdown to "Corrective RAG" and ask the same question. The response is noticeably more structured, with corrections applied where the initial retrieval was ambiguous. They try "HyDE" with a vague query: "that thing about the cat that's alive and dead" - and HyDE handles it far better than naive RAG did, resolving it to Schrodinger's cat.

**Climax:** Alex switches to comparison mode, selects naive RAG vs self-RAG, and asks "What are the implications of quantum computing on cryptography?" Side-by-side, they can see self-RAG iteratively refining its retrieval while naive RAG gives a shallow answer. The quality scores confirm what they're seeing - self-RAG scores higher on context relevance and answer correctness.

**Resolution:** Alex now has genuine intuition about when to use which RAG technique. They go back to their work project knowing that for their use case (vague user queries), HyDE or self-RAG would be better choices than the naive approach they were defaulting to.

**Capabilities revealed:** Default config, dropdown technique selection, single query mode, comparison mode, quality score display, PWA instant-load experience.

### Journey 2: The Evaluator - "Which RAG technique should I use for my project?"

**Persona:** Dr. Priya, a senior ML engineer evaluating RAG strategies for a production knowledge base at her company. She needs empirical evidence, not marketing claims.

**Opening Scene:** Priya sets up WikiRAG locally - runs `docker compose up` for the API and PWA layers. She's already indexed Wikipedia using the per-paragraph embedding strategy via the CLI. She opens the PWA and goes straight to comparison mode.

**Rising Action:** Priya systematically tests her hypothesis: corrective RAG should outperform naive RAG on factual questions but may add unnecessary overhead for simple lookups. She runs 10 factual questions through both techniques side-by-side, noting the quality scores for each. She then tests with vague queries, comparing HyDE against simple RAG.

**Climax:** The side-by-side results confirm some hypotheses and shatter others. Corrective RAG does fix errors on complex factual questions, but on simple ones the overhead adds latency without improving accuracy. She discovers that self-RAG unexpectedly outperforms HyDE on a subset of vague queries where the vagueness is about phrasing rather than concept.

**Resolution:** Priya documents her findings and presents a data-backed recommendation to her team: use adaptive RAG (once available in v2) as the default, with HyDE as a fallback for concept-vague queries.

**Capabilities revealed:** Comparison mode, quality scoring per query, response timing, systematic multi-query testing.

### Journey 3: The Contributor - "I want to add graph RAG"

**Persona:** Marcus, an experienced TypeScript developer and RAG enthusiast who's implemented graph-based RAG at his company and wants to add it to WikiRAG.

**Opening Scene:** Marcus clones the repo and studies the adapter interface. He sees the plugin-style pipeline with clear boundaries at each stage (query, pre-retrieval, retrieval, post-retrieval, generation).

**Rising Action:** Marcus creates a new RAG module following the adapter pattern. He implements the graph-based retrieval strategy by creating adapters for the retrieval and post-retrieval stages, while reusing the existing query and generation adapters.

**Climax:** Marcus registers his new module, starts the application, and selects "Graph RAG" from the dropdown. It works. He switches to comparison mode, pitting his graph RAG against existing techniques on knowledge-graph-heavy queries like "How is Albert Einstein connected to the Manhattan Project?"

**Resolution:** His graph RAG module outperforms others on relationship-based queries. He submits a PR. The module was added without modifying any core code - just implementing the adapter interfaces and registering the module.

**Capabilities revealed:** Adapter interface pattern, module registration, pipeline stage reuse, comparison mode for validation, extensibility without core changes.

### Journey 4: The Operator - "Setting up WikiRAG"

**Persona:** Sam, a DevOps-minded developer who wants to get WikiRAG running for their team to experiment with.

**Opening Scene:** Sam clones the repo and sees three distinct layers to set up: data, API, and PWA.

**Rising Action:** Sam starts with the data layer. They download the English Wikipedia dump and run the CLI indexing command, selecting per-paragraph embedding with metadata. The process streams through the dump, creating embeddings via OpenAI and inserting them into Qdrant with article metadata (title, section, position). After a few hours, Sam needs to stop - they pause the process, knowing they can resume where they left off.

**Climax:** The next day, Sam resumes indexing from where it stopped. Once complete, they run `docker compose up` to start the API and PWA containers. The API layer connects to Qdrant, the PWA layer connects to the API. Sam opens the browser, and the platform is ready.

**Resolution:** Sam shares the setup instructions with the team. Each team member opens the PWA URL and starts querying immediately - no individual setup needed beyond the browser.

**Capabilities revealed:** CLI indexing with streaming and resume, Docker containerization (API + PWA), Qdrant integration, per-paragraph embedding with metadata, multi-user access via shared deployment.

### Journey Requirements Summary

| Journey | Key Capabilities Required |
|---------|--------------------------|
| Learner | Default config, dropdown selection, single query, comparison mode, quality scores, PWA |
| Evaluator | Comparison mode, quality scoring, response timing, systematic multi-query testing |
| Contributor | Adapter interfaces, module registration, pipeline stage reuse |
| Operator | CLI indexing (stream + resume), Docker containers (API + PWA), Qdrant setup, embedding strategy selection |

**Cross-cutting requirements:**
- Three-layer architecture (data CLI / API / PWA) must be independently operable
- Indexing must support streaming and resume for the 22GB+ Wikipedia dump
- PWA must work immediately once API + Qdrant are running
- Adapter pattern must allow new modules without core code changes

## Technical Architecture

### Three-Layer Architecture

**Frontend (PWA):**
- React SPA with PWA capabilities (installable via browser)
- Two primary views: single query mode and comparison mode
- Streaming response display (SSE or WebSocket)
- Dropdown-based RAG technique selection
- Default configuration pre-loaded

**API Backend:**
- Separate TypeScript API layer (Docker containerized)
- Streaming endpoint support for real-time response delivery
- RESTful endpoints for technique listing, configuration, and query submission

**Data Ingestion CLI:**
- Standalone CLI for Wikipedia dump indexing
- Streaming pipeline: read/parse dump → create embeddings → insert into Qdrant
- Resume capability for interrupted indexing sessions
- Embedding strategy selection via CLI flags

### Browser Support

| Browser | Support Level |
|---------|--------------|
| Chrome | Full support |
| Chromium | Full support |
| Firefox | Full support |
| Brave | Full support |

### Design Considerations

- Desktop-first (comparison mode requires sufficient viewport width for side-by-side display)
- Basic responsive support for tablet viewports (single query mode)
- SSE preferred for streaming (simpler for unidirectional); WebSocket if bidirectional needed later
- Two parallel streams in comparison mode must render independently
- PWA service worker caches static assets; API responses are dynamic and not cached

### Reproducibility

- **Embedding model versioning:** The system must record the exact embedding model identifier used during indexing (e.g., model name + version) so that retrieval results can be reproduced
- **Wikipedia dump versioning:** Each indexing run must record the Wikipedia dump date/identifier, enabling users to correlate results with a specific corpus snapshot
- **Deterministic retrieval:** Given the same query, embedding model, and indexed corpus, similarity search results must be identical across runs
- **LLM generation seeds:** Where supported by the generation provider, seed parameters should be configurable to reduce non-determinism in generated responses
- **Configuration capture:** Query parameters (technique, embedding strategy, model settings) must be logged alongside results to enable reproducible comparisons

### Docker Composition

- API container, PWA container, and Qdrant container orchestrated via docker-compose
- All three layers independently deployable

## Risk Mitigation

### Technical Risks

| Risk | Impact | Mitigation |
|------|--------|------------|
| Full Wikipedia embedding cost (OpenAI API) | High | Budget estimation before indexing; streaming + resume spreads cost over time |
| Qdrant storage at Wikipedia scale | Medium | Monitor storage; Qdrant handles large collections natively |
| Streaming complexity (2 parallel RAG pipelines) | Medium | Prove streaming with single query first; add parallel streams in comparison epic |
| Adapter interface design | High | Design interfaces with all 9 techniques in mind upfront |

### Resource Risks

| Risk | Impact | Mitigation |
|------|--------|------------|
| Solo developer bandwidth | Medium | Epic-based delivery; each technique is independently shippable |
| OpenAI API dependency | Low | Core dependency; open-source alternatives deferred to Phase 2 |
| Framework limitations (Mastra) | Medium | LangChain.js as fallback for gaps |

## Functional Requirements

### RAG Pipeline & Technique Management

- **FR1:** Users can select a RAG technique from a list of available techniques before submitting a query
- **FR2:** The system can execute a query through the selected RAG technique's pipeline stages (query, pre-retrieval, retrieval, post-retrieval, generation)
- **FR3:** Contributors can add new RAG technique modules by implementing adapter interfaces without modifying core pipeline code
- **FR4:** The system can register and discover RAG technique modules at startup
- **FR5:** Contributors can reuse existing pipeline stage adapters when creating new RAG technique modules

### Query & Response

- **FR6:** Users can submit natural language queries and receive generated responses
- **FR7:** Users can view responses as they are generated via streaming output
- **FR8:** The system can process and return responses for factual, open-ended, vague, and meta-question query types, each producing distinguishable outputs across RAG techniques
- **FR9:** Users can submit queries immediately using default configuration without prior setup

### Comparison Mode

- **FR10:** Users can select two RAG techniques and run the same query through both simultaneously
- **FR11:** Users can view side-by-side results from two RAG techniques for the same query
- **FR12:** The system can stream responses from two parallel RAG pipelines independently

### Quality Scoring

- **FR13:** The system can score each query response across five quality dimensions (context relevance, context recall, groundedness, answer relevance, answer correctness)
- **FR14:** Users can view quality scores alongside each query response
- **FR15:** Users can compare quality scores between techniques in comparison mode

### Data Ingestion & Indexing

- **FR16:** Operators can index the full English Wikipedia dump via a CLI command
- **FR17:** The CLI can parse Wikipedia dump articles and extract paragraphs with metadata (article title, section, position)
- **FR18:** The CLI can create vector embeddings for each paragraph using the configured embedding provider
- **FR19:** The CLI can insert embeddings with metadata into the vector database
- **FR20:** The indexing process can stream through the dump incrementally (not load all into memory)
- **FR21:** Operators can pause and resume indexing from where it left off
- **FR22:** Operators can select an embedding strategy via CLI parameters

### Vector Storage & Retrieval

- **FR23:** The system can store and retrieve vector embeddings from the vector database
- **FR24:** The system can perform similarity searches against the Wikipedia corpus
- **FR25:** The system can return retrieved context with associated article metadata

### Web Application

- **FR26:** Users can access the application as a browser-installable progressive web application
- **FR27:** Users can switch between single query mode and comparison mode
- **FR28:** Users can select RAG techniques from a selection interface
- **FR29:** The application can load with sensible defaults requiring no configuration

### Infrastructure & Deployment

- **FR30:** Operators can start the API layer via a container
- **FR31:** Operators can start the frontend layer via a container
- **FR32:** Operators can start all services (API, frontend, vector database) via a single orchestration command
- **FR33:** The API layer can connect to the vector database for vector operations
- **FR34:** The PWA layer can connect to the API layer for query submission and streaming

## Non-Functional Requirements

### Performance

- **NFR1:** Single query responses must begin streaming the first chunk within 10 seconds of submission
- **NFR2:** End-to-end query response must complete within 60 seconds in local Docker environment
- **NFR3:** Comparison mode must stream two responses in parallel; each stream must begin delivering chunks independently within its own timeout window (neither stream waits for the other to start or complete)
- **NFR4:** PWA initial load must complete within 3 seconds on localhost
- **NFR5:** RAG technique switching must update the UI within 100ms (client-side operation, no server round-trip required)
- **NFR6:** Quality scoring must complete within 15 seconds per response and not block response streaming
- **NFR7:** Wikipedia indexing CLI must process the dump as a stream without loading the full dump into memory

### Security

- **NFR8:** OpenAI API keys must not be exposed in frontend code or client-side bundles
- **NFR9:** API keys and secrets must be configurable via environment variables, not hardcoded
- **NFR10:** The API layer must not expose stack traces, file paths, database connection strings, or dependency versions in error responses

### Integration

- **NFR11:** The system must support the standard Wikipedia dump XML format (latest English dump from dumps.wikimedia.org)
- **NFR12:** The system must use the official vector database client library for all vector operations
- **NFR13:** The system must use the configured embedding API for embedding generation
- **NFR14:** The API and frontend layers must communicate via well-defined streaming-capable endpoints
- **NFR15:** All three layers (data CLI, API, PWA) must be independently deployable and operable

### Accessibility

- **NFR16:** The application must support keyboard navigation for query submission, technique selection, mode switching, and results browsing
- **NFR17:** The application must use semantic HTML elements for screen reader compatibility
- **NFR18:** Text must maintain WCAG 2.1 AA contrast ratios (minimum 4.5:1 for normal text, 3:1 for large text)
