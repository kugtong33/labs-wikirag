---
stepsCompleted: [step-01-init, step-02-discovery, step-03-success, step-04-journeys, step-05-domain, step-06-innovation, step-07-project-type]
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

## Success Criteria

### User Success

- Users observe **experiential differences** between RAG techniques on the same query - visible differences in response accuracy, relevance, and structure that can be seen and felt
- Users see **technical differences** backed by benchmarked quality scores per query (context relevance, context recall, groundedness, answer relevance, answer correctness)
- The comparison mode produces an "aha!" moment: e.g., corrective RAG fixes an answer that naive RAG got wrong, or HyDE handles a vague query that simple RAG fails on
- Default configuration allows immediate querying with zero setup
- RAG technique selection is straightforward via dropdown

### Business Success

- All 9 RAG techniques implemented and functional (5 MVP, 4 post-MVP)
- Working, demonstrable proof-of-concept for personal portfolio
- Conceptual mastery sufficient to apply RAG techniques in other projects
- New RAG modules can be added via adapter pattern without modifying core code
- Community adoption is organic, not a goal

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
| Golden dataset queries | 200 | 50 per type (factual, open-ended, vague, meta) |
| Response time | < 60s | End-to-end in local Docker |
| Embedding strategies (MVP) | 1 | Per-paragraph with metadata |
| Embedding strategies (total) | 3 | + optimal chunking, per-document |
| Quality dimensions scored | 5 | Context relevance, recall, groundedness, answer relevance, correctness |

## Product Scope

### MVP - Minimum Viable Product

- **RAG Pipeline:** Plugin-style modular architecture with adapter interfaces (query, pre-retrieval, retrieval, post-retrieval, generation)
- **RAG Techniques:** Naive, simple, corrective, HyDE, self-RAG
- **Data Ingestion:** CLI for indexing full English Wikipedia, per-paragraph embedding with metadata (article, section, position), OpenAI embeddings, Qdrant storage
- **Web UI:** PWA with single-query mode (dropdown technique selection) and comparison mode (2 techniques side-by-side)
- **Defaults:** Pre-configured so first-time users can query immediately
- **Validation:** 200 golden dataset queries (50 per query type)

### Growth Features (Post-MVP)

- 4 additional RAG techniques (adaptive, speculative, advanced, branched)
- Per-query quality scoring displayed in UI (LLM-as-a-Judge)
- Batch evaluation via CLI (RAGAS, LangChain/LangSmith, TruLens)
- Additional embedding strategies (optimal chunking, per-document)
- Open-source embedding model alternatives
- Multi-comparison mode (3+ techniques simultaneously)

### Vision (Future)

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

**Resolution:** Priya documents her findings, exports the quality scores, and presents a data-backed recommendation to her team: use adaptive RAG (once available in v2) as the default, with HyDE as a fallback for concept-vague queries.

**Capabilities revealed:** Comparison mode, quality scoring per query, response timing, systematic multi-query testing.

### Journey 3: The Contributor - "I want to add graph RAG"

**Persona:** Marcus, an experienced TypeScript developer and RAG enthusiast who's implemented graph-based RAG at his company and wants to add it to WikiRAG.

**Opening Scene:** Marcus clones the repo and studies the adapter interface. He sees the plugin-style pipeline with clear boundaries at each stage (query, pre-retrieval, retrieval, post-retrieval, generation).

**Rising Action:** Marcus creates a new RAG module following the adapter pattern. He implements the graph-based retrieval strategy by creating adapters for the retrieval and post-retrieval stages, while reusing the existing query and generation adapters. The architecture lets him focus only on what's unique about graph RAG.

**Climax:** Marcus registers his new module, starts the application, and selects "Graph RAG" from the dropdown. It works. He switches to comparison mode, pitting his graph RAG against the existing techniques on knowledge-graph-heavy queries like "How is Albert Einstein connected to the Manhattan Project?"

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
| Contributor | Adapter interfaces, module registration, pipeline stage reuse, hot-reload or restart |
| Operator | CLI indexing (stream + resume), Docker containers (API + PWA), Qdrant setup, embedding strategy selection |

**Cross-cutting requirements:**
- Three-layer architecture (data/API/PWA) must be independently operable
- Indexing must support streaming and resume for the 22GB+ Wikipedia dump
- PWA must work immediately once API + Qdrant are running
- Adapter pattern must allow new modules without core code changes

## Web App Specific Requirements

### Project-Type Overview

WikiRAG is a three-layer web application: a React SPA (PWA-capable) frontend, a separate TypeScript API backend, and a CLI for data ingestion. The frontend and API communicate over HTTP/WebSocket, with streaming responses for real-time query output.

### Technical Architecture Considerations

**Frontend Architecture:**
- React SPA with PWA capabilities (installable via browser)
- Two primary views: single query mode and comparison mode
- Streaming response display (SSE or WebSocket) for real-time output as RAG pipeline executes
- Dropdown-based RAG technique selection
- Default configuration pre-loaded - no setup required to start querying

**API Architecture:**
- Separate TypeScript API layer (Docker containerized)
- Streaming endpoint support for real-time response delivery
- RESTful endpoints for technique listing, configuration, and query submission
- WebSocket or SSE for streaming query responses back to the frontend

**CLI Architecture:**
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
| Safari | Not targeted |
| Edge | Not targeted |

### Responsive Design

- Desktop-first design (primary use case is seated exploration/comparison)
- Comparison mode requires sufficient viewport width for side-by-side display
- Basic responsive support for tablet viewports (single query mode)
- Mobile not a priority given the exploration/research nature of the tool

### Performance Targets

| Metric | Target |
|--------|--------|
| Query response (end-to-end) | < 60s |
| First stream chunk | As fast as possible (streaming starts before full response) |
| PWA initial load | < 3s |
| Technique switching | Instant (client-side) |
| Comparison mode | 2 parallel streams rendered simultaneously |

### Accessibility

- Basic accessibility: keyboard navigation, semantic HTML, screen reader basics
- No WCAG compliance target for MVP
- Sufficient contrast and readable typography

### SEO Strategy

- Not applicable - locally deployed application, not a public website

### Implementation Considerations

- **Streaming protocol choice:** SSE (Server-Sent Events) or WebSocket for streaming responses from API to frontend. SSE is simpler for unidirectional streaming; WebSocket if bidirectional communication is needed later
- **Comparison mode streaming:** Two parallel streams must render independently without blocking each other
- **PWA service worker:** Cache static assets for fast reload; API responses are dynamic and not cached
- **Docker composition:** API and PWA in separate containers, Qdrant as a third container, all orchestrated via docker-compose
