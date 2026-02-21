/**
 * WikiRAG API server entry point.
 *
 * Registers techniques, creates the Express app, and starts listening.
 *
 * @module api
 */

import { discoverAndRegisterTechniques } from '@wikirag/core';
import { createApp, logger } from './server.js';

// Discover and register all RAG techniques at startup
await discoverAndRegisterTechniques();

const port = Number(process.env.PORT ?? 3000);
const app = createApp();

app.listen(port, () => {
  logger.info({ port }, 'WikiRAG API server started');
});
