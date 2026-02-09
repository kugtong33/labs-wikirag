import { describe, it, expect, beforeEach } from 'vitest';
import { QdrantClientWrapper, QdrantError } from '../src/index.js';

describe('QdrantClientWrapper', () => {
  describe('constructor', () => {
    it('should use provided URL', () => {
      const client = new QdrantClientWrapper('http://custom:6333');
      expect(client.getUrl()).toBe('http://custom:6333');
    });

    it('should use QDRANT_URL from environment', () => {
      const originalEnv = process.env.QDRANT_URL;
      process.env.QDRANT_URL = 'http://env:6333';

      const client = new QdrantClientWrapper();
      expect(client.getUrl()).toBe('http://env:6333');

      process.env.QDRANT_URL = originalEnv;
    });

    it('should default to localhost:6333', () => {
      const originalEnv = process.env.QDRANT_URL;
      delete process.env.QDRANT_URL;

      const client = new QdrantClientWrapper();
      expect(client.getUrl()).toBe('http://localhost:6333');

      process.env.QDRANT_URL = originalEnv;
    });
  });

  describe('connection state', () => {
    it('should start as not connected', () => {
      const client = new QdrantClientWrapper();
      expect(client.isConnected()).toBe(false);
    });

    it('should throw error when getting client before connect', () => {
      const client = new QdrantClientWrapper();
      expect(() => client.getClient()).toThrow(QdrantError);
      expect(() => client.getClient()).toThrow('not connected');
    });
  });
});
