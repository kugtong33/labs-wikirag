/**
 * Naive RAG — retrieval adapter
 *
 * Stage 3: embeds the processed query with an EmbeddingProvider, then
 * performs vector similarity search against a Qdrant collection.
 * Returns the top-k results as RetrievedDocument objects.
 *
 * @module core/techniques/naive-rag/retrieval-adapter
 */

import * as R from 'ramda';
import type { RetrievalAdapter } from '../../types/retrieval-adapter.js';
import type { PipelineContext, RetrievedDocument } from '../../types/pipeline-context.js';
import type { EmbeddingProvider } from '@wikirag/embeddings';
import type { SearchManager, SearchResult } from '@wikirag/qdrant';

/**
 * Map a Qdrant SearchResult to the pipeline's RetrievedDocument shape.
 *
 * Because the stored Qdrant payload contains metadata only (no raw text),
 * `content` is composed from the available fields: `articleTitle` and
 * `sectionName`. Once the indexing pipeline begins storing paragraph text
 * directly in the payload, this mapper can be updated to use it directly.
 */
function mapSearchResult(result: SearchResult): RetrievedDocument {
  const payload = result.payload;
  const section = payload.sectionName ? ` — ${payload.sectionName}` : '';
  const content = `${payload.articleTitle}${section}`;

  return {
    id: result.id,
    score: result.score,
    content,
    metadata: {
      articleTitle: payload.articleTitle,
      sectionName: payload.sectionName,
      paragraphPosition: payload.paragraphPosition,
      dumpVersion: payload.dumpVersion,
      embeddingModel: payload.embeddingModel,
    },
  };
}

/**
 * Naive RAG retrieval adapter.
 *
 * Embeds the query using the injected EmbeddingProvider, then
 * queries Qdrant for the top-k nearest neighbour paragraphs.
 *
 * @example
 * ```typescript
 * const adapter = new NaiveRagRetrievalAdapter(openAIProvider, searchManager);
 * const result = await adapter.execute(context);
 * // result.retrievedDocuments → top-k Wikipedia paragraphs
 * ```
 */
export class NaiveRagRetrievalAdapter implements RetrievalAdapter {
  readonly name = 'naive-rag-retrieval';

  constructor(
    private readonly embeddingProvider: EmbeddingProvider,
    private readonly searchManager: SearchManager,
  ) {}

  async execute(context: PipelineContext): Promise<PipelineContext> {
    const queryText = String(context.processedQuery ?? context.query);

    // Generate embedding for the query
    const queryVector = await this.embeddingProvider.embed(queryText);

    // Search Qdrant for nearest neighbours
    const searchResults = await this.searchManager.similaritySearch(
      context.config.collectionName,
      queryVector,
      context.config.topK,
      context.config.scoreThreshold,
    );

    // Map Qdrant results to pipeline RetrievedDocument format
    const retrievedDocuments: RetrievedDocument[] = R.map(mapSearchResult, searchResults);

    return { ...context, retrievedDocuments };
  }
}
