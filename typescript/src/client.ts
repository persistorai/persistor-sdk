import {
  PersistorError,
  NotFoundError,
  AuthenticationError,
  ValidationError,
  TimeoutError,
  ConnectionError,
} from './errors.js';
import type {
  PersistorClientConfig,
  FetchFn,
  PersistorNode,
  PersistorEdge,
  PersistorSearchResult,
  PersistorContext,
  GraphPath,
  CreateNodeInput,
  UpdateNodeInput,
  CreateEdgeInput,
  UpdateEdgeInput,
  SearchParams,
  TraverseParams,
  ListParams,
  AuditParams,
  HealthResponse,
  StatsResponse,
  NodeHistoryEntry,
  SupersedeInput,
  BulkNodesInput,
  BulkEdgesInput,
  BulkResult,
  AuditEntry,
  BackfillResult,
  SalienceResult,
} from './types.js';

const LOCALHOST_PREFIXES = ['http://localhost', 'http://127.0.0.1', 'http://[::1]'];

function isLocalhost(url: string): boolean {
  return LOCALHOST_PREFIXES.some((p) => url.startsWith(p));
}

function qs(params: Record<string, string | number | undefined | null>): string {
  const entries = Object.entries(params).filter(([, v]) => v !== undefined);
  if (entries.length === 0) return '';
  return '?' + entries.map(([k, v]) => `${k}=${encodeURIComponent(String(v))}`).join('&');
}

export class PersistorClient {
  private readonly baseUrl: string;
  private readonly apiKey: string;
  private readonly timeout: number;
  private readonly fetchFn: FetchFn;

  constructor(config: PersistorClientConfig) {
    this.baseUrl = config.url.replace(/\/+$/, '');
    this.apiKey = config.apiKey;
    this.timeout = config.timeout ?? 5000;
    this.fetchFn = config.fetch ?? globalThis.fetch;

    if (!isLocalhost(this.baseUrl) && !config.allowRemote) {
      throw new PersistorError(
        `Refusing non-localhost URL: ${this.baseUrl}. Pass allowRemote: true to allow.`,
        '',
      );
    }
  }

  private async request<T>(
    method: string,
    path: string,
    body?: unknown,
    auth = true,
  ): Promise<T> {
    const url = `${this.baseUrl}/api/v1${path}`;
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (auth) headers['Authorization'] = `Bearer ${this.apiKey}`;

    let res: Response;
    try {
      res = await this.fetchFn(url, {
        method,
        headers,
        body: body !== undefined ? JSON.stringify(body) : undefined,
        signal: AbortSignal.timeout(this.timeout),
      });
    } catch (err: unknown) {
      if (err instanceof DOMException && err.name === 'TimeoutError') {
        throw new TimeoutError(path);
      }
      const msg = err instanceof Error ? err.message : String(err);
      throw new ConnectionError(msg, path);
    }

    if (!res.ok) {
      const text = await res.text().catch(() => '');
      this.throwForStatus(res.status, path, text);
    }

    const text = await res.text();
    if (!text) return undefined as T;
    return JSON.parse(text) as T;
  }

  private throwForStatus(status: number, path: string, body: string): never {
    const msg = body || `HTTP ${status}`;
    if (status === 404) throw new NotFoundError(msg, path);
    if (status === 401 || status === 403)
      throw new AuthenticationError(msg, path, status as 401 | 403);
    if (status === 400 || status === 422)
      throw new ValidationError(msg, path, status as 400 | 422);
    throw new PersistorError(msg, path, status);
  }

  // ── Health (unauthenticated) ──

  async health(): Promise<HealthResponse> {
    return this.request('GET', '/health', undefined, false);
  }

  async ready(): Promise<HealthResponse> {
    return this.request('GET', '/ready', undefined, false);
  }

  // ── Nodes ──

  async listNodes(params?: ListParams): Promise<PersistorNode[]> {
    return this.request('GET', `/nodes${qs({ ...params })}`);
  }

  async createNode(input: CreateNodeInput): Promise<PersistorNode> {
    return this.request('POST', '/nodes', input);
  }

  async getNode(id: string): Promise<PersistorNode> {
    return this.request('GET', `/nodes/${encodeURIComponent(id)}`);
  }

  async updateNode(id: string, input: UpdateNodeInput): Promise<PersistorNode> {
    return this.request('PUT', `/nodes/${encodeURIComponent(id)}`, input);
  }

  async patchNodeProperties(
    id: string,
    properties: Record<string, unknown>,
  ): Promise<PersistorNode> {
    return this.request('PATCH', `/nodes/${encodeURIComponent(id)}/properties`, properties);
  }

  async deleteNode(id: string): Promise<void> {
    return this.request('DELETE', `/nodes/${encodeURIComponent(id)}`);
  }

  async getNodeHistory(id: string): Promise<NodeHistoryEntry[]> {
    return this.request('GET', `/nodes/${encodeURIComponent(id)}/history`);
  }

  // ── Edges ──

  async listEdges(params?: ListParams): Promise<PersistorEdge[]> {
    return this.request('GET', `/edges${qs({ ...params })}`);
  }

  async createEdge(input: CreateEdgeInput): Promise<PersistorEdge> {
    return this.request('POST', '/edges', input);
  }

  async updateEdge(
    source: string,
    target: string,
    relation: string,
    input: UpdateEdgeInput,
  ): Promise<PersistorEdge> {
    const s = encodeURIComponent(source);
    const t = encodeURIComponent(target);
    const r = encodeURIComponent(relation);
    return this.request('PUT', `/edges/${s}/${t}/${r}`, input);
  }

  async patchEdgeProperties(
    source: string,
    target: string,
    relation: string,
    properties: Record<string, unknown>,
  ): Promise<PersistorEdge> {
    const s = encodeURIComponent(source);
    const t = encodeURIComponent(target);
    const r = encodeURIComponent(relation);
    return this.request('PATCH', `/edges/${s}/${t}/${r}/properties`, properties);
  }

  async deleteEdge(source: string, target: string, relation: string): Promise<void> {
    const s = encodeURIComponent(source);
    const t = encodeURIComponent(target);
    const r = encodeURIComponent(relation);
    return this.request('DELETE', `/edges/${s}/${t}/${r}`);
  }

  // ── Search ──

  async search(params: SearchParams): Promise<PersistorSearchResult[]> {
    return this.request('GET', `/search${qs({ ...params })}`);
  }

  async searchSemantic(params: SearchParams): Promise<PersistorSearchResult[]> {
    return this.request('GET', `/search/semantic${qs({ ...params })}`);
  }

  async searchHybrid(params: SearchParams): Promise<PersistorSearchResult[]> {
    return this.request('GET', `/search/hybrid${qs({ ...params })}`);
  }

  // ── Graph traversal ──

  async getNeighbors(id: string): Promise<PersistorNode[]> {
    return this.request('GET', `/graph/neighbors/${encodeURIComponent(id)}`);
  }

  async traverse(id: string, params?: TraverseParams): Promise<PersistorNode[]> {
    return this.request('GET', `/graph/traverse/${encodeURIComponent(id)}${qs({ ...params })}`);
  }

  async getContext(id: string): Promise<PersistorContext> {
    return this.request('GET', `/graph/context/${encodeURIComponent(id)}`);
  }

  async getPath(from: string, to: string): Promise<GraphPath> {
    return this.request(
      'GET',
      `/graph/path/${encodeURIComponent(from)}/${encodeURIComponent(to)}`,
    );
  }

  // ── Bulk operations ──

  async bulkCreateNodes(input: BulkNodesInput): Promise<BulkResult> {
    return this.request('POST', '/bulk/nodes', input);
  }

  async bulkCreateEdges(input: BulkEdgesInput): Promise<BulkResult> {
    return this.request('POST', '/bulk/edges', input);
  }

  // ── Salience ──

  async boostSalience(id: string): Promise<SalienceResult> {
    return this.request('POST', `/salience/boost/${encodeURIComponent(id)}`);
  }

  async supersede(input: SupersedeInput): Promise<SalienceResult> {
    return this.request('POST', '/salience/supersede', input);
  }

  async recalcSalience(): Promise<SalienceResult> {
    return this.request('POST', '/salience/recalc');
  }

  // ── Admin ──

  async getStats(): Promise<StatsResponse> {
    return this.request('GET', '/stats');
  }

  async backfillEmbeddings(): Promise<BackfillResult> {
    return this.request('POST', '/admin/backfill-embeddings');
  }

  // ── Audit ──

  async queryAudit(params?: AuditParams): Promise<AuditEntry[]> {
    return this.request('GET', `/audit${qs({ ...params })}`);
  }

  async purgeAudit(): Promise<void> {
    return this.request('DELETE', '/audit');
  }
}
