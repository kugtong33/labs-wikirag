# labs-wikirag

A RAG (Retrieval-Augmented Generation) laboratory for exploring and comparing different RAG techniques using Wikipedia as the knowledge source.

## Overview

This project indexes Wikipedia articles into a vector database (Qdrant) and provides a query interface for experimenting with multiple RAG strategies side-by-side.

## Prerequisites

- [Node.js](https://nodejs.org/) 18+
- [pnpm](https://pnpm.io/) 8+
- [Docker](https://www.docker.com/) with Compose v2
- An OpenAI API key **or** a local Ollama installation (see [Local Embedding Providers](#local-embedding-providers))

## Quick Start

```bash
# Install dependencies
pnpm install

# Start infrastructure (Qdrant + Ollama with GPU)
docker compose up -d

# Copy and configure environment files
cp apps/cli/.env.example apps/cli/.env
cp apps/api/.env.example apps/api/.env
# Edit .env files with your API keys / provider settings

# Build all packages
pnpm build
```

## Infrastructure

Services are managed with Docker Compose.

| Service | Port | Description |
|---------|------|-------------|
| Qdrant  | 6333, 6334 | Vector database |
| Ollama  | 11434 | Local LLM runtime (GPU) |

### Starting services

```bash
# GPU (NVIDIA) — default
docker compose up -d

# CPU-only fallback (no NVIDIA GPU / container toolkit)
docker compose -f docker-compose.yml -f docker-compose.cpu.yml up -d

# Start only Qdrant (if using OpenAI embeddings)
docker compose up qdrant -d

# Start only Ollama
docker compose up ollama -d
```

---

## Local Embedding Providers

By default the project uses OpenAI for embeddings. You can switch to a fully local setup using [Ollama](https://ollama.com/).

### Why local embeddings?

- No API costs during large indexing runs
- Full data privacy (nothing leaves your machine)
- Experiment with different embedding dimensions and quality characteristics

### Supported Models

| Model | Size | Dimensions | Notes |
|-------|------|-----------|-------|
| `nomic-embed-text` | 274 MB | 768 | Outperforms OpenAI ada-002 and text-embedding-3-small on MTEB |
| `qwen3-embedding` | 639 MB – 4.7 GB | Up to 4096 | #1 MTEB multilingual; available in 0.6B / 4B / 8B variants |

### GPU Requirements

For GPU-accelerated inference you need:

- NVIDIA GPU (GTX 1070 or better recommended)
- [NVIDIA Container Toolkit](https://docs.nvidia.com/datacenter/cloud-native/container-toolkit/install-guide.html) (for Docker GPU passthrough)

Ollama falls back to CPU automatically when a GPU is unavailable (slower but fully functional).

---

### Option A: Docker-based Ollama (recommended)

GPU (with NVIDIA Container Toolkit installed):

```bash
docker compose up ollama -d
```

CPU-only fallback:

```bash
docker compose -f docker-compose.yml -f docker-compose.cpu.yml up ollama -d
```

Pull embedding models after the container is running:

```bash
# Lightweight, high quality English embeddings
docker exec -it $(docker compose ps -q ollama) ollama pull nomic-embed-text

# Multilingual, higher dimensional embeddings
docker exec -it $(docker compose ps -q ollama) ollama pull qwen3-embedding
```

---

### Option B: Native Ollama Installation

```bash
# Install Ollama (Linux / macOS)
curl -fsSL https://ollama.com/install.sh | sh

# Start the server
ollama serve

# Pull embedding models (in a separate terminal)
ollama pull nomic-embed-text
ollama pull qwen3-embedding
```

---

### Verification

```bash
# Health check — should return "Ollama is running"
curl http://localhost:11434/

# List pulled models
ollama list

# Or via API
curl http://localhost:11434/api/tags
```

---

### Environment Configuration

Set the following variables in `apps/cli/.env` and/or `apps/api/.env`:

```dotenv
# Select the provider
EMBEDDING_PROVIDER=ollama          # or: openai

# Ollama endpoint (default shown; change if running on a different host/port)
OLLAMA_BASE_URL=http://localhost:11434
```

The `EMBEDDING_PROVIDER` variable controls which provider is active at runtime. When set to `ollama` the `OPENAI_API_KEY` is not required.

---

## Project Structure

```
apps/
  cli/        # Indexing CLI — parses Wikipedia XML and populates Qdrant
  api/        # Query API server
  web/        # Progressive Web App (RAG technique comparison UI)
packages/
  embeddings/ # Pluggable embedding provider abstraction
```

## Development

```bash
# Run all tests
pnpm test

# Lint
pnpm lint

# Build
pnpm build
```
