import * as fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { discoverAndRegisterTechniques } from '../../src/techniques/discovery.js';

async function createTechniqueModule(
  root: string,
  moduleName: string,
  source: string,
): Promise<void> {
  const moduleDir = path.join(root, moduleName);
  await fs.mkdir(moduleDir, { recursive: true });
  await fs.writeFile(path.join(moduleDir, 'index.js'), source, 'utf8');
}

describe('discoverAndRegisterTechniques', () => {
  let techniquesRoot: string;

  beforeEach(async () => {
    techniquesRoot = await fs.mkdtemp(path.join(os.tmpdir(), 'wikirag-techniques-'));
  });

  afterEach(async () => {
    await fs.rm(techniquesRoot, { recursive: true, force: true });
  });

  it('discovers and registers modules exporting registerTechnique', async () => {
    await createTechniqueModule(
      techniquesRoot,
      'alpha-rag',
      'export async function registerTechnique() {}',
    );
    await createTechniqueModule(
      techniquesRoot,
      'beta-rag',
      'export function registerTechnique() {}',
    );

    const result = await discoverAndRegisterTechniques({ techniquesRoot });

    expect(result.discoveredModules).toEqual(['alpha-rag', 'beta-rag']);
    expect(result.registeredModules).toEqual(['alpha-rag', 'beta-rag']);
    expect(result.skippedModules).toEqual([]);
  });

  it('accepts a single fallback register* export', async () => {
    await createTechniqueModule(
      techniquesRoot,
      'gamma-rag',
      'export function registerGamma() {}',
    );

    const result = await discoverAndRegisterTechniques({ techniquesRoot });

    expect(result.discoveredModules).toEqual(['gamma-rag']);
    expect(result.registeredModules).toEqual(['gamma-rag']);
    expect(result.skippedModules).toEqual([]);
  });

  it('skips modules that do not export registration function', async () => {
    await createTechniqueModule(
      techniquesRoot,
      'delta-rag',
      'export const name = "delta-rag";',
    );

    const result = await discoverAndRegisterTechniques({ techniquesRoot });

    expect(result.discoveredModules).toEqual(['delta-rag']);
    expect(result.registeredModules).toEqual([]);
    expect(result.skippedModules).toEqual(['delta-rag']);
  });

  it('throws when module exports multiple register* functions', async () => {
    await createTechniqueModule(
      techniquesRoot,
      'epsilon-rag',
      'export function registerOne() {} export function registerTwo() {}',
    );

    await expect(
      discoverAndRegisterTechniques({ techniquesRoot }),
    ).rejects.toThrow(/Multiple register\* exports found/);
  });
});
