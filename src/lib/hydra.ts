import type { MemoryNode, RecalledChunk, GraphRelation } from "./types";
import { traceOp } from "./trace";

const BASE = (process.env.HYDRADB_BASE_URL ?? "https://api.hydradb.com").replace(/\/$/, "");
const KEY = process.env.HYDRADB_API_KEY ?? "";
const TENANT = "default-tenant";

function headers(): Record<string, string> {
  return { Authorization: `Bearer ${KEY}`, "API-Version": "2" };
}

async function hFetch(path: string, init: RequestInit): Promise<unknown> {
  const res = await fetch(`${BASE}${path}`, init);
  const json = (await res.json()) as { success: boolean; data: unknown; error: unknown };
  if (!json.success) throw new Error(`HydraDB ${path} error: ${JSON.stringify(json.error)}`);
  return json.data;
}

export async function upsertNode(node: MemoryNode, subTenantId?: string): Promise<string> {
  const t0 = Date.now();
  const form = new FormData();
  form.append("tenant_id", TENANT);
  if (subTenantId) form.append("sub_tenant_id", subTenantId);
  form.append("text", node.text);
  form.append("infer", "true");
  form.append(
    "memory_metadata",
    JSON.stringify({ nodeId: node.nodeId, kind: node.kind, label: node.label, ...(node.data ?? {}) }),
  );

  const data = (await hFetch("/memories/add_memory", {
    method: "POST",
    headers: headers(),
    body: form,
  })) as { memory_id: string };

  traceOp("write", `write: ${node.kind} ${node.label}`, `memory_id=${data.memory_id}`, Date.now() - t0);
  return data.memory_id;
}

export async function addEdge(
  fromLabel: string,
  rel: string,
  toLabel: string,
  subTenantId?: string,
): Promise<string> {
  const t0 = Date.now();
  const text = `${fromLabel} ${rel} ${toLabel}. Relationship: ${fromLabel} is related to ${toLabel} via ${rel}.`;
  const form = new FormData();
  form.append("tenant_id", TENANT);
  if (subTenantId) form.append("sub_tenant_id", subTenantId);
  form.append("text", text);
  form.append("infer", "true");
  form.append("memory_metadata", JSON.stringify({ rel, fromLabel, toLabel, isEdge: true }));

  const data = (await hFetch("/memories/add_memory", {
    method: "POST",
    headers: headers(),
    body: form,
  })) as { memory_id: string };

  traceOp("write", `write: edge ${fromLabel} -[${rel}]→ ${toLabel}`, `memory_id=${data.memory_id}`, Date.now() - t0);
  return data.memory_id;
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
    limit: opts.limit ?? 8,
    mode: "fast",
  };
  if (opts.subTenantId) body.sub_tenant_id = opts.subTenantId;
  if (opts.kinds?.length) body.filters = { kind: opts.kinds[0] };

  const data = (await hFetch("/recall/full_recall", {
    method: "POST",
    headers: { ...headers(), "Content-Type": "application/json" },
    body: JSON.stringify(body),
  })) as { chunks?: Array<{ chunk_id?: string; source_id?: string; content: string; score: number; metadata?: Record<string, unknown> }> };

  const chunks = (data.chunks ?? []).map((c) => ({
    memoryId: (c.source_id ?? c.chunk_id ?? "") as string,
    kind: (c.metadata?.kind ?? "") as string,
    label: (c.metadata?.label ?? "") as string,
    content: c.content,
    score: c.score,
  }));

  // client-side kind filter if API doesn't support it
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

  const data = (await hFetch(`/list/graph_relations_by_id?${params}`, {
    method: "GET",
    headers: headers(),
  })) as { relations?: Array<{ subject?: string; predicate?: string; object?: string; head?: string; relation?: string; tail?: string }> };

  const raw = data.relations ?? [];
  const relations: GraphRelation[] = raw.map((r) => ({
    subject: (r.subject ?? r.head ?? "") as string,
    predicate: (r.predicate ?? r.relation ?? "") as string,
    object: (r.object ?? r.tail ?? "") as string,
  }));

  const filtered = opts.rel
    ? relations.filter((r) => r.predicate.toUpperCase().includes(opts.rel!.toUpperCase()))
    : relations;

  traceOp(
    "traverse",
    `traverse: memoryId=${opts.memoryId.slice(0, 16)}…`,
    `${filtered.length} relations`,
    Date.now() - t0,
  );
  return filtered;
}
