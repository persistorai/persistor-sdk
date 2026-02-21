import { describe, it, expect, beforeEach } from 'vitest';
import { PersistorClient } from '../src/client.js';
import {
  PersistorError,
  NotFoundError,
  AuthenticationError,
  ValidationError,
  TimeoutError,
  ConnectionError,
} from '../src/errors.js';
import type { PersistorNode, PersistorContext } from '../src/types.js';

function mockFetch(status: number, body: unknown): typeof globalThis.fetch {
  return (async () => ({
    ok: status >= 200 && status < 300,
    status,
    text: async () => JSON.stringify(body),
  })) as unknown as typeof globalThis.fetch;
}

function mockFetchCapture(
  status: number,
  body: unknown,
): { fetch: typeof globalThis.fetch; calls: { url: string; init: RequestInit }[] } {
  const calls: { url: string; init: RequestInit }[] = [];
  const fetch = ((url: string, init: RequestInit) => {
    calls.push({ url, init });
    return Promise.resolve({
      ok: status >= 200 && status < 300,
      status,
      text: async () => JSON.stringify(body),
    });
  }) as unknown as typeof globalThis.fetch;
  return { fetch, calls };
}

const NODE: PersistorNode = {
  id: 'n1',
  type: 'person',
  label: 'Alice',
  properties: { age: 30 },
  salience_score: 0.8,
  created_at: '2024-01-01T00:00:00Z',
  updated_at: '2024-01-01T00:00:00Z',
};

function makeClient(fetch: typeof globalThis.fetch) {
  return new PersistorClient({
    url: 'http://localhost:3030',
    apiKey: 'test-key',
    fetch,
  });
}

describe('PersistorClient', () => {
  describe('constructor', () => {
    it('rejects non-localhost URLs without allowRemote', () => {
      expect(
        () =>
          new PersistorClient({
            url: 'https://example.com',
            apiKey: 'key',
            fetch: mockFetch(200, {}),
          }),
      ).toThrow('allowRemote');
    });

    it('allows non-localhost URLs with allowRemote', () => {
      const client = new PersistorClient({
        url: 'https://example.com',
        apiKey: 'key',
        fetch: mockFetch(200, {}),
        allowRemote: true,
      });
      expect(client).toBeDefined();
    });
  });

  describe('health', () => {
    it('calls /health without auth', async () => {
      const { fetch, calls } = mockFetchCapture(200, { status: 'ok' });
      const client = makeClient(fetch);
      const res = await client.health();
      expect(res).toEqual({ status: 'ok' });
      expect(calls[0].url).toContain('/api/v1/health');
      expect(calls[0].init.headers).not.toHaveProperty('Authorization');
    });

    it('calls /ready without auth', async () => {
      const { fetch, calls } = mockFetchCapture(200, { status: 'ok' });
      const client = makeClient(fetch);
      await client.ready();
      expect(calls[0].url).toContain('/api/v1/ready');
    });
  });

  describe('nodes', () => {
    it('lists nodes', async () => {
      const client = makeClient(mockFetch(200, [NODE]));
      const nodes = await client.listNodes();
      expect(nodes).toEqual([NODE]);
    });

    it('creates a node', async () => {
      const { fetch, calls } = mockFetchCapture(201, NODE);
      const client = makeClient(fetch);
      const res = await client.createNode({ type: 'person', label: 'Alice' });
      expect(res).toEqual(NODE);
      expect(calls[0].init.method).toBe('POST');
    });

    it('gets a node', async () => {
      const client = makeClient(mockFetch(200, NODE));
      const res = await client.getNode('n1');
      expect(res).toEqual(NODE);
    });

    it('updates a node', async () => {
      const { fetch, calls } = mockFetchCapture(200, NODE);
      const client = makeClient(fetch);
      await client.updateNode('n1', { label: 'Bob' });
      expect(calls[0].init.method).toBe('PUT');
    });

    it('patches node properties', async () => {
      const { fetch, calls } = mockFetchCapture(200, NODE);
      const client = makeClient(fetch);
      await client.patchNodeProperties('n1', { age: 31 });
      expect(calls[0].init.method).toBe('PATCH');
      expect(calls[0].url).toContain('/properties');
    });

    it('deletes a node', async () => {
      const { fetch, calls } = mockFetchCapture(204, '');
      const client = makeClient(fetch);
      await client.deleteNode('n1');
      expect(calls[0].init.method).toBe('DELETE');
    });

    it('gets node history', async () => {
      const client = makeClient(mockFetch(200, []));
      const res = await client.getNodeHistory('n1');
      expect(res).toEqual([]);
    });
  });

  describe('search', () => {
    it('does full-text search', async () => {
      const { fetch, calls } = mockFetchCapture(200, []);
      const client = makeClient(fetch);
      await client.search({ q: 'hello', limit: 5 });
      expect(calls[0].url).toContain('/search?q=hello&limit=5');
    });

    it('does semantic search', async () => {
      const { fetch, calls } = mockFetchCapture(200, []);
      const client = makeClient(fetch);
      await client.searchSemantic({ q: 'hello' });
      expect(calls[0].url).toContain('/search/semantic?q=hello');
    });

    it('does hybrid search', async () => {
      const { fetch, calls } = mockFetchCapture(200, []);
      const client = makeClient(fetch);
      await client.searchHybrid({ q: 'hello' });
      expect(calls[0].url).toContain('/search/hybrid?q=hello');
    });
  });

  describe('graph', () => {
    it('gets context', async () => {
      const ctx: PersistorContext = { node: NODE, neighbors: [], edges: [] };
      const client = makeClient(mockFetch(200, ctx));
      const res = await client.getContext('n1');
      expect(res).toEqual(ctx);
    });

    it('gets path', async () => {
      const { fetch, calls } = mockFetchCapture(200, { nodes: [], edges: [] });
      const client = makeClient(fetch);
      await client.getPath('a', 'b');
      expect(calls[0].url).toContain('/graph/path/a/b');
    });

    it('traverses', async () => {
      const { fetch, calls } = mockFetchCapture(200, []);
      const client = makeClient(fetch);
      await client.traverse('n1', { depth: 3 });
      expect(calls[0].url).toContain('/graph/traverse/n1?depth=3');
    });
  });

  describe('error handling', () => {
    it('throws NotFoundError on 404', async () => {
      const client = makeClient(mockFetch(404, { error: 'not found' }));
      await expect(client.getNode('x')).rejects.toThrow(NotFoundError);
    });

    it('throws AuthenticationError on 401', async () => {
      const client = makeClient(mockFetch(401, { error: 'unauthorized' }));
      await expect(client.listNodes()).rejects.toThrow(AuthenticationError);
    });

    it('throws AuthenticationError on 403', async () => {
      const client = makeClient(mockFetch(403, { error: 'forbidden' }));
      await expect(client.listNodes()).rejects.toThrow(AuthenticationError);
    });

    it('throws ValidationError on 400', async () => {
      const client = makeClient(mockFetch(400, { error: 'bad request' }));
      await expect(client.createNode({ type: '', label: '' })).rejects.toThrow(ValidationError);
    });

    it('throws ValidationError on 422', async () => {
      const client = makeClient(mockFetch(422, { error: 'unprocessable' }));
      await expect(client.createNode({ type: '', label: '' })).rejects.toThrow(ValidationError);
    });

    it('throws ConnectionError on network failure', async () => {
      const fetch = (() => Promise.reject(new TypeError('fetch failed'))) as unknown as typeof globalThis.fetch;
      const client = makeClient(fetch);
      await expect(client.health()).rejects.toThrow(ConnectionError);
    });

    it('throws PersistorError on other status codes', async () => {
      const client = makeClient(mockFetch(500, { error: 'internal' }));
      await expect(client.listNodes()).rejects.toThrow(PersistorError);
    });
  });

  describe('auth headers', () => {
    it('sends auth on authenticated endpoints', async () => {
      const { fetch, calls } = mockFetchCapture(200, []);
      const client = makeClient(fetch);
      await client.listNodes();
      const headers = calls[0].init.headers as Record<string, string>;
      expect(headers['Authorization']).toBe('Bearer test-key');
    });

    it('skips auth on health endpoints', async () => {
      const { fetch, calls } = mockFetchCapture(200, { status: 'ok' });
      const client = makeClient(fetch);
      await client.health();
      const headers = calls[0].init.headers as Record<string, string>;
      expect(headers['Authorization']).toBeUndefined();
    });
  });
});
