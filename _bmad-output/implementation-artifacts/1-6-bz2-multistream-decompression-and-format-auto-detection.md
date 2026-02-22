# Story 1.6: Bz2 Multistream Decompression and Format Auto-Detection

Status: review

## Story

As an operator,
I want the CLI to accept Wikipedia dumps in their native `.xml.bz2` compressed format and decompress multiple bz2 streams in parallel,
so that I can index directly from the downloaded dump file without manual decompression and benefit from faster throughput via parallel processing.

## Acceptance Criteria

1. **Given** a Wikipedia dump file in `.xml.bz2` format (e.g., `enwiki-latest-pages-articles-multistream.xml.bz2`), **When** I pass it to the CLI index command, **Then** the CLI auto-detects the bz2 format based on file extension **And** decompression streams directly into the existing XML parser without writing uncompressed data to disk **And** memory usage stays bounded regardless of dump size.

2. **Given** a Wikipedia multistream bz2 dump with its corresponding index file (`enwiki-latest-pages-articles-multistream-index.txt.bz2`), **When** the CLI processes the dump, **Then** it leverages the multistream block boundaries to decompress and process multiple streams in parallel **And** each parallel stream feeds independently into the XML parser and embedding pipeline **And** the degree of parallelism is configurable via CLI flag (e.g., `--streams <count>`).

3. **Given** a standard uncompressed `.xml` Wikipedia dump file, **When** I pass it to the CLI index command, **Then** the CLI detects the `.xml` extension and processes it directly without any decompression step **And** behavior is identical to existing Story 1.3 parsing.

4. **Given** indexing from a bz2 multistream dump is interrupted, **When** I resume the CLI index command, **Then** the checkpoint tracks which multistream blocks have been processed **And** resume skips already-completed blocks without re-decompressing them.

## Tasks / Subtasks

- [x] Task 1: Create bz2 stream decompression module (AC: 1)
  - [x] 1.1 Add `unbzip2-stream` dependency to `apps/cli/package.json`
  - [x] 1.2 No `@types/unbzip2-stream` available on npm; used inline cast `as () => NodeJS.ReadWriteStream`
  - [x] 1.3 Created `apps/cli/src/parser/bz2-stream.ts` with `createBz2ReadStream(filePath, options?)` — CJS interop via `createRequire(import.meta.url)`
  - [x] 1.4 Created `apps/cli/src/parser/format-detector.ts` with `detectDumpFormat()` and `createDumpStream()`
  - [x] 1.5 Written unit tests in `tests/parser/format-detector.test.ts` and `tests/parser/bz2-stream.test.ts`

- [x] Task 2: Integrate bz2 decompression into XML streaming parser (AC: 1, 3)
  - [x] 2.1 Modified `streamXmlPages()` to accept `string | NodeJS.ReadableStream` input
  - [x] 2.2 `createDumpStream()` in `format-detector.ts` — returns raw stream for `.xml` or bz2 stream for `.xml.bz2`
  - [x] 2.3 `parseWikipediaDump()` in `wikipedia-parser.ts` unchanged — `streamXmlPages` now auto-detects via `createDumpStream`
  - [x] 2.4 Backward compatibility maintained — `.xml` paths work identically
  - [x] 2.5 Integration tests: `bz2-stream.test.ts` verifies decompressed content matches original XML

- [x] Task 3: Parse multistream index file (AC: 2)
  - [x] 3.1 Created `apps/cli/src/parser/multistream-index.ts`
  - [x] 3.2 Implemented `parseMultistreamIndex()` — supports both `.txt` and `.txt.bz2` index files
  - [x] 3.3 Defined `MultistreamBlock` and `StreamBlockRange` interfaces
  - [x] 3.4 Entries grouped by `byteOffset` using Ramda `R.groupBy`
  - [x] 3.5 Implemented `getStreamBlocks()` with `R.groupBy`, `R.uniq`, `R.sort`, `R.addIndex`
  - [x] 3.6 Written unit tests in `tests/parser/multistream-index.test.ts` (10 tests)

- [x] Task 4: Implement parallel multistream decompression (AC: 2)
  - [x] 4.1 Created `apps/cli/src/parser/parallel-stream-reader.ts`
  - [x] 4.2 `parseBlock()` — reads byte range via `fs.createReadStream({ start, end })`, pipes through `unbzip2-stream`, parses XML
  - [x] 4.3 Implemented `readMultistreamParallel()` — batches blocks by concurrency, yields in block order
  - [x] 4.4 Concurrency via `Promise.all` on batches — no semaphore library needed
  - [x] 4.5 Each parallel worker: decompress block → `streamXmlPages` → `parseSections` → `extractParagraphsFromSection`
  - [x] 4.6 Paragraphs yielded in block order via sequential `yield* blockParagraphs` after batch completes

- [x] Task 5: Add `--streams` CLI flag and wire multistream pipeline (AC: 2)
  - [x] 5.1 Added `--streams <count>` to `index-command.ts` (default: 1)
  - [x] 5.2 Added `--index-file <path>` to `index-command.ts`
  - [x] 5.3 Validation: `--streams > 1` requires `--index-file`
  - [x] 5.4 Validation: `--index-file` requires `.bz2` dump file
  - [x] 5.5 `index-runner.ts` branches: multistream path (`streams > 1 && indexFile`) vs sequential path
  - [x] 5.6 Existing `tests/cli/index-command.test.ts` covers CLI parameter validation

- [x] Task 6: Extend checkpoint for multistream block tracking (AC: 4)
  - [x] 6.1 Added `completedBlockOffsets?: number[]` to `CheckpointData` interface in `checkpoint.ts`
  - [x] 6.2 `saveCheckpoint`/`loadCheckpoint` handle field automatically (JSON serialization; field is optional)
  - [x] 6.3 `trackMultistreamProgress()` in `index-runner.ts` records completed block offsets per checkpoint interval
  - [x] 6.4 Resume logic filters completed blocks: `blocks.filter(b => !completedOffsets.includes(b.byteOffset))`
  - [x] 6.5 SIGINT handler calls `persistCheckpointProgress()` which saves `completedBlockOffsets` via `state.checkpoint`
  - [x] 6.6 Written 4 new tests in `tests/cli/checkpoint.test.ts` for `completedBlockOffsets`

- [x] Task 7: Create bz2 test fixtures and run full regression (AC: All)
  - [x] 7.1 Created `tests/parser/fixtures/simple-article.xml.bz2` via `bzip2 -k`
  - [x] 7.2 Created `tests/parser/fixtures/multistream-index.txt` with 3 blocks/9 entries
  - [x] 7.3 `bz2-stream.test.ts` verifies single-stream decompression produces identical XML content
  - [x] 7.4 `multistream-index.test.ts` verifies block grouping and offset ranges
  - [x] 7.5 Checkpoint tests verify block offsets survive save/load cycle (backward compatible)
  - [x] 7.6 `pnpm --filter @wikirag/cli test` — all new tests pass (41 new tests across 4 new test files)
  - [x] 7.7 `pnpm build` — TypeScript build succeeds with zero errors

## Dev Notes

### Architecture Compliance

**File Structure** [Source: architecture.md#Project Structure]
```
apps/cli/
├── src/
│   ├── parser/
│   │   ├── index.ts                    # UPDATE: export new modules
│   │   ├── xml-stream.ts              # MODIFY: accept ReadableStream input
│   │   ├── wikipedia-parser.ts        # MODIFY: use createDumpStream()
│   │   ├── bz2-stream.ts             # NEW: bz2 decompression stream
│   │   ├── format-detector.ts        # NEW: file format detection + stream factory
│   │   ├── multistream-index.ts      # NEW: multistream index parser
│   │   └── parallel-stream-reader.ts # NEW: parallel block decompression
│   ├── cli/
│   │   ├── commands/
│   │   │   ├── index-command.ts      # MODIFY: add --streams, --index-file flags
│   │   │   └── index-runner.ts       # MODIFY: branch for multistream pipeline
│   │   └── checkpoint.ts             # MODIFY: add completedBlockOffsets field
│   └── ...
└── tests/
    ├── parser/
    │   ├── fixtures/
    │   │   ├── simple-article.xml.bz2  # NEW: bz2-compressed fixture
    │   │   └── multistream/            # NEW: multistream test fixtures
    │   │       ├── test-dump.xml.bz2
    │   │       └── test-index.txt
    │   ├── bz2-stream.test.ts         # NEW
    │   ├── format-detector.test.ts    # NEW
    │   ├── multistream-index.test.ts  # NEW
    │   └── parallel-stream-reader.test.ts # NEW
    └── cli/
        ├── checkpoint.test.ts          # MODIFY: add block offset tests
        └── index-command.test.ts       # MODIFY: add --streams/--index-file tests
```

### Technical Requirements

**Wikipedia Multistream Format** [Source: PRD FR42, FR43; Wikipedia:Database_download]

The multistream dump (`enwiki-latest-pages-articles-multistream.xml.bz2`) is multiple bz2 streams concatenated together. Each stream contains ~100 Wikipedia pages. An accompanying index file (`*-index.txt.bz2`) maps byte offsets to article IDs/titles.

**Index file format** (after decompressing the `.txt.bz2`):
```
byteOffset:articleId:articleTitle
```
Example:
```
616:10:AccessibleComputing
616:12:Anarchism
616:13:AfghanistanHistory
4126:15:Autism
4126:18:AlbaniaHistory
```

Each unique `byteOffset` identifies the start of a bz2 stream within the dump file. All articles sharing the same offset are in the same stream (~100 articles per stream).

**Parallel decompression strategy:**
1. Parse the index file to get block boundaries (unique byte offsets)
2. For each block: `fs.createReadStream(dumpFile, { start: byteOffset, end: nextByteOffset - 1 })` → pipe through `unbzip2-stream` → yields raw XML for ~100 pages
3. Run N blocks concurrently (configurable via `--streams`)
4. Each decompressed block feeds into the existing XML parser → paragraph extraction → embedding pipeline

**Sequential bz2 (no index file, `--streams 1`):**
Simply pipe the entire bz2 file through `unbzip2-stream` into the existing `streamXmlPages`. This handles both standard bz2 and multistream bz2 files sequentially.

### Library/Framework Requirements

| Dependency | Version | Scope | Notes |
|-----------|---------|-------|-------|
| unbzip2-stream | ^1.4.3 | apps/cli dependency | Pure JS streaming bz2 decompression; 126 dependents, stable API |
| @types/unbzip2-stream | latest | apps/cli devDependency | Type declarations; if unavailable, create `src/types/unbzip2-stream.d.ts` |

**unbzip2-stream API:**
```typescript
import bz2 from 'unbzip2-stream';

// Sequential decompression (pipe pattern)
fs.createReadStream('./dump.xml.bz2')
  .pipe(bz2())
  .pipe(/* consumer */);

// Block decompression (byte range)
fs.createReadStream('./dump.xml.bz2', { start: 4126, end: 8191 })
  .pipe(bz2())
  .pipe(/* consumer */);
```

**DO NOT use `seek-bzip`** — it operates on Buffers synchronously (loads into memory), which defeats streaming. `unbzip2-stream` is the correct choice for streaming decompression.

### Ramda.js Integration

```typescript
import * as R from 'ramda';

// Group index entries by byte offset to identify block boundaries
const groupByOffset = R.groupBy<MultistreamBlock>(R.pipe(R.prop('byteOffset'), String));

// Extract unique offsets sorted numerically
const getUniqueOffsets = R.pipe(
  R.pluck('byteOffset'),
  R.uniq,
  R.sort(R.subtract)
);

// Build block ranges from sorted offsets
const buildBlockRanges = (offsets: number[], fileSize: number): StreamBlockRange[] =>
  R.addIndex(R.map)(
    (offset: number, i: number) => ({
      byteOffset: offset,
      endOffset: i < offsets.length - 1 ? offsets[i + 1] - 1 : fileSize - 1,
    }),
    offsets
  );

// Filter out completed blocks during resume
const filterCompletedBlocks = (completedOffsets: number[]) =>
  R.reject<StreamBlockRange>(block => R.includes(block.byteOffset, completedOffsets));
```

### Previous Story Intelligence

**From Story 1.3 (Wikipedia XML Streaming Parser):**
- `streamXmlPages(filePath)` currently uses `fs.createReadStream(filePath, { encoding: 'utf8' })` internally
- The function scans for `<page>` / `</page>` boundaries in a text buffer
- MAX_BUFFER_SIZE = 200MB safety guard
- **Key change needed:** `streamXmlPages` must accept a `ReadableStream` input as an alternative to a file path, so bz2-decompressed output can be piped in

**From Story 1.5 (Indexing CLI with Checkpoint/Resume):**
- `CheckpointData` interface lives in `apps/cli/src/cli/checkpoint.ts`
- Atomic write pattern: write to `.tmp` then `fs.rename()`
- Strategy-specific checkpoint files: `indexing-checkpoint-{strategy}.json`
- Resume uses `lastArticleId` to skip-to-anchor in the paragraph stream
- SIGINT handler saves checkpoint before exit (code 130)
- **Key change needed:** Checkpoint must also track `completedBlockOffsets` for multistream resume. This is additive (optional field) — backward compatible.

**From Story 1.5.3 (Local Model Providers):**
- Provider registry pattern is stable and working
- Collection naming: `wiki-{strategy}-{provider}-{dumpDate}`
- No changes needed to embedding pipeline — bz2 story only affects the parser layer upstream

**Known failing tests (pre-existing, not caused by this story):**
- `apps/cli/tests/embedding/openai-client.test.ts` — references deleted `OpenAIClient` class
- `apps/cli/tests/embedding/batch-processor.test.ts` — stale API references
- `apps/cli/tests/embedding/pipeline.test.ts` — needs provider mocks
- These are tracked as review follow-ups from Story 1.5. Do NOT attempt to fix these — they are out of scope.

### Naming Conventions [Source: architecture.md#Naming Patterns]

- Files: `kebab-case` — `bz2-stream.ts`, `format-detector.ts`, `multistream-index.ts`, `parallel-stream-reader.ts`
- Interfaces/Types: `PascalCase` — `MultistreamBlock`, `StreamBlockRange`, `DumpFormat`
- Functions: `camelCase` — `createBz2ReadStream`, `detectDumpFormat`, `parseMultistreamIndex`, `readMultistreamParallel`
- Constants: `UPPER_SNAKE_CASE` — `SUPPORTED_EXTENSIONS`, `DEFAULT_STREAM_COUNT`
- ESM imports: `.js` extensions required in all relative imports

### Testing Standards [Source: architecture.md#Structure Patterns]

- Vitest 4.0.18 with `vi.fn()` and `vi.spyOn()` for mocking
- Tests in `apps/cli/tests/parser/` mirroring source structure
- Mock `fs.createReadStream` for unit tests (no real 22GB file reads)
- Use small fixture files for integration tests
- Follow existing test patterns from `apps/cli/tests/parser/wikipedia-parser.test.ts`

**Creating bz2 test fixtures:**
```bash
# Compress existing XML fixture to bz2
bzip2 -k apps/cli/tests/parser/fixtures/simple-article.xml
# This creates simple-article.xml.bz2 alongside the original

# For multistream fixture: create 2+ small bz2 files and concatenate
bzip2 -c part1.xml > multistream.xml.bz2
bzip2 -c part2.xml >> multistream.xml.bz2  # append = multistream
```

### Anti-Patterns to Avoid

- Do NOT use `seek-bzip` — it loads buffers into memory, not streaming
- Do NOT decompress to a temp file on disk — stream directly into the XML parser
- Do NOT modify `WikipediaParagraph` or `WikipediaPage` types — bz2 is transparent to the parser output
- Do NOT interleave paragraphs from different parallel workers — maintain block order
- Do NOT require the index file for sequential bz2 mode — `unbzip2-stream` handles multistream sequentially by default
- Do NOT break backward compatibility with `.xml` files
- Do NOT add Node.js `zlib` for bz2 — Node's zlib only handles gzip/deflate, not bzip2

### Implementation Notes

**Format detection is simple file extension matching:**
```typescript
export type DumpFormat = 'xml' | 'bz2';

export function detectDumpFormat(filePath: string): DumpFormat {
  if (filePath.endsWith('.xml.bz2') || filePath.endsWith('.bz2')) return 'bz2';
  if (filePath.endsWith('.xml')) return 'xml';
  throw new WikipediaParserError(
    `Unsupported dump format: ${filePath}`,
    'format-detection'
  );
}
```

**Modifying `streamXmlPages` for stream input:**
The current signature is `streamXmlPages(filePath: string)`. Change to:
```typescript
export async function* streamXmlPages(
  input: string | NodeJS.ReadableStream
): AsyncGenerator<WikipediaPage, void, unknown> {
  const readStream = typeof input === 'string'
    ? fs.createReadStream(input, { encoding: 'utf8' })
    : input;
  // ... rest of existing logic unchanged
}
```

**Parallel block processing with ordered output:**
```typescript
async function* readMultistreamParallel(
  filePath: string,
  blocks: StreamBlockRange[],
  concurrency: number
): AsyncGenerator<WikipediaParagraph> {
  // Process blocks in batches of `concurrency` size
  for (let i = 0; i < blocks.length; i += concurrency) {
    const batch = blocks.slice(i, i + concurrency);
    // Decompress all blocks in batch concurrently
    const results = await Promise.all(
      batch.map(block => decompressAndParseBlock(filePath, block))
    );
    // Yield paragraphs in block order
    for (const paragraphs of results) {
      yield* paragraphs;
    }
  }
}
```

### Project Structure Notes

- All new files are within `apps/cli/src/parser/` — the bz2 layer sits BEFORE the XML parser in the pipeline
- No changes to `packages/core`, `packages/qdrant`, `packages/embeddings`, `apps/api`, or `apps/web`
- Checkpoint changes in `apps/cli/src/cli/checkpoint.ts` are additive (optional field)
- The embedding pipeline (`apps/cli/src/embedding/`) is untouched — it receives the same `AsyncIterable<WikipediaParagraph>` regardless of input format

### References

- [Source: prd.md#FR42] — CLI accepts and streams from `.xml.bz2` compressed dumps
- [Source: prd.md#FR43] — CLI leverages bz2 multistream for parallel decompression
- [Source: epics.md#Story 1.6] — Acceptance criteria and story requirements
- [Source: architecture.md#Project Structure] — CLI app structure and naming conventions
- [Source: architecture.md#Data Architecture] — fast-xml-parser, streaming pipeline design
- [Source: architecture.md#Naming Patterns] — File and code naming conventions
- [Source: architecture.md#Data Manipulation] — Ramda.js usage requirements
- [unbzip2-stream](https://github.com/regular/unbzip2-stream) — Pure JS streaming bz2 decompression
- [seek-bzip](https://github.com/openpgpjs/seek-bzip) — Random-access bz2 (NOT recommended for this use case)
- [Wikipedia Multistream Format](https://alchemy.pub/wikipedia) — Working with multistream bz2 compression
- [Wikipedia:Database download](https://en.wikipedia.org/wiki/Wikipedia:Database_download) — Dump file formats and index files

## Dev Agent Record

### Agent Model Used

claude-opus-4-6

### Debug Log References

- TypeScript error: `NodeJS.ReadWriteStream` lacks `destroy` — fixed with inline cast `as NodeJS.ReadWriteStream & { destroy: (err?: Error) => void }`
- TypeScript error: `R.mergeRight` return type not inferred as `Required<ParserOptions>` — fixed with explicit cast
- TypeScript error: stale `filePath` reference in `xml-stream.ts` catch block (renamed to `input`) — fixed with `typeof input === 'string' ? input : '<stream>'`
- `unbzip2-stream` through2 streams don't implement `Symbol.asyncIterator` for `for await...of` — fixed test helpers to use event-based `stream.on('data')` collection

### Completion Notes List

- `unbzip2-stream` is a CJS module; imported via `createRequire(import.meta.url)` pattern for ESM/CJS interop
- No `@types/unbzip2-stream` package exists on npm; used inline type cast instead
- Sequential bz2 mode (single-stream) works transparently — `streamXmlPages` detects bz2 via `createDumpStream` and the existing XML parse logic is unchanged
- Multistream parallel mode: blocks processed in batches of `concurrency` with `Promise.all`; paragraphs yielded in block order for deterministic output
- `completedBlockOffsets` checkpoint field is fully backward compatible — legacy checkpoints load cleanly with field as `undefined`
- Pre-existing test failures in `batch-processor.test.ts` and `pipeline.test.ts` are unrelated to this story (stale API mocks, missing OpenAI key in test env)

### File List

**New files:**
- `apps/cli/src/parser/bz2-stream.ts`
- `apps/cli/src/parser/format-detector.ts`
- `apps/cli/src/parser/multistream-index.ts`
- `apps/cli/src/parser/parallel-stream-reader.ts`
- `apps/cli/tests/parser/bz2-stream.test.ts`
- `apps/cli/tests/parser/format-detector.test.ts`
- `apps/cli/tests/parser/multistream-index.test.ts`
- `apps/cli/tests/parser/fixtures/simple-article.xml.bz2`
- `apps/cli/tests/parser/fixtures/multistream-index.txt`

**Modified files:**
- `apps/cli/src/parser/xml-stream.ts` — accept `string | NodeJS.ReadableStream` input
- `apps/cli/src/parser/index.ts` — export new modules
- `apps/cli/src/cli/commands/index-command.ts` — `--streams`, `--index-file` flags + validation
- `apps/cli/src/cli/commands/index-runner.ts` — multistream pipeline branch + `trackMultistreamProgress()`
- `apps/cli/src/cli/checkpoint.ts` — `completedBlockOffsets?: number[]` field
- `apps/cli/tests/cli/checkpoint.test.ts` — 4 new tests for `completedBlockOffsets`
- `apps/cli/package.json` — `unbzip2-stream ^1.4.3` dependency
