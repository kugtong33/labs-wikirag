import { QdrantClient } from '@qdrant/js-client-rest';
import { QdrantError } from './types.js';

/**
 * Default Qdrant URL for local development
 */
const DEFAULT_QDRANT_URL = 'http://localhost:6333';

/**
 * Wrapper class for Qdrant client with connection management
 * Reads configuration from environment variables
 */
export class QdrantClientWrapper {
  private client: QdrantClient | null = null;
  private url: string;
  private connected: boolean = false;

  /**
   * Create a new Qdrant client wrapper
   * @param url - Qdrant server URL (defaults to QDRANT_URL env var or localhost:6333)
   */
  constructor(url?: string) {
    this.url = url || process.env.QDRANT_URL || DEFAULT_QDRANT_URL;
  }

  /**
   * Connect to Qdrant server
   * Creates the client instance and verifies connectivity
   */
  async connect(): Promise<void> {
    try {
      this.client = new QdrantClient({ url: this.url });

      // Verify connection by checking cluster info
      await this.client.getCollections();

      this.connected = true;
    } catch (error) {
      throw new QdrantError(
        `Failed to connect to Qdrant at ${this.url}`,
        'connect',
        undefined,
        error as Error
      );
    }
  }

  /**
   * Check if Qdrant server is healthy and responsive
   * @returns true if server is healthy, false otherwise
   */
  async healthCheck(): Promise<boolean> {
    try {
      if (!this.client) {
        await this.connect();
      }

      // Simple health check - try to list collections
      await this.client!.getCollections();
      return true;
    } catch (error) {
      return false;
    }
  }

  /**
   * Get the underlying Qdrant client instance
   * @throws QdrantError if not connected
   */
  getClient(): QdrantClient {
    if (!this.client || !this.connected) {
      throw new QdrantError(
        'Qdrant client not connected. Call connect() first.',
        'getClient'
      );
    }
    return this.client;
  }

  /**
   * Check if client is connected
   */
  isConnected(): boolean {
    return this.connected;
  }

  /**
   * Get the configured Qdrant URL
   */
  getUrl(): string {
    return this.url;
  }
}

/**
 * Singleton instance of QdrantClientWrapper
 * Shared across the application
 */
export const qdrantClient = new QdrantClientWrapper();
