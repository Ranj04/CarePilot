import { upsertNode, addEdge, recall as hydraRecall, traverse as hydraTraverse } from "./hydra";
import type { MemoryEvent, RecalledChunk, GraphRelation } from "./types";

function subTenant(patientId: string): string {
  return `patient-${patientId}`;
}

export async function capture(
  events: MemoryEvent[],
  patientId: string,
): Promise<string[]> {
  const st = subTenant(patientId);
  const ids: string[] = [];

  for (const ev of events) {
    const nodeId = `${ev.kind.toLowerCase()}-${ev.label.toLowerCase().replace(/\s+/g, "-")}`;
    const memId = await upsertNode(
      { nodeId, kind: ev.kind, label: ev.label, text: ev.text, data: ev.data },
      st,
    );
    ids.push(memId);

    if (ev.relations) {
      for (const r of ev.relations) {
        await addEdge(ev.label, r.rel, r.toLabel, st);
      }
    }
  }

  return ids;
}

export async function contextRecall(
  query: string,
  patientId: string,
  kinds?: string[],
): Promise<RecalledChunk[]> {
  return hydraRecall({ query, kinds, subTenantId: subTenant(patientId) });
}

export async function relate(
  memoryId: string,
  patientId: string,
  rel?: string,
): Promise<GraphRelation[]> {
  return hydraTraverse({ memoryId, rel, subTenantId: subTenant(patientId) });
}
