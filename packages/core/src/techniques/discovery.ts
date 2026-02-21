/**
 * Technique discovery and startup registration.
 *
 * Discovers technique modules under `packages/core/src/techniques/<name>/index.*`
 * and invokes their registration export at startup.
 *
 * @module core/techniques/discovery
 */

import * as fs from 'node:fs/promises';
import type { Dirent } from 'node:fs';
import * as R from 'ramda';
import { fileURLToPath, pathToFileURL } from 'node:url';
import path from 'node:path';

type RegisterFn = () => void | Promise<void>;

/** Export shape expected from technique modules for auto-discovery. */
interface TechniqueModuleExports {
  registerTechnique?: RegisterFn;
  [key: string]: unknown;
}

/** Discovery result for observability and tests. */
export interface TechniqueDiscoveryResult {
  discoveredModules: string[];
  registeredModules: string[];
  skippedModules: string[];
}

/** Optional discovery configuration. */
export interface DiscoverTechniquesOptions {
  techniquesRoot?: string;
}

const MODULE_ENTRY_CANDIDATES = ['index.js', 'index.ts'] as const;

const hasRegisterPrefix = (entry: [string, unknown]): boolean => {
  const [name, value] = entry;
  return name.startsWith('register') && typeof value === 'function';
};

const toFunction = (value: unknown): RegisterFn => value as RegisterFn;

const resolveRegisterFunction = (mod: TechniqueModuleExports): RegisterFn | null => {
  if (typeof mod.registerTechnique === 'function') {
    return mod.registerTechnique;
  }

  const registerFns = R.pipe(
    Object.entries,
    R.filter(hasRegisterPrefix),
    R.map((pair: [string, unknown]) => toFunction(pair[1])),
  )(mod) as RegisterFn[];

  if (registerFns.length === 1) {
    return registerFns[0];
  }

  if (registerFns.length > 1) {
    throw new Error(
      'Multiple register* exports found. Export a single registerTechnique() function.',
    );
  }

  return null;
};

const fileExists = async (filePath: string): Promise<boolean> => {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
};

const resolveTechniqueModulePath = async (moduleDir: string): Promise<string | null> => {
  for (const candidate of MODULE_ENTRY_CANDIDATES) {
    const fullPath = path.join(moduleDir, candidate);
    if (await fileExists(fullPath)) {
      return fullPath;
    }
  }

  return null;
};

/**
 * Discover and register technique modules.
 *
 * A technique module is any subdirectory under `techniquesRoot` containing an
 * `index.js` or `index.ts` entry that exports a registration function.
 */
export async function discoverAndRegisterTechniques(
  options: DiscoverTechniquesOptions = {},
): Promise<TechniqueDiscoveryResult> {
  const defaultRoot = fileURLToPath(new URL('./', import.meta.url));
  const techniquesRoot = options.techniquesRoot ?? defaultRoot;

  const entries = await fs.readdir(techniquesRoot, { withFileTypes: true });
  const techniqueDirs = R.pipe(
    R.filter((entry: Dirent) => entry.isDirectory() && !entry.name.startsWith('.')),
    R.map((entry: Dirent) => entry.name),
    R.sortBy(R.identity),
  )(entries) as string[];

  const discoveredModules: string[] = [];
  const registeredModules: string[] = [];
  const skippedModules: string[] = [];

  for (const moduleName of techniqueDirs) {
    const moduleDir = path.join(techniquesRoot, moduleName);
    const modulePath = await resolveTechniqueModulePath(moduleDir);

    if (!modulePath) {
      skippedModules.push(moduleName);
      continue;
    }

    discoveredModules.push(moduleName);

    const moduleUrl = pathToFileURL(modulePath).href;
    const moduleExports = (await import(moduleUrl)) as TechniqueModuleExports;
    const registerTechnique = resolveRegisterFunction(moduleExports);

    if (!registerTechnique) {
      skippedModules.push(moduleName);
      continue;
    }

    await registerTechnique();
    registeredModules.push(moduleName);
  }

  return {
    discoveredModules,
    registeredModules,
    skippedModules,
  };
}
