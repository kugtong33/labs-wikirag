#!/usr/bin/env node
/**
 * WikiRAG CLI
 *
 * Command-line interface for Wikipedia RAG operations
 *
 * @module index
 */

import { Command } from 'commander';
import { createIndexCommand } from './cli/commands/index-command.js';

/**
 * Main CLI program
 */
async function main() {
  const program = new Command();

  program
    .name('wikirag-cli')
    .description('Wikipedia RAG indexing and management CLI')
    .version('0.0.0');

  // Register commands
  program.addCommand(createIndexCommand());

  // Parse command line arguments
  await program.parseAsync(process.argv);
}

// Run main program
main().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
