// ── Core entities ──

export interface PersistorNode {
  id: string;
  type: string;
  label: string;
  properties: Record<string, unknown>;
  salience_score: number;
  created_at: string;
  updated_at: string;
}

export interface PersistorEdge {
  source: string;
  target: string;
  relation: string;
  type?: string;
  weight?: number;
  properties?: Record<string, unknown>;
}

export interface PersistorSearchResult {
  id: string;
  type: string;
  label: string;
  properties: Record<string, unknown>;
  salience_score: number;
  score?: number;
}

export interface PersistorContext {
  node: PersistorNode;
  neighbors: PersistorNode[];
  edges: PersistorEdge[];
}

export interface GraphPath {
  nodes: PersistorNode[];
  edges: PersistorEdge[];
}

// ── Input types ──

export interface CreateNodeInput {
  type: string;
  label: string;
  properties?: Record<string, unknown>;
}

export interface UpdateNodeInput {
  type?: string;
  label?: string;
  properties?: Record<string, unknown>;
}

export interface CreateEdgeInput {
  source: string;
  target: string;
  relation: string;
  type?: string;
  weight?: number;
  properties?: Record<string, unknown>;
}

export interface UpdateEdgeInput {
  type?: string;
  weight?: number;
  properties?: Record<string, unknown>;
}

// ── Query params ──

export interface SearchParams {
  q: string;
  limit?: number;
}

export interface TraverseParams {
  depth?: number;
}

export interface ListParams {
  limit?: number;
  offset?: number;
}

export interface AuditParams {
  limit?: number;
  offset?: number;
  entity_id?: string;
  action?: string;
}

// ── Response types ──

export interface HealthResponse {
  status: string;
}

export interface StatsResponse {
  nodes: number;
  edges: number;
  [key: string]: unknown;
}

export interface NodeHistoryEntry {
  id: string;
  node_id: string;
  action: string;
  changes: Record<string, unknown>;
  timestamp: string;
}

export interface SupersedeInput {
  old_id: string;
  new_id: string;
}

export interface BulkNodesInput {
  nodes: CreateNodeInput[];
}

export interface BulkEdgesInput {
  edges: CreateEdgeInput[];
}

export interface BulkResult {
  created: number;
  updated: number;
  errors: number;
}

export interface AuditEntry {
  id: string;
  entity_id?: string;
  action: string;
  details: Record<string, unknown>;
  timestamp: string;
}

export interface BackfillResult {
  status: string;
  [key: string]: unknown;
}

export interface SalienceResult {
  id?: string;
  salience_score?: number;
  [key: string]: unknown;
}

// ── Client config ──

export type FetchFn = typeof globalThis.fetch;

export interface PersistorClientConfig {
  url: string;
  apiKey: string;
  timeout?: number;
  fetch?: FetchFn;
  allowRemote?: boolean;
}
