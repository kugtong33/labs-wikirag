# Sprint Change Proposal - Pluggable Embedding Providers

**Date:** 2026-02-13
**Project:** labs-wikirag
**Change Type:** Feature Acceleration (Phase 2 → MVP)
**Scope Classification:** Moderate
**Status:** Approved by kugtong33

---

## Executive Summary

### Change Overview

During Epic 1 pre-implementation cost analysis, we discovered that embedding the full English Wikipedia via OpenAI would cost $132-$858 one-time (per embedding strategy). This presented an opportunity to accelerate a Phase 2 feature (open-source embedding alternatives) into MVP, creating a **pluggable embedding provider architecture** that:

- Eliminates vendor lock-in and per-token cost barriers
- Enables embedding quality benchmarking across providers (OpenAI vs local LLMs)
- Validates the plugin architecture pattern before building 5 RAG technique epics
- Extends product differentiator from "RAG technique comparison" to "RAG + embedding comparison"

### Impact Assessment

**Timeline:** +1-2 weeks to Epic 1 (4 additional stories via new Epic 1.5)
**Risk Level:** Low (extends proven adapter pattern, isolated to indexing layer)
**Business Value:** High (cost savings, quality benchmarking, architectural validation)
**MVP Status:** Enhanced (scope expansion, not reduction)

---

## Issue Summary

### Discovery Context

**When:** Epic 1 Story 1.4 (Embedding Generation) pre-implementation planning
**What:** Cost analysis for embedding full English Wikipedia (6.6B tokens)
**Finding:** OpenAI embedding costs range from $132 (text-embedding-3-small) to $858 (text-embedding-3-large) per index

### Opportunity Statement

WikiRAG's core value proposition is **comparing techniques side-by-side with benchmarking**. Currently, Epic 1 Story 1.4 hardcodes OpenAI embeddings, which:

- Prevents comparing embedding quality across providers (OpenAI vs local models)
- Creates cost barriers to experimentation ($132-$858 per re-index)
- Locks users into a single vendor
- Misses opportunity to validate plugin architecture early

By making embedding providers **pluggable** (similar to RAG technique adapters), we:

- Enable embedding provider benchmarking alongside RAG technique benchmarking
- Eliminate per-token costs for users preferring local models
- Validate plugin architecture in a second dimension (builds confidence for Epics 2-7)
- Pull forward Phase 2 capability that enhances MVP value

### Strategic Rationale

**This is feature acceleration, not a problem fix.**

- **Aligned with PRD:** "Plugin architecture supports interchangeable modules at each pipeline stage" (Success Criteria)
- **Aligned with Vision:** Phase 2 already included "Open-source embedding model alternatives"
- **Aligned with Personas:** "Evaluator" persona (Dr. Priya) needs empirical evidence across multiple dimensions
- **Architectural Consistency:** Extends proven adapter pattern from RAG techniques to embedding providers

---

## Epic Impact Analysis

### Epic Changes Summary

| Epic | Change Type | Specific Changes |
|------|-------------|------------------|
| **Epic 1** | Modify existing stories | • Story 1.4: Add embedding provider abstraction<br>• Story 1.5: Add `--embedding-provider` CLI flag |
| **Epic 1.5** | **NEW EPIC** | **"Local Embedding Providers"**<br>• Story 1.5.1: Embedding Provider Abstraction Layer<br>• Story 1.5.2: Local LLM Infrastructure Setup<br>• Story 1.5.3: Local Model Provider Implementations<br>• Story 1.5.4: Provider Benchmarking & Quality Comparison |
| **Epic 2-7** | No changes | Epics consume embeddings from Qdrant, don't care about provider |

### Epic 1: Modifications Required

**Story 1.4: Embedding Generation and Qdrant Insertion**

**Current Status:** Done (but needs refactoring)

**Required Changes:**
- Extract embedding logic to provider interface in `packages/embeddings`
- Implement OpenAI provider (move existing code)
- Update acceptance criteria to include provider abstraction
- Add `embeddingProvider` field to Qdrant payload

**Story 1.5: Indexing CLI with Checkpoint and Resume**

**Current Status:** In-progress

**Required Changes:**
- Add `--embedding-provider` CLI flag (e.g., `--embedding-provider openai` or `--embedding-provider gpt-oss-14b`)
- Update checkpoint tracking to include provider
- Update collection naming to include provider context (e.g., `wiki-paragraph-openai-20260213`)

### Epic 1.5: New Epic Details

**Epic Goal:** Operators can use local LLM embedding models as an alternative to OpenAI, eliminating per-token costs and enabling embedding quality benchmarking across providers.

**FRs Covered:** FR39 (provider extensibility), FR40 (provider discovery), FR41 (provider selection)

**Stories:**

#### Story 1.5.1: Embedding Provider Abstraction Layer

**Goal:** Create pluggable provider architecture with clear interfaces

**Key Deliverables:**
- `packages/embeddings` package with provider interface
- Provider registry for discovery and registration
- OpenAI provider implementation (refactored from Story 1.4)

**Acceptance Criteria:**
- Clear `EmbeddingProvider` interface with `embed()`, `getModelInfo()`, `validateConfig()` methods
- Provider registry discovers and registers providers at startup
- Multiple providers can be selected via CLI flag

#### Story 1.5.2: Local LLM Infrastructure Setup

**Goal:** Set up local LLM infrastructure for embedding generation

**Key Deliverables:**
- Ollama (or vLLM) installation and setup
- Local model downloads (gpt-oss:14b, qwen3:14b)
- README documentation for operators

**Acceptance Criteria:**
- Local LLM server accessible via localhost API
- CLI successfully connects and generates embeddings via local provider
- Performance metrics comparable to OpenAI

#### Story 1.5.3: Local Model Provider Implementations

**Goal:** Implement concrete local embedding providers

**Key Deliverables:**
- gpt-oss:14b provider implementation
- qwen3:14b provider implementation
- Ollama API client wrapper

**Acceptance Criteria:**
- Providers implement `EmbeddingProvider` interface
- Providers handle batching, retries, error handling
- CLI can select between `openai`, `gpt-oss-14b`, `qwen3-14b`
- Separate Qdrant collections created per provider

#### Story 1.5.4: Provider Benchmarking & Quality Comparison

**Goal:** Benchmark embedding provider performance and quality

**Key Deliverables:**
- Benchmarking utilities for performance comparison
- Quality comparison queries for retrieval evaluation
- Provider comparison table in README

**Acceptance Criteria:**
- Performance metrics for each provider (embeddings/sec, latency, memory)
- Quality comparison results (precision, recall, relevance)
- Documentation helps operators choose appropriate provider

---

## Artifact Conflict Analysis

### PRD.md Updates Required

**1. Functional Requirements - Modifications:**

- **FR18 (modify):** "The CLI can create vector embeddings for each paragraph using the **selected** embedding provider (OpenAI or local LLM)" (was: "configured embedding provider")

**2. Functional Requirements - Additions:**

- **FR39 (new):** Contributors can add new embedding provider modules by implementing provider interfaces without modifying core indexing code
- **FR40 (new):** The system can register and discover embedding provider modules at startup
- **FR41 (new):** Operators can select an embedding provider via CLI parameters

**3. Success Criteria - Technical Success (add):**

- Embedding providers are pluggable via adapter interfaces (OpenAI + local LLM options)
- Operators can select embedding provider via CLI without code changes

**4. Product Scope - MVP (modify Data Ingestion row):**

- Add: "pluggable embedding providers (OpenAI + local LLM)"

**5. Growth Phase (Phase 2) - Modify:**

- REMOVE: "Open-source embedding model alternatives" (moved to MVP)
- ADD: "Embedding provider comparison mode (side-by-side quality benchmarking in PWA)"

### Architecture.md Updates Required

**1. Core Architectural Decisions - Data Architecture (add rows):**

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Embedding providers | Pluggable provider abstraction with registry | Extends adapter pattern from RAG techniques; OpenAI + local LLM options; eliminates vendor lock-in |
| Provider selection | CLI flag `--embedding-provider <name>` | Operators choose at indexing time; checkpoint tracks provider |
| Local LLM runtime | Ollama (primary), supports vLLM/llama.cpp | Mature, GPU-accelerated, runs on operator hardware |

**2. Project Structure - Add Package:**

```
packages/
  ├── embeddings/
  │   ├── src/
  │   │   ├── providers/
  │   │   │   ├── base/
  │   │   │   │   ├── embedding-provider.ts       # Provider interface
  │   │   │   │   └── provider-registry.ts        # Registry
  │   │   │   ├── openai/
  │   │   │   │   └── openai-provider.ts          # OpenAI implementation
  │   │   │   ├── local/
  │   │   │   │   ├── gpt-oss-provider.ts         # gpt-oss:14b
  │   │   │   │   ├── qwen-provider.ts            # qwen3:14b
  │   │   │   │   └── ollama-client.ts            # Ollama API client
  │   │   ├── benchmarking/
  │   │   │   └── provider-benchmark.ts           # Performance comparison
  │   │   └── types/
  │   └── tests/
```

**3. Requirements to Structure Mapping (add row):**

| FR Category | Primary Location | Integration Points |
|-------------|-----------------|-------------------|
| Embedding Providers (FR39-41) | `packages/embeddings/` | Provider interfaces, registry, implementations, benchmarking |

### Epics.md Updates Required

**1. Insert new Epic 1.5** (between Epic 1 and Epic 2) - see "Epic 1.5: New Epic Details" section above

**2. Modify Epic 1 Story 1.4 acceptance criteria** - see "Epic 1: Modifications Required" section above

**3. Modify Epic 1 Story 1.5 acceptance criteria** - see "Epic 1: Modifications Required" section above

### README.md Updates Required

**Add section:** "Local LLM Setup for Embedding Providers"
- Ollama installation instructions
- Model download commands
- CLI usage examples with `--embedding-provider` flag
- Provider comparison table (cost, speed, quality, hardware requirements)

---

## Path Forward Evaluation

### Options Considered

#### Option 1: Direct Adjustment (SELECTED)

**Approach:** Add new Epic 1.5 + modify Epic 1 stories for provider abstraction

**Effort:** Medium (4 new stories, refactor 2 existing)
**Risk:** Low (proven adapter pattern, isolated impact)
**Timeline:** +1-2 weeks to Epic 1

**Pros:**
- Validates plugin architecture early (confidence for Epics 2-7)
- Enables embedding benchmarking (aligned with product vision)
- Eliminates vendor lock-in and cost barriers
- Extends product differentiator (breadth + comparison)

**Cons:**
- Extends Epic 1 timeline
- Adds infrastructure complexity (local LLM setup)

**Verdict:** ✅ **RECOMMENDED** - High value for acceptable timeline impact

#### Option 2: Defer to Phase 2

**Approach:** Keep OpenAI only for MVP, add providers in Phase 2

**Effort:** N/A
**Risk:** Medium (creates technical debt)

**Pros:**
- No MVP timeline impact

**Cons:**
- ❌ Incurs $132-$858 cost for MVP indexing
- ❌ Misses opportunity to validate architecture early
- ❌ Creates technical debt (hardcoded provider requires later refactoring)
- ❌ Doesn't enable embedding benchmarking for MVP users

**Verdict:** ❌ **REJECTED** - Cost and technical debt outweigh timeline savings

#### Option 3: Local Only (Remove OpenAI)

**Approach:** Use only local LLMs, remove OpenAI

**Effort:** N/A
**Risk:** High (removes proven quality baseline)

**Pros:**
- Zero per-token costs

**Cons:**
- ❌ OpenAI embeddings are proven quality baseline
- ❌ Removes comparison capability (need both for benchmarking)
- ❌ Increases setup friction (users need GPU)

**Verdict:** ❌ **REJECTED** - Need both providers for comparison

---

## Recommended Approach Details

### Selected: Option 1 - Direct Adjustment

**Implementation Sequence:** Epic 1 modifications → Epic 1.5 → Epic 2

**Rationale:**

1. **Architectural Consistency:**
   - Extends proven adapter pattern from RAG techniques to embedding providers
   - Same registry + discovery mechanism (code reuse)
   - Validates pattern before building 5 more RAG technique epics

2. **Risk Profile:**
   - Low technical risk (proven pattern, mature local LLM tools)
   - Isolated impact (indexing layer only, no API/PWA changes)
   - Qdrant schema already supports multiple embedding models

3. **Business Value:**
   - Eliminates $132-$858 per index cost barrier
   - Enables embedding quality benchmarking (core to product mission)
   - Differentiates from competitors (most RAG demos use single provider)
   - Aligns with "Evaluator" persona needs

4. **Timeline Impact:**
   - +1-2 weeks to Epic 1 timeline (acceptable for value gained)
   - No impact to Epic 2-7 (sequential completion still works)
   - Accelerates Phase 2 feature, reducing future work

---

## Implementation Plan

### Phase 1: Epic 1 Modifications (Week 1)

**Goal:** Refactor existing embedding code to use provider abstraction

**Tasks:**
1. Create `packages/embeddings` package structure
2. Define `EmbeddingProvider` interface
3. Implement provider registry
4. Refactor Story 1.4: Extract OpenAI embedding code to provider implementation
5. Update Story 1.5: Add `--embedding-provider` CLI flag
6. Update checkpoint tracking to include provider
7. Test with OpenAI provider (ensure no regression)

**Deliverables:**
- `packages/embeddings` with base provider interface and registry
- OpenAI provider implementation (refactored from existing code)
- Updated CLI with provider selection flag
- All Epic 1 tests passing

### Phase 2: Epic 1.5 - Local Infrastructure (Week 2)

**Goal:** Set up local LLM runtime and infrastructure

**Tasks:**
1. Install and configure Ollama (or vLLM)
2. Download local embedding models (gpt-oss:14b, qwen3:14b)
3. Create Ollama API client wrapper
4. Implement provider registration and discovery
5. Document local LLM setup in README

**Deliverables:**
- Local LLM runtime operational
- Ollama API client wrapper in `packages/embeddings`
- README section for local LLM setup
- Provider registry discovers local providers

### Phase 3: Epic 1.5 - Local Providers (Week 3)

**Goal:** Implement local embedding provider modules

**Tasks:**
1. Implement gpt-oss:14b provider
2. Implement qwen3:14b provider
3. Add batching, retry logic, error handling
4. Create benchmarking utilities (speed, quality)
5. Test full Wikipedia indexing with local provider

**Deliverables:**
- gpt-oss:14b and qwen3:14b provider implementations
- Provider benchmarking utilities
- Full Wikipedia indexed with at least one local provider
- Performance metrics documented

### Phase 4: Integration & Documentation (Week 4)

**Goal:** Update all planning artifacts and validate complete implementation

**Tasks:**
1. Update PRD.md (FR18 modification, FR39-41 additions, success criteria, scope)
2. Update Architecture.md (new decisions, package structure, requirements mapping)
3. Update Epics.md (Epic 1.5 details, Epic 1 modifications)
4. Update README.md (local LLM setup, provider comparison table)
5. Run full indexing test with OpenAI + 2 local providers
6. Validate Epic 1 + 1.5 acceptance criteria met
7. Mark Epic 1 + 1.5 complete

**Deliverables:**
- All planning artifacts updated
- Provider comparison table in README
- Epic 1 + 1.5 complete and validated
- Ready to proceed to Epic 2

### Dependencies & Sequencing

- Phase 1 **must complete** before Phase 2 (abstraction before implementations)
- Phases 2-3 can partially overlap (infrastructure setup while implementing providers)
- Phase 4 happens after Phase 3 (documentation follows implementation)

---

## Sprint Change Proposal Components

### 1. Issue Summary

**Completed:** See "Issue Summary" section above

### 2. Epic Impact and Artifact Adjustments

**Completed:** See "Epic Impact Analysis" and "Artifact Conflict Analysis" sections above

### 3. Recommended Path Forward with Rationale

**Completed:** See "Recommended Approach Details" section above

### 4. PRD MVP Impact and Action Plan

**MVP Impact:** Enhanced (scope expansion, not reduction)

**MVP Still Delivers:**
- ✅ All 5 RAG techniques (Naive, Simple, Corrective, HyDE, Self-RAG)
- ✅ Full Wikipedia indexed and queryable
- ✅ PWA with single query + comparison mode
- ✅ Quality scoring
- ✅ Plugin architecture for RAG techniques
- ✅ **NEW:** Plugin architecture for embedding providers
- ✅ **NEW:** OpenAI + local LLM provider options

**Action Plan:** See "Implementation Plan" section above

### 5. Agent Handoff Plan

**Change Scope Classification:** Moderate

**Primary Owner:** Development (kugtong33 - solo developer)

**Responsibilities:**
- Implement Epic 1 modifications (Stories 1.4, 1.5)
- Implement Epic 1.5 (4 new stories)
- Update codebase with embedding provider abstraction
- Set up local LLM infrastructure
- Test and validate all changes

**Secondary Owner:** Product Manager Agent (this workflow)

**Responsibilities:**
- Generate Sprint Change Proposal document ✅
- Update PRD.md with approved changes
- Update Architecture.md with approved changes
- Update Epics.md with Epic 1.5 and modified Epic 1 stories
- Track implementation progress

**Deliverables from PM:**
1. ✅ Sprint Change Proposal document (this file)
2. Updated PRD.md with tracked changes
3. Updated Architecture.md with tracked changes
4. Updated Epics.md with Epic 1.5 and modified Epic 1 stories

**Deliverables from Development:**
1. `packages/embeddings/` with provider interfaces and implementations
2. Refactored Story 1.4 using provider abstraction
3. Updated CLI with `--embedding-provider` flag
4. Local LLM infrastructure setup (Ollama/vLLM)
5. gpt-oss:14b and qwen3:14b provider implementations
6. Provider benchmarking utilities
7. README documentation for local LLM setup

**Success Criteria:**
- Epic 1 acceptance criteria met with provider abstraction
- At least 2 embedding providers working (OpenAI + 1 local)
- CLI can select provider via flag
- Full Wikipedia can be indexed with any provider
- Provider comparison benchmarking functional
- Documentation enables operators to set up local LLMs

---

## Approval and Next Steps

### Approval Status

**Approved by:** kugtong33
**Approval Date:** 2026-02-13
**Approval Type:** Explicit approval via Course Correction workflow
**Conditions:** None

### Next Steps

**Immediate (PM Agent):**
1. ✅ Sprint Change Proposal generated
2. Apply approved changes to PRD.md
3. Apply approved changes to Architecture.md
4. Apply approved changes to Epics.md
5. Confirm all planning artifacts updated and consistent

**Implementation (Development):**
1. Complete Epic 1 Story 1.5 (currently in-progress)
2. Begin Epic 1 modifications (refactor Stories 1.4, 1.5)
3. Implement Epic 1.5 stories sequentially
4. Validate Epic 1 + 1.5 complete before Epic 2

**Timeline:**
- Weeks 1-4: Epic 1 modifications + Epic 1.5 implementation
- Week 5+: Epic 2 (Core Query Experience with Naive RAG)

---

## Appendix: Supporting Evidence

### Cost Analysis

**OpenAI Embedding Costs (6.6B tokens for full English Wikipedia):**

| Model | Price per 1M tokens | Total Cost (Standard) | Batch API (50% off) |
|-------|--------------------|-----------------------|---------------------|
| text-embedding-3-small | $0.02 | $132 | $66 |
| text-embedding-3-large | $0.13 | $858 | $429 |
| text-embedding-ada-002 | $0.10 | $660 | $330 |

**Note:** Costs are one-time per index. Re-indexing with different strategies incurs same costs.

### Hardware Specifications

**User's Development Machine:**
- OS: Pop!_OS 24.04 LTS x86_64
- CPU: Intel Core i7-6700K (8 cores @ 4.20 GHz)
- GPU: NVIDIA GeForce GTX 1070 [Discrete]
- Memory: 31.16 GiB
- Storage: 906.94 GiB available

**Capability:** Sufficient for local LLM embedding models (gpt-oss:14b, qwen3:14b)

### Local Model Alternatives

**Identified Models:**
- gpt-oss:14b (14 billion parameters)
- gpt-oss:20b (20 billion parameters)
- qwen3:14b (14 billion parameters)

**Runtime Options:**
- Ollama (primary choice - mature, well-documented)
- vLLM (alternative - optimized inference)
- llama.cpp (alternative - CPU-focused)

### Architectural Precedent

**RAG Technique Adapter Pattern (proven in Epic 2-7 design):**
- 5 pipeline stages (query, pre-retrieval, retrieval, post-retrieval, generation)
- Technique registry discovers and registers modules at startup
- Techniques compose from reusable stage adapters
- New techniques added without modifying core code

**Extension to Embedding Providers:**
- Same registry + discovery pattern
- Same adapter interface approach
- Same extensibility goals
- Validates pattern in second dimension

---

**End of Sprint Change Proposal**

**Generated:** 2026-02-13 via Course Correction Workflow
**Project:** labs-wikirag
**Epic:** 1.5 (New) - Local Embedding Providers
**Status:** Approved - Ready for Implementation
