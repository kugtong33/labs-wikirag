/**
 * WikiRAG API server entry point.
 *
 * Registers techniques, creates the Express app, and starts listening.
 *
 * @module api
 */

import { registerNaiveRag } from '@wikirag/core';
import { createApp, logger } from './server.js';

// Register all RAG techniques at startup
registerNaiveRag();

const port = Number(process.env.PORT ?? 3000);
const app = createApp();

app.listen(port, () => {
  logger.info({ port }, 'WikiRAG API server started');
});
