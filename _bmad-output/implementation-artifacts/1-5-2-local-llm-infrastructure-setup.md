# Story 1-5.2: Local LLM Infrastructure Setup

Status: ready-for-dev

## Story

As an operator,
I want to set up local LLM infrastructure for embedding generation,
So that I can run embedding models on my own hardware without API costs.

## Acceptance Criteria

**Given** I have a machine with GPU support (NVIDIA GTX 1070 or better)
**When** I follow the setup instructions in README.md
**Then** I can install and run Ollama (or equivalent local LLM runtime)
**And** I can pull embedding models (nomic-embed-text, qwen3-embedding)
**And** the local LLM server is accessible via localhost API

**Given** local LLM infrastructure is running
**When** I verify the setup with the provided instructions
**Then** the Ollama health endpoint responds at `http://localhost:11434/`
**And** pulled models appear in `ollama list`

**Given** I want to run Ollama via Docker
**When** I run `docker compose up`
**Then** the Ollama container starts with GPU passthrough alongside Qdrant
**And** model data persists across container restarts

## Scope Boundary

**This story is INFRASTRUCTURE ONLY.** It covers Docker, environment config, and documentation.
All TypeScript provider code (OllamaProvider, health utilities, registry registration, tests) belongs to **Story 1.5.3**.

## Tasks / Subtasks

- [ ] Task 1: Add Ollama service to Docker Compose infrastructure (AC: 1, 3)
  - [ ] Add `ollama` service to docker-compose.yml with GPU passthrough
  - [ ] Configure volume mount for model persistence (`ollama-data`)
  - [ ] Add health check using Ollama API endpoint (`curl -f http://localhost:11434/`)
  - [ ] Ensure Ollama service starts alongside Qdrant
  - [ ] Add `docker-compose.cpu.yml` override for CPU-only fallback (no GPU reservation)

- [ ] Task 2: Update environment configuration for local LLM (AC: 1)
  - [ ] Add `OLLAMA_BASE_URL=http://localhost:11434` to `apps/cli/.env.example`
  - [ ] Add `OLLAMA_BASE_URL=http://localhost:11434` to `apps/api/.env.example`
  - [ ] Add comments documenting available embedding providers and model names

- [ ] Task 3: Update README.md with local LLM setup documentation (AC: 1, 2)
  - [ ] Add "Local Embedding Providers" section to project README.md
  - [ ] Document Ollama installation steps (native install via `curl -fsSL https://ollama.com/install.sh | sh`)
  - [ ] Document Docker-based Ollama setup (`docker compose up ollama`)
  - [ ] Document model pulling: `ollama pull nomic-embed-text` and `ollama pull qwen3-embedding`
  - [ ] Document GPU requirements and setup (NVIDIA GTX 1070+, NVIDIA Container Toolkit for Docker)
  - [ ] Document environment variable configuration (`OLLAMA_BASE_URL`)
  - [ ] Document verification steps: `curl http://localhost:11434/` and `ollama list`
  - [ ] Include model comparison note: nomic-embed-text (274MB, 768 dims) vs qwen3-embedding (639MB-4.7GB, up to 4096 dims)

## Dev Notes

### Docker Compose Pattern

**Existing docker-compose.yml has only Qdrant. Add Ollama alongside it:**
```yaml
services:
  ollama:
    image: ollama/ollama:latest
    ports:
      - "11434:11434"
    volumes:
      - ollama-data:/root/.ollama
    deploy:
      resources:
        reservations:
          devices:
            - driver: nvidia
              count: all
              capabilities: [gpu]
    healthcheck:
      test: ["CMD-SHELL", "curl -f http://localhost:11434/ || exit 1"]
      interval: 10s
      timeout: 5s
      retries: 3
      start_period: 15s

volumes:
  ollama-data:
```

**GPU Passthrough Notes:**
- The `deploy.resources.reservations.devices` section requires Docker Compose v2 with NVIDIA Container Toolkit
- For systems without GPU, provide `docker-compose.cpu.yml` override that removes the `deploy` section
- Usage: `docker compose up` (GPU) or `docker compose -f docker-compose.yml -f docker-compose.cpu.yml up` (CPU)
- Ollama falls back to CPU inference automatically (slower but functional)

### Model Clarification

The epics reference `gpt-oss:14b` and `qwen3:14b` as target models. However, these are general-purpose LLMs, not dedicated embedding models. Use purpose-built embedding models instead:

| Epics Reference | Actual Ollama Model | Size | Dimensions | Notes |
|----------------|---------------------|------|------------|-------|
| `gpt-oss:14b` | `nomic-embed-text` | 274MB | 768 | Outperforms OpenAI ada-002 and text-embedding-3-small |
| `qwen3:14b` | `qwen3-embedding` | 639MB-4.7GB | Up to 4096 | #1 MTEB multilingual; 0.6B/4B/8B variants |

### Ollama API Reference (for documentation)

**Health Check:**
```
GET http://localhost:11434/
Response: "Ollama is running"
```

**List Local Models:**
```
GET http://localhost:11434/api/tags
Response: { "models": [{ "name": "nomic-embed-text:latest", ... }] }
```

**Native Embedding API:**
```
POST http://localhost:11434/api/embed
Content-Type: application/json

{
  "model": "nomic-embed-text",
  "input": ["text1", "text2"]
}
```

### Previous Story Intelligence

**From Story 1.5.1:**
- `LocalLLMConfig` type already defined in `packages/embeddings/src/types.ts` with `baseUrl` and `model`
- Collection naming convention: `wiki-{strategy}-{provider}-{date}`
- CLI `--embedding-provider` flag already exists

### References

- [Source: epics.md#Epic 1.5, Story 1.5.2] - Acceptance criteria and requirements
- [Source: architecture.md#Data Architecture] - Ollama as primary local runtime
- [Source: docker-compose.yml] - Existing Docker infrastructure pattern
- [Ollama API Docs](https://github.com/ollama/ollama/blob/main/docs/api.md)
- [nomic-embed-text](https://ollama.com/library/nomic-embed-text) - 768 dims
- [qwen3-embedding](https://ollama.com/library/qwen3-embedding) - Up to 4096 dims

## Dev Agent Record

### Agent Model Used

{{agent_model_name_version}}

### Debug Log References

### Completion Notes List

### File List

### Change Log
