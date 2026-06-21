import type { MemoryOp } from "./contract";

const BUFFER_SIZE = 50;
const ring: MemoryOp[] = [];

export function traceOp(
  op: MemoryOp["op"],
  label: string,
  detail: string,
  ms: number,
): MemoryOp {
  const entry: MemoryOp = { op, label, detail, ms, ts: new Date().toISOString() };
  ring.push(entry);
  if (ring.length > BUFFER_SIZE) ring.shift();
  console.log(`[hydra] ${op} | ${label} | ${ms}ms | ${detail.slice(0, 120)}`);
  return entry;
}

export function flushOps(): MemoryOp[] {
  return [...ring];
}

export function drainOps(): MemoryOp[] {
  const ops = [...ring];
  ring.length = 0;
  return ops;
}
