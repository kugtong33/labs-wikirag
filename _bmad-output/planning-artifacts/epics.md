---
stepsCompleted: [step-01-validate-prerequisites, step-02-design-epics, step-03-create-stories, step-04-final-validation]
inputDocuments: [prd.md, architecture.md]
status: 'complete'
completedAt: '2026-02-08'
---

# labs-wikirag - Epic Breakdown

## Overview

This document provides the complete epic and story breakdown for labs-wikirag, decomposing the requirements from the PRD and Architecture into implementable stories.

## Requirements Inventory

### Functional Requirements

FR1: Users can select a RAG technique from a list of available techniques before submitting a query
FR2: The system can execute a query through the selected RAG technique's pipeline stages (query, pre-retrieval, retrieval, post-retrieval, generation)
FR3: Contributors can add new RAG technique modules by implementing adapter interfaces without modifying core pipeline code
FR4: The system can register and discover RAG technique modules at startup
FR5: Contributors can reuse existing pipeline stage adapters when creating new RAG technique modules
FR6: Users can submit natural language queries and receive generated responses
FR7: Users can view responses as they are generated via streaming output
FR8: The system can process and return responses for factual, open-ended, vague, and meta-question query types
FR9: Users can submit queries immediately using default configuration without prior setup
FR10: Users can select two RAG techniques and run the same query through both simultaneously
FR11: Users can view side-by-side results from two RAG techniques for the same query
FR12: The system can stream responses from two parallel RAG pipelines independently
FR13: The system can score each query response across five quality dimensions
FR14: Users can view quality scores alongside each query response
FR15: Users can compare quality scores between techniques in comparison mode
FR16: Operators can index the full English Wikipedia dump via a CLI command
FR17: The CLI can parse Wikipedia dump articles and extract paragraphs with metadata
FR18: The CLI can create vector embeddings for each paragraph using the configured embedding provider
FR19: The CLI can insert embeddings with metadata into the vector database
FR20: The indexing process can stream through the dump incrementally
FR21: Operators can pause and resume indexing from where it left off
FR22: Operators can select an embedding strategy via CLI parameters
FR23: The system can store and retrieve vector embeddings from the vector database
FR24: The system can perform similarity searches against the Wikipedia corpus
FR25: The system can return retrieved context with associated article metadata
FR26: Users can access the application as a browser-installable PWA
FR27: Users can switch between single query mode and comparison mode
FR28: Users can select RAG techniques from a selection interface
FR29: The application can load with sensible defaults requiring no configuration
FR30: Operators can start the API layer via a container
FR31: Operators can start the frontend layer via a container
FR32: Operators can start all services via a single orchestration command
FR33: The API layer can connect to the vector database for vector operations
FR34: The PWA layer can connect to the API layer for query submission and streaming
FR35: The system can execute Corrective RAG, evaluating and correcting retrieved context before generation
FR36: The system can execute HyDE, generating hypothetical answer embeddings for improved vague query retrieval
FR37: The system can execute Self-RAG, iteratively refining retrieval through self-reflection and query rewriting
FR42: The CLI can accept and stream directly from .xml.bz2 compressed Wikipedia dump files in addition to uncompressed .xml files, auto-detecting format based on file extension
FR43: The CLI can leverage the bz2 multistream format to decompress and process multiple streams in parallel, increasing indexing throughput

### NonFunctional Requirements

NFR1: Single query responses must begin streaming first chunk within 10 seconds
NFR2: End-to-end query response must complete within 60 seconds in local Docker
NFR3: Comparison mode must stream two responses in parallel independently
NFR4: PWA initial load must complete within 3 seconds on localhost
NFR5: RAG technique switching must update UI within 100ms
NFR6: Quality scoring must complete within 15 seconds per response and not block streaming
NFR7: Wikipedia indexing CLI must process dump as stream without full memory load
NFR8: OpenAI API keys must not be exposed in frontend code
NFR9: API keys must be configurable via environment variables, not hardcoded
NFR10: API must not expose stack traces or internals in error responses
NFR11: Must support standard Wikipedia dump XML format
NFR12: Must use official vector database client library
NFR13: Must use configured embedding API for embedding generation
NFR14: API and frontend must communicate via streaming-capable endpoints
NFR15: All three layers must be independently deployable and operable
NFR16: Must support keyboard navigation for core interactions
NFR17: Must use semantic HTML elements for screen reader compatibility
NFR18: Text must maintain WCAG 2.1 AA contrast ratios

### Additional Requirements

- Starter template: Turborepo + pnpm monorepo scaffold (pnpm dlx create-turbo@latest) - impacts Epic 1 Story 1
- Express 5 v5.2.1 as API HTTP framework
- Vitest v4.0.18 as testing framework
- Qdrant v1.16.3 (pinned, CVE mitigations documented)
- Separate Qdrant collection per embedding strategy (wiki-{strategy}-{dump_date})
- Checkpoint JSON file for indexing resume capability
- fast-xml-parser v5.3.4 for Wikipedia XML parsing
- Pino v10.2.0 for structured API logging
- RFC 9457 error format
- SSE with dot.notation typed events
- Multi-stage Docker builds per app with Turborepo prune
- Mastra env variable management for API keys
- Zustand multiple stores, Shadcn/ui + Tailwind, React Router

### FR Coverage Map

FR1:  Epic 2 - Technique selection from available list
FR2:  Epic 2 - Pipeline stage execution for selected technique
FR3:  Epic 2 - Adapter interfaces for extensibility (proven in Epics 3, 5, 6, 7)
FR4:  Epic 2 - Technique module registration and discovery at startup
FR5:  Epic 2 - Stage adapter reuse across techniques (proven in Epics 3, 5, 6, 7)
FR6:  Epic 2 - Natural language query submission and response
FR7:  Epic 2 - Streaming response display
FR8:  Epic 2 - Support for factual, open-ended, vague, meta query types
FR9:  Epic 2 - Default config zero-setup querying
FR10: Epic 3 - Select two techniques for simultaneous query
FR11: Epic 3 - Side-by-side results display
FR12: Epic 3 - Parallel independent SSE streams
FR13: Epic 4 - Five-dimension quality scoring per response
FR14: Epic 4 - Quality scores displayed alongside responses
FR15: Epic 4 - Score comparison between techniques
FR16: Epic 1 - CLI indexing command for Wikipedia dump
FR17: Epic 1 - Wikipedia XML parsing with paragraph/metadata extraction
FR18: Epic 1 - Vector embedding creation per paragraph
FR19: Epic 1 - Embedding insertion into Qdrant with metadata
FR20: Epic 1 - Streaming incremental dump processing
FR21: Epic 1 - Pause and resume indexing
FR22: Epic 1 - Embedding strategy selection via CLI
FR23: Epic 1 - Vector embedding storage and retrieval
FR24: Epic 1 - Similarity search against Wikipedia corpus
FR25: Epic 1 - Retrieved context with article metadata
FR26: Epic 2 - Browser-installable PWA
FR27: Epic 2 - Single query and comparison mode switching
FR28: Epic 2 - Technique selection interface
FR29: Epic 2 - Sensible defaults, no configuration required
FR30: Epic 1 - API layer container
FR31: Epic 2 - Frontend layer container
FR32: Epic 1 - Single orchestration command (docker-compose)
FR33: Epic 1 - API to Qdrant connectivity
FR34: Epic 2 - PWA to API connectivity for queries and streaming
FR35: Epic 5 - Corrective RAG evaluates and corrects retrieved context before generation
FR36: Epic 6 - HyDE generates hypothetical answer embedding for improved vague query retrieval
FR37: Epic 7 - Self-RAG iteratively refines retrieval through self-reflection and query rewriting
FR42: Epic 1 - CLI accepts and streams directly from .xml.bz2 compressed dumps, auto-detecting format
FR43: Epic 1 - CLI leverages bz2 multistream for parallel decompression and processing

## Epic List

### Epic 1: Platform Setup & Data Ingestion
Operators can deploy WikiRAG infrastructure and index the full English Wikipedia into a searchable vector database.
**FRs covered:** FR16, FR17, FR18, FR19, FR20, FR21, FR22, FR23, FR24, FR25, FR30, FR32, FR33, FR42, FR43

### Epic 1.5: Local Embedding Providers
Operators can use local LLM embedding models as an alternative to OpenAI, eliminating per-token costs and enabling embedding quality benchmarking across providers.
**FRs covered:** FR39, FR40, FR41 (new FRs for embedding provider extensibility)

### Epic 2: Core Query Experience with Naive RAG
Users can query Wikipedia using Naive RAG through an installable web app with streaming responses.
**FRs covered:** FR1, FR2, FR3, FR4, FR5, FR6, FR7, FR8, FR9, FR26, FR27, FR28, FR29, FR31, FR34

### Epic 3: Comparison Mode with Simple RAG
Users can compare Naive RAG vs Simple RAG side-by-side to see how technique selection affects results.
**FRs covered:** FR10, FR11, FR12

### Epic 4: Quality Scoring
Users can evaluate RAG responses with benchmarked quality scores across 5 dimensions.
**FRs covered:** FR13, FR14, FR15

### Epic 5: Corrective RAG
Users can see how Corrective RAG automatically detects and fixes incorrect retrievals, improving answer accuracy.
**FRs covered:** FR35

### Epic 6: HyDE
Users can handle vague queries effectively through hypothesis-driven embedding that resolves ambiguous questions.
**FRs covered:** FR36

### Epic 7: Self-RAG
Users can see iterative query refinement that produces higher-quality results through self-reflective retrieval. Completes all 5 MVP RAG techniques.
**FRs covered:** FR37

## Epic 1: Platform Setup & Data Ingestion

Operators can deploy WikiRAG infrastructure and index the full English Wikipedia into a searchable vector database.

### Story 1.1: Scaffold Turborepo Monorepo and Docker Infrastructure

As an operator,
I want to clone the repository and start all infrastructure services with a single command,
So that I have a running development environment with Qdrant ready to accept data.

**Acceptance Criteria:**

**Given** a fresh clone of the repository
**When** I run `pnpm install` and `docker compose up`
**Then** the Qdrant container starts on its default port
**And** the monorepo contains `apps/api`, `apps/web`, `apps/cli`, `packages/core`, `packages/qdrant`, `packages/tsconfig`
**And** shared TypeScript configs (base, node, react) are available to all packages
**And** Qdrant v1.16.3 is pinned in docker-compose.yml
**And** `.env.example` files document required environment variables

### Story 1.2: Qdrant Client Wrapper and Collection Management

As a developer,
I want a shared Qdrant client package that manages collections and performs similarity searches,
So that both the API and CLI use consistent vector operations with enforced naming conventions.

**Acceptance Criteria:**

**Given** the `packages/qdrant` package is imported
**When** I create a new collection for an embedding strategy
**Then** the collection name follows the convention `wiki-{strategy}-{dump_date}`
**And** the collection is configured with the correct vector dimensions for the embedding model

**Given** vectors with metadata payloads exist in a collection
**When** I perform a similarity search with a query vector
**Then** results are returned with their payload metadata (articleTitle, sectionName, paragraphPosition, dumpVersion, embeddingModel)
**And** results are ordered by similarity score

### Story 1.3: Wikipedia XML Streaming Parser

As an operator,
I want the CLI to parse a Wikipedia XML dump file as a stream, extracting paragraphs with article metadata,
So that the 22GB+ dump is processed incrementally without loading it all into memory.

**Acceptance Criteria:**

**Given** a standard English Wikipedia dump XML file
**When** the parser processes the file
**Then** each article's paragraphs are extracted individually with metadata (article title, section name, paragraph position)
**And** the dump is read as a stream (memory usage stays bounded regardless of dump size)
**And** the parser handles the standard Wikipedia dump XML format from dumps.wikimedia.org

### Story 1.4: Embedding Generation and Qdrant Insertion

As an operator,
I want each extracted paragraph to be embedded via the selected embedding provider and inserted into Qdrant with its metadata,
So that Wikipedia content becomes searchable through vector similarity.

**Acceptance Criteria:**

**Given** a stream of parsed paragraphs with metadata
**When** the embedding pipeline processes them
**Then** each paragraph is embedded using the selected embedding provider
**And** the embedding is inserted into the appropriate Qdrant collection with its metadata payload (articleTitle, sectionName, paragraphPosition, dumpVersion, embeddingModel, embeddingProvider)
**And** insertions are batched for efficiency
**And** provider API keys are read from environment variables, never hardcoded
**And** the embedding provider is abstracted via a provider interface in `packages/embeddings`
**And** providers are registered and discoverable at runtime

### Story 1.5: Indexing CLI with Checkpoint and Resume

As an operator,
I want a CLI command to index the full Wikipedia dump with the ability to pause and resume,
So that I can manage the long-running indexing process across multiple sessions.

**Acceptance Criteria:**

**Given** I run the CLI index command with an embedding strategy flag and embedding provider flag
**When** the indexing process starts
**Then** it streams through the dump: parse → embed (via selected provider) → insert
**And** progress is tracked in `indexing-checkpoint.json` (lastArticleId, articlesProcessed, totalArticles, strategy, provider, dumpFile)

**Given** indexing was previously interrupted
**When** I run the CLI index command again
**Then** it resumes from the last checkpoint position
**And** no duplicate embeddings are created

**Given** I want to use a different embedding strategy or provider
**When** I specify the strategy and provider via CLI parameters (e.g., `--strategy paragraph --embedding-provider openai` or `--embedding-provider gpt-oss-14b`)
**Then** a new collection is created with the appropriate naming convention (e.g., `wiki-paragraph-openai-20260213`)
**And** indexing proceeds into the new collection using the selected provider

### Story 1.6: Bz2 Multistream Decompression and Format Auto-Detection

As an operator,
I want the CLI to accept Wikipedia dumps in their native `.xml.bz2` compressed format and decompress multiple bz2 streams in parallel,
So that I can index directly from the downloaded dump file without manual decompression and benefit from faster throughput via parallel processing.

**Acceptance Criteria:**

**Given** a Wikipedia dump file in `.xml.bz2` format (e.g., `enwiki-latest-pages-articles-multistream.xml.bz2`)
**When** I pass it to the CLI index command
**Then** the CLI auto-detects the bz2 format based on file extension
**And** decompression streams directly into the existing XML parser without writing uncompressed data to disk
**And** memory usage stays bounded regardless of dump size

**Given** a Wikipedia multistream bz2 dump with its corresponding index file (`enwiki-latest-pages-articles-multistream-index.txt.bz2`)
**When** the CLI processes the dump
**Then** it leverages the multistream block boundaries to decompress and process multiple streams in parallel
**And** each parallel stream feeds independently into the XML parser and embedding pipeline
**And** the degree of parallelism is configurable via CLI flag (e.g., `--streams <count>`)

**Given** a standard uncompressed `.xml` Wikipedia dump file
**When** I pass it to the CLI index command
**Then** the CLI detects the `.xml` extension and processes it directly without any decompression step
**And** behavior is identical to existing Story 1.3 parsing

**Given** indexing from a bz2 multistream dump is interrupted
**When** I resume the CLI index command
**Then** the checkpoint tracks which multistream blocks have been processed
**And** resume skips already-completed blocks without re-decompressing them

## Epic 1.5: Local Embedding Providers

Operators can use local LLM embedding models as an alternative to OpenAI, eliminating per-token costs and enabling embedding quality benchmarking across providers.

### Story 1.5.1: Embedding Provider Abstraction Layer

As a developer,
I want a pluggable embedding provider architecture with clear interfaces,
So that new embedding providers can be added without modifying core indexing code.

**Acceptance Criteria:**

**Given** the `packages/embeddings` package exists
**When** I review the provider interfaces
**Then** there is a clear `EmbeddingProvider` interface defining the contract for all providers
**And** the interface includes methods: `embed(text: string): Promise<number[]>`, `getModelInfo(): ModelInfo`, `validateConfig(): boolean`
**And** there is a provider registry that discovers and registers providers at startup

**Given** an embedding provider implements the interface
**When** the provider is registered
**Then** it can be selected via CLI flag
**And** it can be discovered via the provider registry

**Given** multiple providers are registered
**When** the CLI lists available providers
**Then** all registered providers are displayed with their model information

### Story 1.5.2: Local LLM Infrastructure Setup

As an operator,
I want to set up local LLM infrastructure for embedding generation,
So that I can run embedding models on my own hardware without API costs.

**Acceptance Criteria:**

**Given** I have a machine with GPU support (NVIDIA GTX 1070 or better)
**When** I follow the setup instructions in README.md
**Then** I can install and run Ollama (or equivalent local LLM runtime)
**And** I can pull embedding models (gpt-oss:14b, qwen3:14b)
**And** the local LLM server is accessible via localhost API

**Given** local LLM infrastructure is running
**When** the CLI connects to the local provider
**Then** it successfully generates embeddings via the local API
**And** performance metrics (embeddings/sec) are comparable to OpenAI

**Given** I want to use a different local LLM runtime (vLLM, llama.cpp)
**When** I configure the provider settings
**Then** the provider adapter works with multiple runtime backends

### Story 1.5.3: Local Model Provider Implementations

As a developer,
I want concrete implementations of local embedding providers,
So that operators can choose from multiple local models for embedding generation.

**Acceptance Criteria:**

**Given** the embedding provider abstraction exists
**When** I implement the gpt-oss:14b provider
**Then** it implements the `EmbeddingProvider` interface
**And** it generates embeddings via Ollama API
**And** it handles batching for efficiency
**And** it includes retry logic for transient failures

**Given** the gpt-oss:14b provider is registered
**When** I run the CLI with `--embedding-provider gpt-oss-14b`
**Then** indexing uses the local model for embedding generation
**And** embeddings are inserted into Qdrant with `embeddingProvider: "gpt-oss-14b"`

**Given** I want to add qwen3:14b as a second local provider
**When** I implement the qwen3:14b provider
**Then** it follows the same pattern as gpt-oss:14b
**And** operators can select between `openai`, `gpt-oss-14b`, and `qwen3-14b` via CLI

**Given** both local providers are available
**When** operators index Wikipedia with different providers
**Then** separate Qdrant collections are created (e.g., `wiki-paragraph-openai-20260213`, `wiki-paragraph-gpt-oss-14b-20260213`)

### Story 1.5.4: Provider Benchmarking & Quality Comparison

As an operator,
I want to benchmark embedding provider performance and quality,
So that I can make data-driven decisions about which provider to use.

**Acceptance Criteria:**

**Given** multiple embedding providers are available
**When** I run a benchmarking utility with sample paragraphs
**Then** I see performance metrics for each provider (embeddings/sec, latency, memory usage)
**And** I see embedding dimensions and model information for each provider

**Given** I have indexed Wikipedia with different providers
**When** I run quality comparison queries
**Then** I can compare retrieval quality across providers (precision, recall, relevance)
**And** results help me understand which provider works best for my use case

**Given** I want to document provider characteristics
**When** I review the benchmarking results
**Then** README.md includes a provider comparison table (cost, speed, quality, hardware requirements)
**And** guidance helps operators choose the right provider for their needs

## Epic 2: Core Query Experience with Naive RAG

Users can query Wikipedia using Naive RAG through an installable web app with streaming responses.

### Story 2.1: Pipeline Adapter Interfaces and Technique Registry

As a contributor,
I want well-defined adapter interfaces for each pipeline stage and a registry that discovers techniques at startup,
So that new RAG techniques can be added by implementing adapters without modifying core code.

**Acceptance Criteria:**

**Given** the `packages/core` package
**When** I review the adapter interfaces
**Then** there are interfaces for all 5 pipeline stages: query, pre-retrieval, retrieval, post-retrieval, generation
**And** each interface defines a clear input/output contract
**And** a technique is defined as a composition of stage adapters

**Given** technique modules are registered in `packages/core/techniques/`
**When** the system starts
**Then** the technique registry discovers and lists all available techniques
**And** each technique can be resolved by name to its stage adapter composition

### Story 2.2: Naive RAG Technique Implementation

As a user,
I want a Naive RAG technique that performs basic retrieve-and-generate,
So that I can query Wikipedia and get responses using the simplest RAG approach.

**Acceptance Criteria:**

**Given** the Naive RAG technique is selected
**When** a query is submitted
**Then** the pipeline executes: passthrough query → no pre-retrieval → vector similarity retrieval from Qdrant → no post-retrieval processing → LLM generation from retrieved context
**And** the response includes content generated from the retrieved Wikipedia paragraphs
**And** the technique works for factual, open-ended, vague, and meta-question query types

### Story 2.3: API Server with Streaming Inquiry Endpoint

As a user,
I want to submit queries to an API that streams responses back in real-time,
So that I can see answers as they are generated rather than waiting for completion.

**Acceptance Criteria:**

**Given** the API server is running
**When** I send `POST /api/inquiry` with a query and technique selection
**Then** the response is an SSE stream with typed events (`response.chunk`, `stream.done`, `stream.error`)
**And** the first chunk begins streaming within 10 seconds
**And** the full response completes within 60 seconds

**Given** no technique is specified
**When** I send `POST /api/inquiry` with only a query
**Then** the default technique (Naive RAG) is used

**Given** I send `GET /api/techniques`
**Then** all registered techniques are returned in `{ data, meta }` wrapper format

**Given** I send `GET /api/health`
**Then** the response confirms API and Qdrant connectivity

**Given** an error occurs during pipeline execution
**When** the error propagates to the API boundary
**Then** the response follows RFC 9457 format with no stack traces or internal details exposed
**And** SSE streams send a `stream.error` event then close

### Story 2.4: PWA Shell with Routing and Technique Selection

As a user,
I want to open WikiRAG in my browser as an installable app with technique selection,
So that I can access the platform like a native application and choose which RAG technique to use.

**Acceptance Criteria:**

**Given** I navigate to the PWA URL
**When** the app loads
**Then** it loads within 3 seconds on localhost
**And** the browser offers a PWA install option
**And** the app displays a single query view as the default mode
**And** a technique selector dropdown shows all available techniques
**And** a default technique is pre-selected

**Given** I switch between single query mode and comparison mode
**When** I click the mode toggle
**Then** the UI switches views within 100ms (client-side, no server round-trip)

**Given** I use keyboard navigation
**When** I tab through the interface
**Then** I can reach query input, technique selector, mode switch, and submit button
**And** all interactive elements use semantic HTML

### Story 2.5: Single Query Streaming Experience

As a user,
I want to type a question, submit it, and see the response stream in real-time,
So that I can query Wikipedia and observe how the selected RAG technique responds.

**Acceptance Criteria:**

**Given** I have typed a query and selected a technique
**When** I click submit
**Then** the status transitions from `idle` → `loading` → `streaming` → `complete`
**And** response text appears incrementally as chunks arrive via SSE
**And** the request ID and timestamp are displayed upon completion

**Given** a streaming response is in progress
**When** an error occurs
**Then** the status transitions to `error`
**And** a user-friendly error message is displayed (no technical details)

**Given** the app loads for the first time
**When** no configuration has been set
**Then** sensible defaults are pre-loaded (default technique, default collection)
**And** I can submit a query immediately without any setup

## Epic 3: Comparison Mode with Simple RAG

Users can compare Naive RAG vs Simple RAG side-by-side to see how technique selection affects results.

### Story 3.1: Simple RAG Technique Implementation

As a user,
I want a Simple RAG technique that enhances retrieval beyond Naive RAG,
So that I have a second technique to compare against and can see how retrieval improvements affect results.

**Acceptance Criteria:**

**Given** the Simple RAG technique is selected
**When** a query is submitted
**Then** the pipeline executes with enhanced retrieval compared to Naive RAG's basic vector similarity
**And** the technique reuses existing stage adapters where applicable (proving FR5 adapter reuse)
**And** the technique is registered and discoverable without modifying core pipeline code (proving FR3)

### Story 3.2: Comparison API Endpoint with Parallel SSE Streams

As a user,
I want to run the same query through two RAG techniques simultaneously via the API,
So that I can receive both results in parallel without one blocking the other.

**Acceptance Criteria:**

**Given** two techniques are selected
**When** I send `POST /api/comparison` with a query and two technique identifiers
**Then** the API executes both pipelines in parallel
**And** each pipeline streams via its own independent SSE connection
**And** neither stream waits for the other to start or complete
**And** each stream uses typed events (`response.chunk`, `stream.done`, `stream.error`)
**And** the response follows the `{ data, meta }` wrapper format

### Story 3.3: Comparison Mode UI with Side-by-Side Display

As a user,
I want to see two RAG technique results side-by-side in the browser,
So that I can visually compare how different techniques respond to the same query.

**Acceptance Criteria:**

**Given** I am in comparison mode
**When** I select two techniques from the dual dropdowns and submit a query
**Then** two panels display side-by-side, each streaming its response independently
**And** each panel shows the technique name and its streaming status independently
**And** the comparison store manages two independent stream states

**Given** one technique completes before the other
**When** the first stream finishes
**Then** its panel shows the complete response while the other continues streaming
**And** neither panel blocks or waits for the other

## Epic 4: Quality Scoring

Users can evaluate RAG responses with benchmarked quality scores across 5 dimensions.

### Story 4.1: Quality Scoring Engine

As a user,
I want each RAG response scored automatically across quality dimensions,
So that I can objectively evaluate technique effectiveness beyond just reading the response.

**Acceptance Criteria:**

**Given** a completed query response with its retrieved context
**When** the scoring engine runs
**Then** it produces scores for all 5 dimensions: context relevance, context recall, groundedness, answer relevance, answer correctness
**And** scoring uses LLM-as-Judge evaluation
**And** scoring completes within 15 seconds per response
**And** scoring does not block the response stream (runs asynchronously after generation)

### Story 4.2: Scores API and UI Integration

As a user,
I want to see quality scores alongside each response in both single query and comparison modes,
So that I can make data-backed assessments of technique performance.

**Acceptance Criteria:**

**Given** a query response has been scored
**When** I view the response in single query mode
**Then** quality scores are displayed alongside the response via SSE `quality.score` events
**And** each dimension shows its score value

**Given** I am in comparison mode with two responses
**When** both responses have been scored
**Then** scores are displayed per panel, allowing direct comparison
**And** differences between technique scores are visible

**Given** scoring is in progress
**When** the response stream has already completed
**Then** a loading indicator shows scoring is running
**And** scores appear when ready without refreshing

## Epic 5: Corrective RAG

Users can see how Corrective RAG automatically detects and fixes incorrect retrievals, improving answer accuracy.

### Story 5.1: Corrective RAG Technique Implementation

As a user,
I want a Corrective RAG technique that evaluates and corrects retrieved context before generating a response,
So that I can see how post-retrieval correction improves factual accuracy compared to simpler techniques.

**Acceptance Criteria:**

**Given** the Corrective RAG technique is selected
**When** a query is submitted
**Then** the pipeline executes with a post-retrieval stage that evaluates retrieved paragraphs for relevance and accuracy
**And** low-quality or irrelevant retrievals are discarded or re-retrieved
**And** the corrected context is passed to the generation stage
**And** the technique is registered and discoverable without modifying core pipeline code
**And** the technique can be selected in both single query and comparison modes

## Epic 6: HyDE

Users can handle vague queries effectively through hypothesis-driven embedding that resolves ambiguous questions.

### Story 6.1: HyDE Technique Implementation

As a user,
I want a HyDE technique that generates a hypothetical answer first, then uses it to find better matching content,
So that vague queries like "that thing about the cat that's alive and dead" resolve to the correct Wikipedia content.

**Acceptance Criteria:**

**Given** the HyDE technique is selected
**When** a vague or ambiguous query is submitted
**Then** the pipeline executes with a pre-retrieval stage that generates a hypothetical document/answer
**And** the hypothetical document is embedded and used for similarity search instead of the raw query
**And** retrieval results are more relevant for concept-vague queries than Naive RAG
**And** the technique is registered and discoverable without modifying core pipeline code
**And** the technique can be selected in both single query and comparison modes

## Epic 7: Self-RAG

Users can see iterative query refinement that produces higher-quality results through self-reflective retrieval. Completes all 5 MVP RAG techniques.

### Story 7.1: Self-RAG Technique Implementation

As a user,
I want a Self-RAG technique that iteratively refines its retrieval through self-reflection,
So that I can see how query rewriting and reflection produce progressively better answers.

**Acceptance Criteria:**

**Given** the Self-RAG technique is selected
**When** a query is submitted
**Then** the pipeline executes with iterative query refinement: initial retrieval → self-reflection on context quality → query rewrite → improved retrieval
**And** the generation stage uses the refined context from the best retrieval iteration
**And** the technique is registered and discoverable without modifying core pipeline code
**And** the technique can be selected in both single query and comparison modes

**Given** all 5 MVP techniques are now implemented (Naive, Simple, Corrective, HyDE, Self-RAG)
**When** I open the technique selector
**Then** all 5 techniques are listed and selectable
**And** any two can be compared in comparison mode
