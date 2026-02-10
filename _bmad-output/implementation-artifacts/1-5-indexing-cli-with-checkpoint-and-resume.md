# Story 1.5: Indexing CLI with Checkpoint and Resume

Status: ready-for-dev

## Story

As an operator,
I want a CLI command to index the full Wikipedia dump with the ability to pause and resume,
So that I can manage the long-running indexing process across multiple sessions.

## Acceptance Criteria

1. **Given** I run the CLI index command with an embedding strategy flag, **When** the indexing process starts, **Then** it streams through the dump: parse → embed → insert **And** progress is tracked in `indexing-checkpoint.json` (lastArticleId, articlesProcessed, totalArticles, strategy, dumpFile) **And** progress is logged to console every 100 articles.

2. **Given** indexing was previously interrupted, **When** I run the CLI index command again, **Then** it resumes from the last checkpoint position **And** no duplicate embeddings are created **And** the console shows "Resuming from article ID: {lastArticleId}".

3. **Given** I want to use a different embedding strategy, **When** I specify the strategy via CLI parameter, **Then** a new collection is created with the appropriate naming convention **And** indexing proceeds into the new collection **And** a new checkpoint file is created for this strategy.

4. **Given** the CLI is running, **When** I press Ctrl+C, **Then** the checkpoint is saved **And** the process exits gracefully **And** I can resume later.

5. **Given** I run the index command, **When** the command starts, **Then** required parameters are: --dump-file, --strategy, --dump-date **And** optional parameters are: --model, --batch-size, --checkpoint-file.

## Tasks / Subtasks

- [ ] Task 1: Create CLI command structure (AC: 5)
  - [ ] 1.1 Add commander dependency for CLI parsing
  - [ ] 1.2 Create src/cli/commands/index-command.ts
  - [ ] 1.3 Define command options (dump-file, strategy, dump-date, model, batch-size)
  - [ ] 1.4 Validate required parameters
  - [ ] 1.5 Update src/index.ts to register command
- [ ] Task 2: Implement checkpoint manager (AC: 1, 2, 3)
  - [ ] 2.1 Create src/cli/checkpoint.ts
  - [ ] 2.2 Define CheckpointData interface
  - [ ] 2.3 Implement saveCheckpoint(data, filePath)
  - [ ] 2.4 Implement loadCheckpoint(filePath)
  - [ ] 2.5 Handle checkpoint file per strategy
  - [ ] 2.6 Use Ramda for data transformations
- [ ] Task 3: Implement resume logic (AC: 2)
  - [ ] 3.1 Load checkpoint if exists
  - [ ] 3.2 Skip already-processed articles in stream
  - [ ] 3.3 Detect duplicates (check article ID)
  - [ ] 3.4 Log resume information
- [ ] Task 4: Implement graceful shutdown (AC: 4)
  - [ ] 4.1 Register SIGINT handler (Ctrl+C)
  - [ ] 4.2 Save checkpoint on interrupt
  - [ ] 4.3 Close Qdrant connection gracefully
  - [ ] 4.4 Log shutdown message
- [ ] Task 5: Wire indexing pipeline (AC: 1)
  - [ ] 5.1 Create src/cli/commands/index-runner.ts
  - [ ] 5.2 Orchestrate: parse → embed → insert
  - [ ] 5.3 Track progress metrics
  - [ ] 5.4 Save checkpoint every N articles
  - [ ] 5.5 Log progress to console
- [ ] Task 6: Add comprehensive tests (AC: All)
  - [ ] 6.1 Create tests/cli/checkpoint.test.ts
  - [ ] 6.2 Create tests/cli/index-command.test.ts
  - [ ] 6.3 Test resume from checkpoint
  - [ ] 6.4 Test graceful shutdown
  - [ ] 6.5 Test parameter validation
  - [ ] 6.6 Run pnpm test (all tests pass)

## Dev Notes

### Architecture Compliance

**CLI Structure** [Source: architecture.md#Project Structure]
```
apps/cli/
├── src/
│   ├── parser/          # From Story 1.3
│   ├── embedding/       # From Story 1.4
│   ├── cli/             # NEW: CLI commands (this story)
│   │   ├── commands/
│   │   │   ├── index-command.ts
│   │   │   └── index-runner.ts
│   │   └── checkpoint.ts
│   └── index.ts         # Main CLI entrypoint (update)
└── tests/
    ├── parser/          # From Story 1.3
    ├── embedding/       # From Story 1.4
    └── cli/             # NEW: CLI tests
```

**CLI Framework** [Source: architecture.md - implicit from Node.js ecosystem]
- Use `commander` for CLI argument parsing
- Standard Unix conventions (--long-option, -s short)
- Exit codes: 0 (success), 1 (error), 130 (SIGINT)

### Technical Requirements

**Checkpoint File Format** [Source: epics.md Story 1.5]
```json
{
  "lastArticleId": "12345",
  "articlesProcessed": 5000,
  "totalArticles": 100000,
  "strategy": "paragraph",
  "dumpFile": "/path/to/enwiki-20260210-pages-articles.xml",
  "dumpDate": "20260210",
  "embeddingModel": "text-embedding-3-small",
  "collectionName": "wiki-paragraph-20260210",
  "timestamp": "2026-02-10T10:00:00.000Z"
}
```

**Checkpoint Saving Strategy**
- Save checkpoint every 100 articles (configurable)
- Save on graceful shutdown (SIGINT)
- Save on error before exit
- Atomic write: write to temp file, then rename

**Resume Logic**
- Load checkpoint file if exists
- Validate checkpoint matches parameters (strategy, dump-file)
- Skip articles until lastArticleId is reached
- Continue from next article
- Do NOT re-embed already processed articles

**CLI Command Syntax**
```bash
# Initial run
pnpm cli index \
  --dump-file ./enwiki-20260210.xml \
  --strategy paragraph \
  --dump-date 20260210

# With optional parameters
pnpm cli index \
  --dump-file ./enwiki-20260210.xml \
  --strategy paragraph \
  --dump-date 20260210 \
  --model text-embedding-3-large \
  --batch-size 50 \
  --checkpoint-file ./checkpoint-custom.json

# Resume (same parameters, reads checkpoint)
pnpm cli index \
  --dump-file ./enwiki-20260210.xml \
  --strategy paragraph \
  --dump-date 20260210
```

### Library/Framework Requirements

| Dependency | Version | Scope | Notes |
|-----------|---------|-------|-------|
| commander | ^12.1.0 | apps/cli dependency | CLI argument parsing |
| ramda | ^0.32.0 | apps/cli dependency | Already available |
| @types/node | ^25.2.2 | apps/cli devDependency | Already available |

**Commander.js Specifics:**
- TypeScript support out of the box
- Auto-generated help text
- Type-safe option parsing
- Command chaining support
- Documentation: https://github.com/tj/commander.js

### Ramda.js Integration

**Checkpoint Data Transformations:**
```typescript
import * as R from 'ramda';

// Validate checkpoint against current parameters
const validateCheckpoint = R.allPass([
  R.pipe(R.prop('strategy'), R.equals(currentStrategy)),
  R.pipe(R.prop('dumpFile'), R.equals(currentDumpFile)),
  R.pipe(R.prop('dumpDate'), R.equals(currentDumpDate))
]);

// Extract checkpoint metadata
const getCheckpointMetadata = R.pick([
  'lastArticleId',
  'articlesProcessed',
  'strategy',
  'dumpDate'
]);

// Check if article should be skipped (already processed)
const shouldSkip = R.curry(
  (lastProcessedId: string, currentId: string) =>
    parseInt(currentId) <= parseInt(lastProcessedId)
);
```

### Previous Story Intelligence

**From Story 1.1**
- .env.example pattern for environment variables
- Docker setup for Qdrant already in place

**From Story 1.2**
- Collection management: createCollection(strategy, dumpDate, vectorSize)
- Collection naming: `wiki-{strategy}-{dump_date}`

**From Story 1.3**
- parseWikipediaDump() returns async generator
- WikipediaPage includes `id` field for tracking
- Progress logging pattern

**From Story 1.4**
- Embedding pipeline: batch → embed → insert
- Progress metrics tracking
- Error handling and retry logic

### Testing Strategy

**Checkpoint Tests:**
- Test saveCheckpoint writes valid JSON
- Test loadCheckpoint reads and validates
- Test atomic write (temp file + rename)
- Test checkpoint validation
- Test resume detection

**CLI Command Tests:**
- Test parameter validation
- Test required vs optional parameters
- Test help text generation
- Test command execution flow

**Integration Tests:**
- Test full index → checkpoint → resume flow
- Test graceful shutdown saves checkpoint
- Test resume skips processed articles
- Test different strategies create separate checkpoints

### Anti-Patterns to Avoid

- Do NOT overwrite checkpoint file directly (use atomic write)
- Do NOT skip checkpoint validation (could resume with wrong params)
- Do NOT ignore SIGINT (must save checkpoint before exit)
- Do NOT re-embed articles that are already processed
- Do NOT hardcode checkpoint file path
- Do NOT use synchronous file operations (use fs.promises)

### Implementation Notes

**Graceful Shutdown Pattern:**
```typescript
let isShuttingDown = false;

process.on('SIGINT', async () => {
  if (isShuttingDown) return;
  isShuttingDown = true;

  console.log('\nReceived SIGINT, saving checkpoint...');
  await saveCheckpoint(currentState);
  console.log('Checkpoint saved. Exiting.');
  process.exit(130); // SIGINT exit code
});
```

**Atomic Checkpoint Write:**
```typescript
import fs from 'fs/promises';
import path from 'path';

async function saveCheckpoint(data: CheckpointData, filePath: string) {
  const tempFile = `${filePath}.tmp`;
  await fs.writeFile(tempFile, JSON.stringify(data, null, 2));
  await fs.rename(tempFile, filePath); // Atomic operation
}
```

**Resume Detection:**
```typescript
async function shouldResume(checkpointFile: string, params: IndexParams): Promise<boolean> {
  try {
    const checkpoint = await loadCheckpoint(checkpointFile);
    return validateCheckpoint(checkpoint, params);
  } catch {
    return false; // No checkpoint, start fresh
  }
}
```

### References

- [Source: architecture.md#Project Structure] - CLI app structure
- [Source: epics.md#Story 1.5] - Acceptance criteria
- [Source: architecture.md#Naming Patterns] - File naming conventions
- [Commander.js Documentation](https://github.com/tj/commander.js) - CLI framework
- [Node.js Process Signals](https://nodejs.org/api/process.html#process_signal_events) - SIGINT handling

## Dev Agent Record

### Agent Model Used

_To be filled by dev agent_

### Debug Log References

_To be filled by dev agent_

### Completion Notes List

_To be filled by dev agent_

### Change Log

_To be filled by dev agent_

### File List

_To be filled by dev agent_
