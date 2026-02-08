---
stepsCompleted: [step-01-init, step-02-context, step-03-starter, step-04-decisions, step-05-patterns, step-06-structure, step-07-validation, step-08-complete]
lastStep: 8
status: 'complete'
completedAt: '2026-02-08'
inputDocuments: [prd.md, product-brief-labs-wikirag-2026-02-05.md, prd-validation-report.md]
workflowType: 'architecture'
project_name: 'labs-wikirag'
user_name: 'kugtong33'
date: '2026-02-08'
---

# Architecture Decision Document

_This document builds collaboratively through step-by-step discovery. Sections are appended as we work through each architectural decision together._

## Project Context Analysis

### Requirements Overview

**Functional Requirements:**
34 FRs across 8 domains. The architectural weight is concentrated in:
- **Pipeline architecture (FR1-5):** The adapter/plugin system at 5 stages is the central design challenge. All 9 RAG techniques must compose from these stage adapters without modifying core pipeline code.
- **Streaming query flow (FR6-7, FR10-12):** Single and dual parallel streaming paths through the pipeline to the browser.
- **Data ingestion (FR16-22):** A separate batch concern - streaming XML parser, embedding generation, Qdrant insertion with resume capability.
- **Quality scoring (FR13-15):** A secondary LLM evaluation path that runs asynchronously alongside generation.

**Non-Functional Requirements:**
18 NFRs across performance, security, integration, and accessibility. Architecture-shaping NFRs:
- Performance: 10s first-chunk, 60s total, parallel streams independent (NFR1-3)
- Security: API keys server-side only, no stack traces in responses (NFR8-10)
- Integration: Standard Wikipedia XML, official Qdrant client, streaming-capable endpoints (NFR11-14)
- Independence: All three layers independently deployable (NFR15)

**Scale & Complexity:**
- Primary domain: Full-stack (CLI + API + PWA)
- Complexity level: Medium-High
- Estimated architectural components: ~12 (pipeline core, 5 stage adapters, technique registry, API server, streaming layer, PWA shell, data ingestion CLI, quality scorer)

### Technical Constraints & Dependencies

- **TypeScript throughout** - All layers in TypeScript, no Python
- **Mastra framework primary** with LangChain.js as fallback for gaps
- **Qdrant** for vector storage (official TypeScript client)
- **OpenAI** for embeddings (open-source alternatives deferred to Phase 2)
- **React SPA** with PWA capabilities
- **Docker Compose** for orchestration (API + PWA + Qdrant containers)
- **SSE preferred** for streaming (WebSocket only if bidirectional needed later)

### Cross-Cutting Concerns Identified

- **Adapter interface contract** - Must be designed with all 9 techniques in mind upfront; the wrong abstraction here cascades everywhere
- **Streaming protocol** - Shared by single query, comparison mode, and quality scoring; must handle parallel independent streams
- **Reproducibility metadata** - Embedding model version, dump version, query config must be captured consistently across all paths
- **Error propagation** - Errors in pipeline stages, LLM calls, and Qdrant queries must surface cleanly across the CLI/API/PWA boundary
- **Configuration management** - Default configs for zero-setup, but configurable per query (technique, model settings, seeds)

## Starter Template Evaluation

### Primary Technology Domain

Full-stack TypeScript monorepo (CLI + API + PWA) based on project requirements analysis.

### Starter Options Considered

**Option A: Turborepo + pnpm workspaces monorepo (Selected)**
- Monorepo with `apps/` (api, web, cli) and `packages/` (core, qdrant, tsconfig)
- Turborepo for build orchestration and caching
- pnpm for fast, disk-efficient dependency management
- Shared packages enable single-source adapter interfaces and types

**Option B: Mastra standalone project**
- `create-mastra` scaffolds a standalone Mastra project
- Great for pure agent/AI apps, but doesn't handle PWA or CLI layers
- Loses shared-code benefits of a monorepo

**Option C: Plain pnpm workspaces (no Turborepo)**
- Same monorepo structure but without build caching or task orchestration
- Simpler setup but less scalable for 3 apps + 3 packages

### Selected Starter: Turborepo + pnpm workspaces

**Rationale for Selection:**
- Three independent apps sharing core pipeline code is the primary monorepo use case
- Mastra integrates as a dependency in `apps/api`, not as the project scaffold - cleaner separation of framework vs project structure
- Vite + vite-plugin-pwa in `apps/web` provides React SPA with zero-config PWA
- CLI in `apps/cli` is a simple TypeScript entrypoint
- Turborepo build caching speeds up iteration across 6 packages
- Docker can build each app independently from the monorepo
- Each layer independently deployable (NFR15)

**Initialization Command:**

```bash
pnpm dlx create-turbo@latest
```

**Monorepo Structure:**

```
apps/
  api/          → TypeScript API server (Mastra integrated as dependency)
  web/          → React PWA (Vite + vite-plugin-pwa)
  cli/          → Wikipedia ingestion CLI
packages/
  core/         → RAG pipeline, adapter interfaces, types
  qdrant/       → Qdrant client wrapper
  tsconfig/     → Shared TypeScript configs
```

**Architectural Decisions Provided by Starter:**

| Decision | Choice |
|----------|--------|
| Language & Runtime | TypeScript 5.x, Node.js |
| Package Manager | pnpm (workspaces) |
| Build Orchestration | Turborepo |
| Frontend Build | Vite |
| PWA Support | vite-plugin-pwa (Workbox) |
| Linting | ESLint (shared config) |
| Code Organization | apps/ + packages/ convention |
| TypeScript Config | Shared base tsconfig in packages/ |

**Note:** Project initialization using this command should be the first implementation story.

## Core Architectural Decisions

### Decision Priority Analysis

**Critical Decisions (Block Implementation):**
- Monorepo structure (Turborepo + pnpm) - decided in Step 3
- RAG pipeline adapter interface design - decided (see Patterns step)
- Streaming protocol (SSE) - decided via PRD
- Vector DB schema (collection-per-strategy) - decided

**Important Decisions (Shape Architecture):**
- API design (REST + SSE), error format (RFC 9457), endpoint structure
- Frontend state (Zustand), styling (Shadcn/ui + Tailwind), routing (React Router)
- Docker multi-stage builds, logging (Pino + console)

**Deferred Decisions (Post-MVP):**
- Authentication & authorization (Phase 2)
- Qdrant API key + TLS hardening (Phase 2, alongside auth)
- CI/CD pipeline
- Open-source embedding model alternatives

### Data Architecture

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Vector DB | Qdrant (official TS client) | PRD requirement |
| Collection strategy | Separate collection per embedding strategy | Allows re-indexing without deleting existing; naming convention: `wiki-{strategy}-{dump_date}` |
| Collection schema | Vector field (embedding) + Payload field (JSON metadata: article title, section, paragraph position, dump version, embedding model) | Qdrant's native two-field document structure |
| Indexing checkpoint | Local JSON file (`indexing-checkpoint.json`) | Simple, fast resume without Qdrant queries; tracks lastArticleId, articlesProcessed, totalArticles, strategy, dumpFile |
| XML parsing | fast-xml-parser v5.3.4 | Actively maintained, fast streaming support; xml2js last committed 3 years ago |

### Authentication & Security

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Authentication | None for MVP | Local Docker deployment; proper auth deferred to Phase 2 |
| API key management | Mastra's environment variable management + `.env` files | All LLM/embedding calls server-side only; PWA never touches API keys |
| Qdrant security | Pin >= v1.9.0 (using v1.16.3); document CVE-2024-3829 and CVE-2024-2221 mitigations | Critical file upload vulnerability patched in v1.9.0 |
| Input sanitization | Validate at API boundary (trim, length limit, strip control chars) | Check for Qdrant-specific vulnerabilities during implementation |

### API & Communication Patterns

| Decision | Choice | Rationale |
|----------|--------|-----------|
| API style | REST + SSE | REST for CRUD operations, SSE for streaming responses; practical and well-supported |
| Error format | RFC 9457 Problem Details (`{ type, title, status, detail }`) | Updated standard (supersedes RFC 7807) |
| Endpoint structure | Noun-based REST: `GET /api/techniques`, `POST /api/inquiry`, `POST /api/comparison`, `GET /api/scores/:queryId`, `GET /api/health` | Proper REST conventions; no verbs in paths |
| Streaming | SSE for single query; SSE for each stream in comparison mode | Two independent SSE connections in comparison mode |

### Frontend Architecture

| Decision | Choice | Rationale |
|----------|--------|-----------|
| State management | Zustand | Lightweight, minimal boilerplate, handles concurrent stream updates cleanly |
| Styling | Shadcn/ui + Tailwind CSS | Accessible component primitives + rapid development; not locked in |
| Routing | React Router | Standard, well-known; simple SPA with 2-3 routes |
| Build tool | Vite + vite-plugin-pwa | Decided in Step 3 |

### Infrastructure & Deployment

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Docker builds | Multi-stage builds per app | Turborepo `prune` for minimal Docker context; each app's concerns isolated |
| Qdrant image | `qdrant/qdrant:v1.16.3` (pinned) | Latest stable; well above v1.9.0 CVE fix threshold |
| Logging | Pino v10.2.0 for API (structured JSON), console for CLI | Structured logs in API, human-readable progress in CLI |
| Health checks | `GET /api/health` (verifies Qdrant connectivity) + Qdrant built-in health endpoint | Docker health checks for API and Qdrant containers |

### Decision Impact Analysis

**Implementation Sequence:**
1. Monorepo scaffold (Turborepo + pnpm)
2. Shared packages (core pipeline interfaces, Qdrant wrapper, tsconfig)
3. API server with health check + Qdrant connection
4. Data CLI with Wikipedia parsing + indexing
5. PWA shell with routing, state, and styling
6. Pipeline integration (adapters, streaming, quality scoring)

**Cross-Component Dependencies:**
- `packages/core` defines adapter interfaces → consumed by `apps/api` and `apps/cli`
- `packages/qdrant` wraps Qdrant client → consumed by `apps/api` and `apps/cli`
- API endpoint contracts → consumed by `apps/web` (SSE client)
- Collection naming convention → shared between CLI (writes) and API (reads)

## Implementation Patterns & Consistency Rules

### Critical Conflict Points Identified

18 areas where implementation inconsistency could occur, all resolved below.

### Naming Patterns

**Qdrant Payload Fields:**
- `camelCase` for all payload metadata fields
- Examples: `articleTitle`, `sectionName`, `paragraphPosition`, `dumpVersion`, `embeddingModel`

**API JSON Fields:**
- `camelCase` throughout request/response bodies
- Prefer single-word nouns where possible
- Examples: `technique`, `query`, `status`, `scores`

**File Naming:**
- `kebab-case` for all files: `rag-pipeline.ts`, `query-adapter.ts`, `technique-selector.tsx`
- No exceptions for React components: `technique-selector.tsx` not `TechniqueSelector.tsx`

**TypeScript Naming:**

| Element | Convention | Example |
|---------|-----------|---------|
| Interfaces/Types | `PascalCase`, no `I` prefix | `QueryAdapter`, `PipelineConfig` |
| Functions/Variables | `camelCase` | `executeQuery`, `techniqueList` |
| Constants | `UPPER_SNAKE_CASE` | `MAX_QUERY_LENGTH`, `DEFAULT_TECHNIQUE` |
| Enums | `PascalCase` + `PascalCase` members | `RagTechnique.NaiveRag`, `PipelineStage.PreRetrieval` |

**API Endpoints:**
- Noun-based REST, plural resources
- Route params in `camelCase`
- Examples: `GET /api/techniques`, `POST /api/inquiry`, `GET /api/scores/:queryId`

### Structure Patterns

**Test Placement:**
- Top-level `tests/` folder per package/app
- Mirror source structure inside `tests/`
- Example: `apps/api/tests/routes/inquiry.test.ts` tests `apps/api/src/routes/inquiry.ts`

**React Component Organization (apps/web):**
- By feature: `features/query/`, `features/comparison/`, `features/techniques/`
- Shared UI primitives in `components/`
- Route pages in `pages/`

**Pipeline Module Organization (packages/core):**
- `stages/` for individual stage adapters (reusable building blocks)
- `techniques/` for technique definitions that compose stages
- Example:
  ```
  packages/core/
    stages/
      query/
      pre-retrieval/
      retrieval/
      post-retrieval/
      generation/
    techniques/
      naive-rag/
      corrective-rag/
      hyde/
    types/
  ```

**Shared Types:**
- All shared types in `packages/core/types/`
- Adapter interfaces, pipeline types, and API contracts co-located here

### Format Patterns

**API Response Wrapper:**
- All responses wrapped: `{ data: { ... }, meta: { timestamp, requestId } }`
- Collections include count: `{ data: [...], meta: { timestamp, requestId, count } }`
- Errors follow RFC 9457: `{ type, title, status, detail }`

**SSE Event Format:**
- Typed events using SSE `event:` field
- Events: `response.chunk`, `quality.score`, `stream.done`, `stream.error`
- Each event carries JSON `data:` payload
- Example:
  ```
  event: response.chunk
  data: {"content": "The Roman Empire..."}

  event: quality.score
  data: {"dimension": "contextRelevance", "score": 0.85}

  event: stream.done
  data: {"requestId": "uuid", "timestamp": "2026-02-08T14:30:00Z"}
  ```

**Date/Time Format:**
- ISO 8601 strings everywhere: `"2026-02-08T14:30:00Z"`

**ID Format:**
- UUID v4 for all identifiers (query IDs, request IDs, score IDs)

### Communication Patterns

**SSE Event Naming:**
- `dot.notation`: `response.chunk`, `quality.score`, `stream.done`, `stream.error`

**Zustand Store Organization:**
- Multiple stores per concern: `useQueryStore`, `useComparisonStore`, `useTechniqueStore`
- Each store independently managed
- Comparison store handles two independent stream states

**Loading/Streaming State:**
- Single `status` enum per async operation: `idle | loading | streaming | complete | error`
- No boolean flags for state tracking

### Process Patterns

**Error Handling:**
- Pipeline stages throw typed errors
- API layer catches at boundary and maps to RFC 9457 responses
- SSE streams send `stream.error` event then close the connection
- Typed error classes per domain: `PipelineError`, `QdrantError`, `EmbeddingError`

**Logging:**
- Structured JSON logging with correlation via `requestId` (UUID v4)
- All logs within a request include `requestId`
- Log levels: pipeline stage entry/exit at `info`, Qdrant queries at `debug`, errors at `error`
- API uses Pino, CLI uses console

### Enforcement Guidelines

**All AI Agents MUST:**
- Follow `kebab-case` file naming with no exceptions
- Use the wrapped response format `{ data, meta }` for all API responses
- Include `requestId` in all API logs
- Place tests in top-level `tests/` directory, not co-located
- Use `status` enum for all async state, never boolean flags
- Throw typed errors in pipeline stages, catch at API boundary only

**Anti-Patterns:**
- `IQueryAdapter` (no `I` prefix on interfaces)
- `TechniqueSelector.tsx` (use `technique-selector.tsx`)
- `isLoading` boolean flags (use `status` enum)
- Co-located `.test.ts` files (use `tests/` directory)
- Bare `try/catch` inside pipeline stages (throw to boundary)
- `snake_case` in JSON payloads or Qdrant fields (use `camelCase`)

## Project Structure & Boundaries

### Complete Project Directory Structure

```
labs-wikirag/
├── .env.example
├── .gitignore
├── docker-compose.yml
├── turbo.json
├── pnpm-workspace.yaml
├── package.json
├── README.md
│
├── apps/
│   ├── api/
│   │   ├── Dockerfile
│   │   ├── package.json
│   │   ├── tsconfig.json
│   │   ├── .env.example
│   │   ├── src/
│   │   │   ├── index.ts                          # Server entry point
│   │   │   ├── config/
│   │   │   │   └── environment.ts                 # Mastra env management
│   │   │   ├── routes/
│   │   │   │   ├── techniques.ts                  # GET /api/techniques (FR1, FR4)
│   │   │   │   ├── inquiry.ts                     # POST /api/inquiry + SSE (FR2, FR6, FR7)
│   │   │   │   ├── comparison.ts                  # POST /api/comparison + SSE (FR10, FR11, FR12)
│   │   │   │   ├── scores.ts                      # GET /api/scores/:queryId (FR13, FR14, FR15)
│   │   │   │   └── health.ts                      # GET /api/health
│   │   │   ├── middleware/
│   │   │   │   ├── error-handler.ts               # RFC 9457 error mapping
│   │   │   │   ├── request-id.ts                  # UUID v4 correlation
│   │   │   │   └── sanitizer.ts                   # Input validation (NFR10)
│   │   │   ├── services/
│   │   │   │   ├── pipeline-executor.ts            # Orchestrates pipeline stages (FR2)
│   │   │   │   ├── technique-registry.ts           # Discovers/registers techniques (FR4)
│   │   │   │   ├── stream-manager.ts               # SSE stream lifecycle
│   │   │   │   └── scoring.ts                      # LLM-as-Judge quality scoring (FR13)
│   │   │   └── logger.ts                           # Pino structured logging
│   │   └── tests/
│   │       ├── routes/
│   │       ├── services/
│   │       └── middleware/
│   │
│   ├── web/
│   │   ├── Dockerfile
│   │   ├── package.json
│   │   ├── tsconfig.json
│   │   ├── vite.config.ts
│   │   ├── tailwind.config.ts
│   │   ├── index.html
│   │   ├── public/
│   │   │   └── manifest.json                      # PWA manifest (FR26)
│   │   ├── src/
│   │   │   ├── main.tsx                            # App entry point
│   │   │   ├── app.tsx                             # Router setup
│   │   │   ├── pages/
│   │   │   │   ├── query-page.tsx                  # Single query mode (FR27)
│   │   │   │   └── comparison-page.tsx             # Comparison mode (FR27)
│   │   │   ├── features/
│   │   │   │   ├── query/
│   │   │   │   │   ├── query-input.tsx             # Query submission (FR6)
│   │   │   │   │   ├── response-stream.tsx         # Streaming display (FR7)
│   │   │   │   │   └── score-display.tsx           # Quality scores (FR14)
│   │   │   │   ├── comparison/
│   │   │   │   │   ├── comparison-panel.tsx        # Side-by-side layout (FR11)
│   │   │   │   │   └── comparison-controls.tsx     # Dual technique selection
│   │   │   │   └── techniques/
│   │   │   │       └── technique-selector.tsx      # Dropdown selection (FR1, FR28)
│   │   │   ├── components/
│   │   │   │   └── ui/                             # Shadcn/ui primitives
│   │   │   ├── stores/
│   │   │   │   ├── query-store.ts                  # useQueryStore
│   │   │   │   ├── comparison-store.ts             # useComparisonStore
│   │   │   │   └── technique-store.ts              # useTechniqueStore
│   │   │   ├── services/
│   │   │   │   └── sse-client.ts                   # SSE connection handler
│   │   │   ├── styles/
│   │   │   │   └── globals.css                     # Tailwind base
│   │   │   └── types/
│   │   │       └── api.ts                          # API response types
│   │   └── tests/
│   │       ├── features/
│   │       ├── stores/
│   │       └── services/
│   │
│   └── cli/
│       ├── package.json
│       ├── tsconfig.json
│       ├── src/
│       │   ├── index.ts                            # CLI entry point
│       │   ├── commands/
│       │   │   └── index-wiki.ts                   # Index command (FR16)
│       │   ├── parsers/
│       │   │   └── wiki-xml-parser.ts              # fast-xml-parser streaming (FR17, FR20)
│       │   ├── embedders/
│       │   │   └── paragraph-embedder.ts           # Per-paragraph embedding (FR18)
│       │   ├── inserters/
│       │   │   └── qdrant-inserter.ts              # Batch insert to Qdrant (FR19)
│       │   └── checkpoint/
│       │       └── checkpoint-manager.ts           # Pause/resume tracking (FR21)
│       └── tests/
│           ├── commands/
│           ├── parsers/
│           └── embedders/
│
├── packages/
│   ├── core/
│   │   ├── package.json
│   │   ├── tsconfig.json
│   │   ├── src/
│   │   │   ├── index.ts                            # Package exports
│   │   │   ├── stages/
│   │   │   │   ├── query/
│   │   │   │   │   └── query-adapter.ts            # Query stage interface + impls
│   │   │   │   ├── pre-retrieval/
│   │   │   │   │   └── pre-retrieval-adapter.ts    # Pre-retrieval interface + impls
│   │   │   │   ├── retrieval/
│   │   │   │   │   └── retrieval-adapter.ts        # Retrieval interface + impls
│   │   │   │   ├── post-retrieval/
│   │   │   │   │   └── post-retrieval-adapter.ts   # Post-retrieval interface + impls
│   │   │   │   └── generation/
│   │   │   │       └── generation-adapter.ts       # Generation interface + impls
│   │   │   ├── techniques/
│   │   │   │   ├── naive-rag.ts                    # Naive RAG composition
│   │   │   │   ├── simple-rag.ts                   # Simple RAG composition
│   │   │   │   ├── corrective-rag.ts               # Corrective RAG composition
│   │   │   │   ├── hyde.ts                         # HyDE composition
│   │   │   │   └── self-rag.ts                     # Self-RAG composition
│   │   │   ├── pipeline/
│   │   │   │   └── pipeline-runner.ts              # Executes technique's stage sequence
│   │   │   ├── scoring/
│   │   │   │   └── quality-scorer.ts               # Quality dimension definitions
│   │   │   └── types/
│   │   │       ├── adapters.ts                     # Stage adapter interfaces (FR3, FR5)
│   │   │       ├── techniques.ts                   # Technique type + registry types (FR4)
│   │   │       ├── pipeline.ts                     # Pipeline execution types
│   │   │       ├── scoring.ts                      # Quality score types
│   │   │       ├── api.ts                          # Shared API contract types
│   │   │       └── qdrant.ts                       # Qdrant payload/collection types
│   │   └── tests/
│   │       ├── stages/
│   │       ├── techniques/
│   │       └── pipeline/
│   │
│   ├── qdrant/
│   │   ├── package.json
│   │   ├── tsconfig.json
│   │   ├── src/
│   │   │   ├── index.ts                            # Package exports
│   │   │   ├── client.ts                           # Qdrant client wrapper (FR23)
│   │   │   ├── collections.ts                      # Collection management + naming
│   │   │   └── search.ts                           # Similarity search operations (FR24, FR25)
│   │   └── tests/
│   │       └── client.test.ts
│   │
│   └── tsconfig/
│       ├── package.json
│       ├── base.json                               # Shared base TypeScript config
│       ├── node.json                               # Node.js (API, CLI) config
│       └── react.json                              # React (PWA) config
```

### Architectural Boundaries

**API Boundaries:**
- PWA → API: REST + SSE over HTTP. PWA never directly accesses Qdrant or LLM providers.
- API → Qdrant: Via `packages/qdrant` client wrapper. No raw Qdrant calls in route handlers.
- API → LLM: Via Mastra/LangChain within pipeline stages. All API keys server-side.
- CLI → Qdrant: Via `packages/qdrant` client wrapper (same as API).
- CLI → OpenAI: Direct for embedding generation during indexing.

**Package Boundaries:**
- `packages/core` owns all pipeline logic. `apps/api` orchestrates it but doesn't implement stages.
- `packages/qdrant` owns all vector DB communication. No direct `@qdrant/js-client-rest` usage in apps.
- `packages/core/types` is the single source of truth for shared type contracts.

**Data Boundaries:**
- Qdrant is the only data store. No other databases.
- Collection naming convention (`wiki-{strategy}-{dump_date}`) enforced in `packages/qdrant/collections.ts`.
- Checkpoint file (`indexing-checkpoint.json`) managed only by `apps/cli`.

### Requirements to Structure Mapping

| FR Category | Primary Location | Integration Points |
|-------------|-----------------|-------------------|
| RAG Pipeline (FR1-5) | `packages/core/stages/`, `packages/core/techniques/` | Consumed by `apps/api/services/pipeline-executor.ts` |
| Query & Response (FR6-9) | `apps/api/routes/inquiry.ts`, `apps/web/features/query/` | SSE stream between API and PWA |
| Comparison Mode (FR10-12) | `apps/api/routes/comparison.ts`, `apps/web/features/comparison/` | Two parallel SSE streams |
| Quality Scoring (FR13-15) | `packages/core/scoring/`, `apps/api/services/scoring.ts` | Async scoring after generation |
| Data Ingestion (FR16-22) | `apps/cli/` | Uses `packages/qdrant` for insertion |
| Vector Storage (FR23-25) | `packages/qdrant/` | Consumed by `apps/api` and `apps/cli` |
| Web Application (FR26-29) | `apps/web/` | Connects to API via SSE + REST |
| Infrastructure (FR30-34) | `docker-compose.yml`, `Dockerfile` per app | Turborepo `prune` for Docker builds |

### Data Flow

```
[User Query] → PWA → POST /api/inquiry → API
    → technique-registry (resolve technique)
    → pipeline-runner (execute stages in sequence)
        → query adapter → pre-retrieval adapter → retrieval adapter (Qdrant)
        → post-retrieval adapter → generation adapter (LLM)
    → SSE stream ← response chunks → PWA (render)
    → scoring service (async) → SSE ← quality scores → PWA (display)
```

```
[Wikipedia Dump] → CLI
    → wiki-xml-parser (streaming) → paragraph extraction
    → paragraph-embedder (OpenAI) → vector creation
    → qdrant-inserter (batch upsert) → Qdrant collection
    → checkpoint-manager (track progress)
```

## Architecture Validation Results

### Coherence Validation

**Decision Compatibility:**
All technology choices are compatible. Turborepo + pnpm + TypeScript is a proven combination. Express 5 + Mastra + SSE work together without conflicts. Qdrant v1.16.3 official TS client is stable. Vite + React + Tailwind + Shadcn/ui is standard. Vitest shares Vite's transform pipeline for fast tests.

**Pattern Consistency:**
`camelCase` flows consistently from Qdrant payloads through API JSON to TypeScript code to Zustand stores. `kebab-case` file naming is uniform. SSE `dot.notation` events are intentionally distinct from code naming. RFC 9457 errors and `{ data, meta }` success responses don't overlap.

**Structure Alignment:**
Monorepo structure supports independent deployment (NFR15). `packages/core` centralizes pipeline logic. `packages/qdrant` prevents divergent DB access patterns. Test directories mirror source as specified.

### Requirements Coverage Validation

**Functional Requirements:** All 34 FRs mapped to specific files/directories. No gaps.

**Non-Functional Requirements:** All 18 NFRs addressed architecturally. No gaps.

### Gap Analysis Results

**Critical Gaps:** None.

**Resolved Gaps (2):**

| Decision | Choice | Version |
|----------|--------|---------|
| Testing framework | Vitest | v4.0.18 |
| API HTTP framework | Express 5 | v5.2.1 |

### Architecture Completeness Checklist

**Requirements Analysis**
- [x] Project context thoroughly analyzed
- [x] Scale and complexity assessed (Medium-High)
- [x] Technical constraints identified (TypeScript, Mastra, Qdrant, OpenAI)
- [x] Cross-cutting concerns mapped (5 identified)

**Architectural Decisions**
- [x] Critical decisions documented with versions
- [x] Technology stack fully specified
- [x] Integration patterns defined (REST + SSE, package boundaries)
- [x] Performance considerations addressed (streaming, async scoring)

**Implementation Patterns**
- [x] Naming conventions established (18 conflict points resolved)
- [x] Structure patterns defined (tests, components, modules)
- [x] Communication patterns specified (SSE events, Zustand stores)
- [x] Process patterns documented (error handling, logging, state)

**Project Structure**
- [x] Complete directory structure defined
- [x] Component boundaries established
- [x] Integration points mapped
- [x] Requirements to structure mapping complete

### Architecture Readiness Assessment

**Overall Status:** READY FOR IMPLEMENTATION

**Confidence Level:** High

**Key Strengths:**
- Clear plugin architecture with stages/techniques separation
- Strong boundary enforcement via monorepo packages
- All 34 FRs and 18 NFRs mapped to specific code locations
- 18 consistency rules prevent implementation drift
- Independent deployment achieved through Docker multi-stage builds

**Areas for Future Enhancement:**
- Authentication & authorization (Phase 2)
- CI/CD pipeline definition
- Qdrant API key + TLS hardening
- Open-source embedding alternatives

### Implementation Handoff

**First Implementation Priority:**
```bash
pnpm dlx create-turbo@latest
```

**AI Agent Guidelines:**
- Follow all architectural decisions exactly as documented
- Use implementation patterns consistently across all components
- Respect project structure and boundaries
- Refer to this document for all architectural questions
