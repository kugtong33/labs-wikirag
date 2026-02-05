---
stepsCompleted: [1, 2, 3, 4, 5, 6]
inputDocuments: []
date: 2026-02-05
author: kugtong33
---

# Product Brief: labs-wikirag

## Executive Summary

WikiRAG is a hands-on RAG (Retrieval-Augmented Generation) exploration platform that uses the full English Wikipedia dump as its knowledge base. It provides a modular, plugin-style architecture where different RAG techniques can be swapped in, compared side-by-side, and evaluated against real-world queries across a broad and deep knowledge corpus. The project serves as both a personal learning vehicle and an extensible reference implementation for understanding how different RAG strategies behave in practice.

The platform consists of a TypeScript API layer (built with Mastra and LangChain.js), a PWA-capable web UI for interactive querying and comparison, and a CLI-driven indexing pipeline for embedding Wikipedia data into Qdrant using selectable embedding strategies. Nine RAG techniques will be implemented incrementally, from naive RAG through advanced and branched RAG approaches.

---

## Core Vision

### Problem Statement

RAG techniques are widely discussed in tutorials and documentation, but they are typically presented in isolation and often marketed as general-purpose solutions. There is no accessible, hands-on way to compare how different RAG strategies actually behave on the same queries against a real-world-scale knowledge base. This makes it difficult for practitioners to develop genuine intuition about which techniques suit which types of problems.

### Problem Impact

Without practical comparison, developers and learners default to whichever RAG approach they encounter first or whichever is most heavily promoted. This leads to suboptimal implementations where techniques like corrective RAG are applied broadly when simpler approaches would suffice, or where advanced techniques like adaptive RAG are overlooked because their benefits aren't tangible without seeing them in action.

### Why Existing Solutions Fall Short

- **Tutorials** demonstrate one technique at a time with toy datasets, making it impossible to compare behavior across approaches
- **Frameworks** (LangChain, LlamaIndex) provide building blocks but no comparison or evaluation tooling out of the box
- **Benchmarking tools** focus on metrics rather than experiential understanding of how techniques differ
- **No existing tool** combines multiple RAG techniques with a real-world-scale corpus and side-by-side comparison in a single, cohesive platform

### Proposed Solution

WikiRAG - a modular RAG exploration platform with the following core components:

1. **Plugin-style RAG pipeline** with interchangeable modules at each stage (query, pre-retrieval, retrieval, post-retrieval, generation) plus supporting modules (indexing, query construction, retriever fine-tuning)
2. **Nine RAG technique implementations**: naive, simple, corrective, HyDE, self-RAG, adaptive, speculative, advanced, and branched RAG - delivered incrementally
3. **Full English Wikipedia** as the knowledge base, embedded into Qdrant with selectable embedding strategies (optimal chunking, per-paragraph with metadata, per-document with metadata)
4. **Side-by-side comparison mode** running multiple techniques simultaneously on the same query
5. **PWA web UI** for interactive querying and comparison, backed by a separate TypeScript API
6. **CLI-driven indexing pipeline** for embedding the Wikipedia dump with different strategies

**Tech stack:** TypeScript throughout - Mastra framework as primary, LangChain.js for gaps, Qdrant (TypeScript driver) for vector storage, OpenAI embeddings (with open-source alternatives to explore).

### Key Differentiators

- **Breadth of techniques in one platform**: Nine RAG approaches implemented with a consistent adapter interface, making comparison natural rather than requiring separate projects
- **Real-world scale**: Full English Wikipedia provides genuinely diverse and deep content, unlike toy datasets that mask technique differences
- **Experiential learning**: Side-by-side comparison lets users develop intuition about technique suitability through direct observation, not just reading about it
- **Extensible architecture**: Plugin-style adapters make it straightforward to add new RAG techniques, embedding strategies, or pipeline variations

## Target Users

### Primary Users

**1. The Builder (Self-directed Learner)**
- **Profile:** A developer (like yourself) who learns best by building. Has working knowledge of TypeScript, LLMs, and AI tooling, but wants to deepen their understanding of RAG architectures through hands-on implementation.
- **Motivation:** Develop genuine intuition for RAG techniques by implementing them against a real-world-scale knowledge base, not just reading tutorials.
- **Current Pain:** Tutorials present RAG techniques in isolation with toy data. No way to see how different approaches actually compare in practice.
- **Success Vision:** Each new RAG module implemented reinforces understanding of the technique and reveals practical differences through the comparison tool.

**2. The Learner (Exploratory User)**
- **Profile:** A developer or AI enthusiast ranging from beginner to experienced, exploring the RAG landscape. May or may not have prior LLM/AI experience. Arrives at WikiRAG looking for a practical way to understand RAG concepts.
- **Motivation:** Gain hands-on understanding of how different RAG techniques work and when to apply them, through direct interaction rather than theory.
- **Current Pain:** RAG techniques are presented as interchangeable or one-size-fits-all. Hard to develop intuition without a working system to experiment with.
- **Success Vision:** Runs the same question through different RAG techniques and sees firsthand how responses differ in accuracy, relevance, and structure.

**3. The Evaluator (Technical Researcher)**
- **Profile:** A developer or researcher working on their own RAG projects who needs empirical data on technique suitability. Could be a junior developer exploring options or a seasoned researcher new to RAG.
- **Motivation:** Make informed decisions about which RAG techniques to adopt for specific use cases, backed by observable differences rather than marketing claims.
- **Current Pain:** No accessible tool to run controlled comparisons of RAG techniques against the same queries and knowledge base.
- **Success Vision:** Side-by-side comparison reveals clear differences - e.g., seeing corrective RAG fix an answer that naive RAG got wrong, or observing how HyDE handles vague queries better than simple RAG.

### Secondary Users

**4. The Contributor (Platform Extender)**
- **Profile:** A developer who understands the adapter architecture and wants to add new RAG technique modules or embedding strategies to the platform. Expected to have intermediate-to-advanced TypeScript skills and RAG knowledge.
- **Motivation:** Extend WikiRAG with new techniques, either for their own exploration or to contribute back to the project.
- **Current Pain:** Building RAG implementations from scratch for each technique is redundant. A modular platform with established patterns reduces boilerplate.
- **Success Vision:** Implements a new RAG module by following the adapter interface, plugs it in, and immediately benefits from the existing comparison and UI infrastructure.

### User Journey

**First-Time Experience (Learner / Evaluator):**
1. **Discovery:** Finds WikiRAG through GitHub, a tutorial, or word of mouth
2. **Onboarding:** Opens the PWA web UI. Default configuration is pre-set - no setup required to start querying
3. **First Query:** Types a question in the default single-query mode. Gets a response using the default RAG technique (naive RAG)
4. **Exploration:** Selects a different RAG technique from the dropdown, reruns the same query, and notices differences in response quality
5. **Aha! Moment:** Switches to the comparison tab, selects two techniques via dropdowns, runs the same query, and sees side-by-side how responses differ in accuracy, relevance, and structure
6. **Deep Exploration:** Experiments with various query types to discover which RAG techniques suit which kinds of questions

**Builder / Contributor Journey:**
1. **Setup:** Clones the repo, runs the CLI to index the Wikipedia dump with a chosen embedding strategy
2. **Development:** Implements RAG technique modules following the adapter interface pattern
3. **Validation:** Uses the comparison mode to verify their new implementation against existing techniques
4. **Iteration:** Re-indexes with different embedding strategies to observe impact on retrieval quality

**Future Enhancements (Post-MVP, noted for reference):**
- "Rabbit hole" mode: Responses surface related topics as clickable links, enabling chained exploration queries
- Pipeline execution status: Visual display of each RAG pipeline stage as it executes in real-time

## Success Metrics

### User Success Metrics

**Functional Success:**
- All implemented RAG techniques produce accurate, relevant responses to Wikipedia-based queries
- Platform operates reliably at full English Wikipedia scale
- Query responses return within 60 seconds (local Docker environment with all supporting services)
- Side-by-side comparison mode runs multiple techniques simultaneously and displays results together

**Quality Scoring (Per-Query, displayed in UI):**
Each query response is scored across five dimensions using a fast scoring system:
- **Context Relevance:** How relevant are the retrieved documents to the query?
- **Context Recall:** How much of the necessary context was retrieved?
- **Groundedness / Faithfulness:** Is the generated answer supported by the retrieved context?
- **Answer Relevance:** Does the answer directly address the query?
- **Answer Correctness:** Is the answer factually accurate?

**Learning Success:**
- Users can observe measurable differences between RAG technique outputs on the same query
- Quality scores make technique tradeoffs visible and concrete
- The platform builds genuine intuition for which techniques suit which query types

### Business Objectives

This is a personal learning and portfolio project. Success is not measured by commercial metrics.

- **Project Completion:** All 9 RAG techniques (naive, simple, corrective, HyDE, self-RAG, adaptive, speculative, advanced, branched) implemented and functional
- **Personal Portfolio Value:** A working, demonstrable proof-of-concept showcasing deep understanding of RAG architectures
- **Conceptual Mastery:** Understanding RAG techniques deeply enough to apply them in other projects and contexts
- **Extensibility Proven:** New RAG modules can be added by following the adapter pattern without modifying core code
- **Community Adoption:** Not a goal - if interest emerges, it should be organic

### Key Performance Indicators

**Platform KPIs:**
| KPI | Target | Measurement |
|-----|--------|-------------|
| RAG techniques implemented | 9 | Count of working adapter modules |
| Query response time | < 60s | End-to-end latency in local Docker environment |
| Embedding strategies available | 3 | Optimal chunking, per-paragraph, per-document |
| Comparison mode functional | Yes | Two techniques run simultaneously with side-by-side output |
| PWA installable | Yes | Browser install prompt available |

**Quality Evaluation Methods:**
- **LLM-as-a-Judge:** Automated scoring of responses using an LLM evaluator (per-query, displayed in UI)
- **Golden Dataset Evaluation:** Batch evaluation against curated question-answer pairs (CLI-based, run periodically)
- **Human Evaluation:** Manual assessment of response quality (ad-hoc)
- **Tooling:** RAGAS, LangChain/LangSmith, TruLens for standardized evaluation pipelines (CLI-based, run outside the app)

## MVP Scope

### Core Features

**RAG Pipeline Architecture:**
- Plugin-style modular pipeline with adapter interfaces at each stage (query, pre-retrieval, retrieval, post-retrieval, generation)
- Supporting module interfaces for indexing, query construction, and retriever fine-tuning
- 5 RAG technique implementations:
  1. **Naive RAG** - basic retrieve-and-generate baseline
  2. **Simple RAG** - structured retrieval with basic preprocessing
  3. **Corrective RAG** - validates and corrects answers against retrieved context
  4. **HyDE** - generates hypothetical documents to compensate for vague queries
  5. **Self-RAG** - rewrites queries iteratively for better retrieval results

**Data Ingestion:**
- CLI command for indexing the full English Wikipedia dump
- Per-paragraph embedding with metadata tags (article title, section, position) using OpenAI embeddings
- CLI scaffolded to support additional embedding strategies in future epics
- Qdrant as the vector database (TypeScript driver)

**Web Application:**
- PWA-capable web UI (installable via browser)
- **Single query mode:** Select a RAG technique from a dropdown, type a question, receive a response
- **Comparison mode:** Select 2 RAG techniques via two dropdowns, run the same query simultaneously, view side-by-side results
- Default configuration pre-set so users can query immediately without setup

**Tech Stack:**
- TypeScript throughout
- Mastra framework (primary), LangChain.js (gap-filling)
- Qdrant (TypeScript driver) for vector storage
- OpenAI for embeddings
- Separate API layer application
- Docker for local development (all supporting services)

### Version 2 Features

**RAG Techniques:**
- Adaptive RAG
- Speculative RAG
- Advanced RAG
- Branched RAG

**Quality & Evaluation:**
- Per-query quality scoring in UI (context relevance, recall, groundedness, answer relevance, correctness)
- LLM-as-a-Judge scoring system
- Batch evaluation via CLI (RAGAS, LangChain/LangSmith, TruLens)
- Golden dataset evaluation

**Embedding & Indexing:**
- Optimal chunking embedding strategy
- Per-document embedding strategy
- Open-source embedding model alternatives

**UI/UX:**
- Multi-comparison mode (more than 2 techniques simultaneously)
- "Rabbit hole" chained query exploration
- Pipeline execution status visualization in UI

**Platform:**
- Integration with other vector databases beyond Qdrant
- Multimodal support (images, audio, video)

### MVP Success Criteria

The MVP is considered successful when:
- All 5 RAG techniques (naive, simple, corrective, HyDE, self-RAG) return answers to queries
- Comparison mode works with 2 techniques running simultaneously with side-by-side output
- Full English Wikipedia dump is indexed (per-paragraph with metadata) and queryable via Qdrant
- PWA web UI is installable and functional with default configuration
- The following query types produce distinguishable results across techniques:
  - **Factual questions** (e.g., "What is the capital of France?")
  - **Open-ended questions** (e.g., "What are the implications of quantum computing?")
  - **Vague questions** (e.g., "Tell me about that thing Einstein did")
  - **Meta-questions** (e.g., "How many articles mention quantum computing?")

### Future Vision

**Near-term (post-MVP epics):**
- Remaining 4 RAG techniques (adaptive, speculative, advanced, branched)
- Per-query quality scoring with LLM-as-a-Judge
- Additional embedding strategies (optimal chunking, per-document)
- Multi-comparison mode (3+ techniques simultaneously)
- Batch evaluation tooling via CLI
- Open-source embedding alternatives

**Long-term:**
- Integration with additional vector databases (Pinecone, Weaviate, Chroma, pgvector)
- Multimodal RAG support (images, audio, video from Wikipedia and beyond)
- Pipeline execution visualization in UI
- "Rabbit hole" mode for chained exploration queries
- Support for custom document corpora beyond Wikipedia
