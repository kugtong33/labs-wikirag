/**
 * Ollama health check and discovery utilities
 *
 * @module embeddings/providers/ollama-health
 */

/**
 * Default connection timeout in milliseconds
 */
const DEFAULT_TIMEOUT_MS = 5000;

/**
 * Shape of the Ollama /api/tags response
 */
interface OllamaTagsResponse {
  models: Array<{ name: string; [key: string]: unknown }>;
}

/**
 * Check whether an Ollama server is reachable
 *
 * @param baseUrl - Ollama server base URL (e.g. 'http://localhost:11434')
 * @param timeoutMs - Connection timeout in milliseconds (default: 5000)
 * @returns true if the server responds with a 2xx status
 *
 * @example
 * ```typescript
 * const alive = await checkOllamaConnection('http://localhost:11434');
 * if (!alive) console.warn('Ollama is not running');
 * ```
 */
export async function checkOllamaConnection(
  baseUrl: string,
  timeoutMs: number = DEFAULT_TIMEOUT_MS
): Promise<boolean> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const res = await fetch(baseUrl, { signal: controller.signal });
    clearTimeout(timeoutId);
    return res.ok;
  } catch {
    clearTimeout(timeoutId);
    return false;
  }
}

/**
 * List models currently available in the Ollama server
 *
 * @param baseUrl - Ollama server base URL (e.g. 'http://localhost:11434')
 * @param timeoutMs - Connection timeout in milliseconds (default: 5000)
 * @returns Array of model name strings (e.g. ['nomic-embed-text:latest', ...])
 * @throws Error if the server is unreachable, returns an error status, or times out
 *
 * @example
 * ```typescript
 * const models = await listAvailableModels('http://localhost:11434');
 * console.log(models); // ['nomic-embed-text:latest', 'qwen3-embedding:latest']
 * ```
 */
export async function listAvailableModels(
  baseUrl: string,
  timeoutMs: number = DEFAULT_TIMEOUT_MS
): Promise<string[]> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const res = await fetch(`${baseUrl}/api/tags`, { signal: controller.signal });
    clearTimeout(timeoutId);

    if (!res.ok) {
      throw new Error(`Failed to list models: ${res.status} ${res.statusText}`);
    }

    const data = (await res.json()) as OllamaTagsResponse;
    return data.models.map((m) => m.name);
  } catch (error) {
    clearTimeout(timeoutId);

    if (error instanceof Error && error.name === 'AbortError') {
      throw new Error(`Connection to ${baseUrl} timed out after ${timeoutMs}ms`);
    }

    throw error;
  }
}
