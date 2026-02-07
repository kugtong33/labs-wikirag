---
stepsCompleted: [step-01-init, step-02-discovery, step-03-success]
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
