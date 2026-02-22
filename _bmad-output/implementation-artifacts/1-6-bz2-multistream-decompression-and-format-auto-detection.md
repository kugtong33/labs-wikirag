# Story 1.6: Bz2 Multistream Decompression and Format Auto-Detection

Status: ready-for-dev

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

- [ ] Task 1: Create bz2 stream decompression module (AC: 1)
  - [ ] 1.1 Add `unbzip2-stream` dependency to `apps/cli/package.json`
  - [ ] 1.2 Add `@types/unbzip2-stream` devDependency (if available, else create local type declaration)
  - [ ] 1.3 Create `apps/cli/src/parser/bz2-stream.ts` with `createBz2ReadStream(filePath: string): NodeJS.ReadableStream` that pipes `fs.createReadStream` through `unbzip2-stream`
  - [ ] 1.4 Create `apps/cli/src/parser/format-detector.ts` with `detectDumpFormat(filePath: string): 'xml' | 'bz2'` based on file extension (`.xml` vs `.xml.bz2` / `.bz2`)
  - [ ] 1.5 Write unit tests for format detection (`.xml`, `.xml.bz2`, `.bz2`, unknown extension error)

- [ ] Task 2: Integrate bz2 decompression into XML streaming parser (AC: 1, 3)
  - [ ] 2.1 Modify `apps/cli/src/parser/xml-stream.ts` `streamXmlPages()` to accept a `ReadableStream | string` input (stream or file path)
  - [ ] 2.2 Create factory function `createDumpStream(filePath: string): NodeJS.ReadableStream` in `format-detector.ts` that returns either raw `fs.createReadStream` (for `.xml`) or bz2-piped stream (for `.xml.bz2`)
  - [ ] 2.3 Update `parseWikipediaDump()` in `wikipedia-parser.ts` to use `createDumpStream()` instead of passing the file path directly to `streamXmlPages()`
  - [ ] 2.4 Ensure backward compatibility: `.xml` files work identically to current behavior
  - [ ] 2.5 Write integration tests: parse a small `.xml.bz2` test fixture through the full parser pipeline, verify same `WikipediaParagraph` output as equivalent `.xml`

- [ ] Task 3: Parse multistream index file (AC: 2)
  - [ ] 3.1 Create `apps/cli/src/parser/multistream-index.ts`
  - [ ] 3.2 Implement `parseMultistreamIndex(indexFilePath: string): Promise<MultistreamBlock[]>` — decompress the `.txt.bz2` index file and parse lines of format `byteOffset:articleId:articleTitle`
  - [ ] 3.3 Define `MultistreamBlock` interface: `{ byteOffset: number, articleId: string, articleTitle: string }`
  - [ ] 3.4 Group index entries by `byteOffset` to identify stream block boundaries (each unique offset = one bz2 stream containing ~100 pages)
  - [ ] 3.5 Implement `getStreamBlocks(indexEntries: MultistreamBlock[]): StreamBlockRange[]` using Ramda `R.groupBy` to produce `{ byteOffset: number, endOffset: number, articleIds: string[] }[]`
  - [ ] 3.6 Write unit tests for index parsing and block grouping

- [ ] Task 4: Implement parallel multistream decompression (AC: 2)
  - [ ] 4.1 Create `apps/cli/src/parser/parallel-stream-reader.ts`
  - [ ] 4.2 Implement `decompressBlock(filePath: string, byteOffset: number, length: number): Promise<Buffer>` — read a byte range from the bz2 file using `fs.createReadStream({ start, end })` and decompress with `unbzip2-stream`
  - [ ] 4.3 Implement `async function* readMultistreamParallel(filePath: string, blocks: StreamBlockRange[], concurrency: number): AsyncGenerator<WikipediaParagraph>` — process blocks with configurable concurrency, yielding paragraphs in block order
  - [ ] 4.4 Use a concurrency-limited worker pattern (e.g., simple semaphore with `Promise` pool) — no new dependencies
  - [ ] 4.5 Each parallel worker: decompress block → pipe through XML parser → yield paragraphs
  - [ ] 4.6 Ensure paragraphs are yielded in block order (not interleaved between workers) to maintain deterministic output
  - [ ] 4.7 Write unit tests with mocked file reads and small bz2 fixtures

- [ ] Task 5: Add `--streams` CLI flag and wire multistream pipeline (AC: 2)
  - [ ] 5.1 Add `--streams <count>` optional parameter to `index-command.ts` (default: 1, meaning sequential)
  - [ ] 5.2 Add `--index-file <path>` optional parameter for the multistream index file path
  - [ ] 5.3 Add validation: `--streams > 1` requires `--index-file` to be provided
  - [ ] 5.4 Add validation: `--index-file` requires dump file to be `.xml.bz2` format
  - [ ] 5.5 Update `index-runner.ts` to branch: if `streams > 1 && indexFile` → use `readMultistreamParallel()`, else → use existing `parseWikipediaDump()` with `createDumpStream()`
  - [ ] 5.6 Write CLI parameter validation tests

- [ ] Task 6: Extend checkpoint for multistream block tracking (AC: 4)
  - [ ] 6.1 Extend `CheckpointData` interface with optional `completedBlockOffsets?: number[]` field
  - [ ] 6.2 Update `saveCheckpoint` and `loadCheckpoint` to handle the new field (backward compatible — field is optional)
  - [ ] 6.3 Update `index-runner.ts` to save completed block offsets to checkpoint after each block completes
  - [ ] 6.4 Update resume logic: when multistream mode, filter out already-completed blocks before starting parallel decompression
  - [ ] 6.5 Ensure SIGINT handler saves current block progress
  - [ ] 6.6 Write tests: checkpoint save/load with block offsets, resume skips completed blocks

- [ ] Task 7: Create bz2 test fixtures and run full regression (AC: All)
  - [ ] 7.1 Create `apps/cli/tests/parser/fixtures/simple-article.xml.bz2` — bz2-compressed version of existing `simple-article.xml` fixture
  - [ ] 7.2 Create a small multistream bz2 fixture with 2-3 blocks and corresponding index file
  - [ ] 7.3 Write end-to-end test: bz2 single-stream → full parse → same output as XML
  - [ ] 7.4 Write end-to-end test: multistream parallel (2 streams) → full parse → correct output
  - [ ] 7.5 Write end-to-end test: multistream resume from checkpoint → skips completed blocks
  - [ ] 7.6 Run `pnpm --filter @wikirag/cli test` — all new and existing tests pass
  - [ ] 7.7 Run `pnpm build` — full monorepo build succeeds

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

{{agent_model_name_version}}

### Debug Log References

### Completion Notes List

### File List
