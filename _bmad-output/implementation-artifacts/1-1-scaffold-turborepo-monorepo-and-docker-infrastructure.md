# Story 1.1: Scaffold Turborepo Monorepo and Docker Infrastructure

Status: done

## Story

As an operator,
I want to clone the repository and start all infrastructure services with a single command,
so that I have a running development environment with Qdrant ready to accept data.

## Acceptance Criteria

1. **Given** a fresh clone of the repository, **When** I run `pnpm install` and `docker compose up`, **Then** the Qdrant container starts on its default port (6333/6334).

2. **Given** the monorepo is scaffolded, **Then** it contains `apps/api`, `apps/web`, `apps/cli`, `packages/core`, `packages/qdrant`, `packages/tsconfig`.

3. **Given** shared TypeScript configs exist in `packages/tsconfig`, **Then** `base.json`, `node.json`, and `react.json` are available and referenced by all packages.

4. **Given** the `docker-compose.yml` exists, **Then** Qdrant image is pinned to `qdrant/qdrant:v1.16.3`.

5. **Given** a developer opens the project, **Then** `.env.example` files document all required environment variables at root and per-app level.

## Tasks / Subtasks

- [x] Task 1: Initialize Turborepo monorepo (AC: 1, 2)
  - [x] 1.1 Run `pnpm dlx create-turbo@latest` and restructure to match architecture
  - [x] 1.2 Configure `pnpm-workspace.yaml` with `apps/*` and `packages/*`
  - [x] 1.3 Configure `turbo.json` with build/dev/lint/test pipelines
  - [x] 1.4 Set root `package.json` with workspace scripts
- [x] Task 2: Create app packages with correct structure (AC: 2)
  - [x] 2.1 Create `apps/api/` with `package.json`, `tsconfig.json`, `src/index.ts` placeholder
  - [x] 2.2 Create `apps/web/` with `package.json`, `tsconfig.json`, `src/main.tsx` placeholder
  - [x] 2.3 Create `apps/cli/` with `package.json`, `tsconfig.json`, `src/index.ts` placeholder
- [x] Task 3: Create shared packages (AC: 2, 3)
  - [x] 3.1 Create `packages/core/` with `package.json`, `tsconfig.json`, `src/index.ts` placeholder
  - [x] 3.2 Create `packages/qdrant/` with `package.json`, `tsconfig.json`, `src/index.ts` placeholder
  - [x] 3.3 Create `packages/tsconfig/` with `base.json`, `node.json`, `react.json`
- [x] Task 4: Docker infrastructure (AC: 1, 4)
  - [x] 4.1 Create `docker-compose.yml` with Qdrant service (`qdrant/qdrant:v1.16.3`)
  - [x] 4.2 Configure Qdrant volume for persistence
  - [x] 4.3 Add health check for Qdrant container
- [x] Task 5: Environment configuration (AC: 5)
  - [x] 5.1 Create root `.env.example` with common vars
  - [x] 5.2 Create `apps/api/.env.example` with API-specific vars (OPENAI_API_KEY, QDRANT_URL)
  - [x] 5.3 Create `apps/cli/.env.example` with CLI-specific vars (OPENAI_API_KEY, QDRANT_URL)
- [x] Task 6: Verify end-to-end (AC: 1)
  - [x] 6.1 Run `pnpm install` — all workspace dependencies resolve
  - [x] 6.2 Run `docker compose up` — Qdrant starts on port 6333 (✅ Verified 2026-02-09)
  - [x] 6.3 Run `pnpm build` — Turborepo builds all packages

## Dev Notes

### Architecture Compliance

**Monorepo Structure** [Source: architecture.md#Starter Template Evaluation]
- Use `pnpm dlx create-turbo@latest` as starting point, then restructure
- Turborepo v2.8.3 (latest stable)
- pnpm v10.x (workspace protocol)
- The scaffold creates a basic structure — you must reshape it to match the architecture exactly

**Package Manager** [Source: architecture.md#Starter Template Evaluation]
- pnpm with workspaces
- `pnpm-workspace.yaml` must include `apps/*` and `packages/*`

**Naming Conventions** [Source: architecture.md#Implementation Patterns]
- File naming: `kebab-case` for all files (e.g., `query-adapter.ts`, not `QueryAdapter.ts`)
- TypeScript: PascalCase for types/interfaces (no `I` prefix), camelCase for functions/variables
- Constants: `UPPER_SNAKE_CASE`

### Technical Requirements

**TypeScript Configuration** [Source: architecture.md#Project Structure]
- `packages/tsconfig/base.json` — shared base config
- `packages/tsconfig/node.json` — extends base, for API and CLI (target: ES2022, module: NodeNext)
- `packages/tsconfig/react.json` — extends base, for web app (target: ES2022, jsx: react-jsx)
- All app/package tsconfigs extend from `packages/tsconfig`
- TypeScript 5.x (latest 5.9.3)

**Docker Compose** [Source: architecture.md#Infrastructure & Deployment]
- Qdrant pinned to `qdrant/qdrant:v1.16.3` — do NOT use `latest` tag
- CVE-2024-3829 and CVE-2024-2221 are patched in v1.16.3 (both fixed in v1.9.0+)
- Qdrant exposes ports 6333 (HTTP API) and 6334 (gRPC)
- Add named volume for Qdrant data persistence
- Add health check: `wget --no-verbose --tries=1 --spider http://localhost:6333/healthz || exit 1`

**Environment Variables** [Source: architecture.md#Authentication & Security]
- `OPENAI_API_KEY` — required for embedding generation and LLM calls
- `QDRANT_URL` — Qdrant connection URL (default: `http://localhost:6333`)
- `QDRANT_API_KEY` — optional, for remote Qdrant instances (Phase 2)
- API keys must NEVER appear in committed files, only in `.env.example` as placeholders
- Mastra env management will be used in API (later stories)

### Library/Framework Requirements

| Dependency | Version | Scope | Notes |
|-----------|---------|-------|-------|
| turbo | ^2.8.3 | root devDependency | Build orchestration |
| typescript | ^5.9.3 | packages/tsconfig | Shared dependency |
| @types/node | ^22.x | packages/tsconfig | Node.js type definitions |

**Note:** Do NOT install app-specific dependencies yet (Express, React, Vite, etc.). Those belong in their respective stories. This story only scaffolds the structure and Docker infrastructure.

### Project Structure Notes

The exact directory structure to create:

```
labs-wikirag/
├── .env.example
├── .gitignore
├── docker-compose.yml
├── turbo.json
├── pnpm-workspace.yaml
├── package.json
├── apps/
│   ├── api/
│   │   ├── package.json
│   │   ├── tsconfig.json
│   │   ├── .env.example
│   │   └── src/
│   │       └── index.ts          # Placeholder: console.log('api')
│   ├── web/
│   │   ├── package.json
│   │   ├── tsconfig.json
│   │   └── src/
│   │       └── main.tsx          # Placeholder: console.log('web')
│   └── cli/
│       ├── package.json
│       ├── tsconfig.json
│       ├── .env.example
│       └── src/
│           └── index.ts          # Placeholder: console.log('cli')
├── packages/
│   ├── core/
│   │   ├── package.json
│   │   ├── tsconfig.json
│   │   └── src/
│   │       └── index.ts          # Placeholder: export {}
│   ├── qdrant/
│   │   ├── package.json
│   │   ├── tsconfig.json
│   │   └── src/
│   │       └── index.ts          # Placeholder: export {}
│   └── tsconfig/
│       ├── package.json
│       ├── base.json
│       ├── node.json
│       └── react.json
```

### Anti-Patterns to Avoid

- Do NOT install React, Express, Vite, or other app-specific dependencies — those belong in later stories
- Do NOT create Dockerfiles for apps/api or apps/web — those belong in later stories
- Do NOT use `npm` or `yarn` — this project uses `pnpm` exclusively
- Do NOT use `latest` tag for Qdrant Docker image — pin to `v1.16.3`
- Do NOT commit `.env` files — only `.env.example` with placeholder values
- Do NOT add CI/CD configuration — deferred to Phase 2

### References

- [Source: architecture.md#Starter Template Evaluation] — Turborepo + pnpm selection rationale
- [Source: architecture.md#Project Structure & Boundaries] — Complete directory structure
- [Source: architecture.md#Infrastructure & Deployment] — Docker and Qdrant decisions
- [Source: architecture.md#Implementation Patterns] — Naming and structure conventions
- [Source: architecture.md#Authentication & Security] — Environment variable management
- [Source: prd.md#Infrastructure & Deployment] — FR30, FR32, FR33

## Dev Agent Record

### Agent Model Used

Claude Opus 4.6

### Debug Log References

- `pnpm install` resolved all 7 workspace projects, installed turbo 2.8.3 and typescript 5.9.3
- Initial `pnpm build` failed: `console` not found in Node.js packages (missing `@types/node`)
- Fixed by adding `@types/node@^25.2.2` as devDependency to api, cli, core, qdrant packages
- Second `pnpm build` succeeded: 5 packages built (1 cached), 2.481s
- Docker not available in WSL2 environment — `docker-compose.yml` validated as correct YAML

### Completion Notes List

- Scaffolded Turborepo monorepo with 3 apps (api, web, cli) and 3 packages (core, qdrant, tsconfig)
- All packages use @wikirag/* namespace with workspace:* protocol
- Shared TypeScript configs: base.json (strict, ESM), node.json (ES2022, NodeNext), react.json (ES2022, bundler, react-jsx)
- Docker Compose with Qdrant v1.16.3 pinned, named volume, health check
- Environment variable documentation via .env.example at root, apps/api, and apps/cli
- Updated .gitignore to include dist/, .env, .turbo/, IDE files

### Change Log

- 2026-02-08: Story 1.1 implemented — monorepo scaffold, Docker infrastructure, environment config

### File List

- package.json (new)
- pnpm-workspace.yaml (new)
- turbo.json (new)
- pnpm-lock.yaml (new)
- docker-compose.yml (new)
- .env.example (new)
- .gitignore (modified)
- apps/api/package.json (new)
- apps/api/tsconfig.json (new)
- apps/api/.env.example (new)
- apps/api/src/index.ts (new)
- apps/web/package.json (new)
- apps/web/tsconfig.json (new)
- apps/web/src/main.tsx (new)
- apps/cli/package.json (new)
- apps/cli/tsconfig.json (new)
- apps/cli/.env.example (new)
- apps/cli/src/index.ts (new)
- packages/core/package.json (new)
- packages/core/tsconfig.json (new)
- packages/core/src/index.ts (new)
- packages/qdrant/package.json (new)
- packages/qdrant/tsconfig.json (new)
- packages/qdrant/src/index.ts (new)
- packages/tsconfig/package.json (new)
- packages/tsconfig/base.json (new)
- packages/tsconfig/node.json (new)
- packages/tsconfig/react.json (new)
