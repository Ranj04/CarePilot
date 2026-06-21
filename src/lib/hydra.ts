import type { MemoryNode, RecalledChunk, GraphRelation } from "./types";
import { traceOp } from "./trace";

const BASE = (process.env.HYDRADB_BASE_URL ?? "https://api.hydradb.com").replace(/\/$/, "");
const KEY = process.env.HYDRADB_API_KEY ?? "";
const TENANT = process.env.HYDRADB_TENANT_ID ?? "default-tenant";

function authHeaders(): Record<string, string> {
  return { Authorization: `Bearer ${KEY}`, "API-Version": "2", "Content-Type": "application/json" };
}

// For endpoints that return {success, ...} (add_memory)
async function hPost(path: string, body: unknown): Promise<unknown> {
  const res = await fetch(`${BASE}${path}`, {
    method: "POST",
    headers: authHeaders(),
    body: JSON.stringify(body),
  });
  const json = (await res.json()) as { success: boolean; message?: string; [k: string]: unknown };
  if (!json.success) throw new Error(`HydraDB ${path}: ${json.message ?? JSON.stringify(json)}`);
  return json;
}

// For endpoints that return data directly (recall)
async function hPostDirect(path: string, body: unknown): Promise<unknown> {
  const res = await fetch(`${BASE}${path}`, {
    method: "POST",
    headers: authHeaders(),
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`HydraDB ${path} ${res.status}: ${await res.text().then((t) => t.slice(0, 200))}`);
  return res.json();
}

// For GET endpoints
async function hGet(path: string): Promise<unknown> {
  const res = await fetch(`${BASE}${path}`, { headers: authHeaders() });
  if (!res.ok) throw new Error(`HydraDB GET ${path} ${res.status}: ${await res.text().then((t) => t.slice(0, 200))}`);
  return res.json();
}

export async function upsertNode(node: MemoryNode, subTenantId?: string): Promise<string> {
  const t0 = Date.now();
  const body: Record<string, unknown> = {
    tenant_id: TENANT,
    upsert: true,
    memories: [{
      source_id: node.nodeId,
      text: node.text,
      infer: true,
      metadata: { kind: node.kind, label: node.label, ...(node.data ?? {}) },
    }],
  };
  if (subTenantId) body.sub_tenant_id = subTenantId;

  const resp = (await hPost("/memories/add_memory", body)) as { results: Array<{ source_id: string }> };
  const sourceId = resp.results?.[0]?.source_id ?? node.nodeId;
  traceOp("write", `write: ${node.kind} ${node.label}`, `source_id=${sourceId}`, Date.now() - t0);
  return sourceId;
}

export async function addEdge(
  fromLabel: string,
  rel: string,
  toLabel: string,
  subTenantId?: string,
): Promise<string> {
  const t0 = Date.now();
  const text = `${fromLabel} ${rel} ${toLabel}. Relationship: ${fromLabel} is connected to ${toLabel} via ${rel}.`;
  const body: Record<string, unknown> = {
    tenant_id: TENANT,
    upsert: true,
    memories: [{
      text,
      infer: true,
      metadata: { rel, fromLabel, toLabel, isEdge: true },
    }],
  };
  if (subTenantId) body.sub_tenant_id = subTenantId;

  const resp = (await hPost("/memories/add_memory", body)) as { results: Array<{ source_id: string }> };
  const sourceId = resp.results?.[0]?.source_id ?? "";
  traceOp("write", `write: edge ${fromLabel} -[${rel}]→ ${toLabel}`, `source_id=${sourceId}`, Date.now() - t0);
  return sourceId;
}

export async function recall(opts: {
  query: string;
  kinds?: string[];
  subTenantId?: string;
  limit?: number;
}): Promise<RecalledChunk[]> {
  const t0 = Date.now();
  const body: Record<string, unknown> = {
    tenant_id: TENANT,
    query: opts.query,
    max_results: opts.limit ?? 8,
    mode: "fast",
    graph_context: true,
  };
  if (opts.subTenantId) body.sub_tenant_id = opts.subTenantId;

  const data = (await hPostDirect("/recall/recall_preferences", body)) as {
    chunks?: Array<{ chunk_uuid?: string; source_id?: string; chunk_content?: string; content?: string; relevancy_score?: number; score?: number; metadata?: Record<string, unknown> }>;
  };

  const chunks = (data.chunks ?? []).map((c) => ({
    memoryId: (c.source_id ?? c.chunk_uuid ?? "") as string,
    kind: (c.metadata?.kind ?? "") as string,
    label: (c.metadata?.label ?? "") as string,
    content: (c.chunk_content ?? c.content ?? "") as string,
    score: (c.relevancy_score ?? c.score ?? 0) as number,
  }));

  const filtered = opts.kinds?.length
    ? chunks.filter((c) => opts.kinds!.includes(c.kind) || c.kind === "")
    : chunks;

  traceOp("recall", `recall: ${opts.query.slice(0, 50)}`, `${filtered.length} chunks`, Date.now() - t0);
  return filtered;
}

export async function traverse(opts: {
  memoryId: string;
  rel?: string;
  subTenantId?: string;
}): Promise<GraphRelation[]> {
  const t0 = Date.now();
  const params = new URLSearchParams({
    tenant_id: TENANT,
    source_id: opts.memoryId,
    is_memory: "true",
    limit: "100",
  });
  if (opts.subTenantId) params.set("sub_tenant_id", opts.subTenantId);

  const data = (await hGet(`/list/graph_relations_by_id?${params}`)) as {
    relations?: Array<{ canonical_predicate?: string; raw_predicate?: string; context?: string; subject?: string; predicate?: string; object?: string }>;
  };

  const raw = data.relations ?? [];
  const relations: GraphRelation[] = raw.map((r) => ({
    subject: r.subject ?? "",
    predicate: r.canonical_predicate ?? r.predicate ?? r.raw_predicate ?? "",
    object: r.object ?? r.context ?? "",
  }));

  const filtered = opts.rel
    ? relations.filter((r) => r.predicate.toUpperCase().includes(opts.rel!.toUpperCase()))
    : relations;

  traceOp("traverse", `traverse: ${opts.memoryId.slice(0, 20)}…`, `${filtered.length} relations`, Date.now() - t0);
  return filtered;
}
