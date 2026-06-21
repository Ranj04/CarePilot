// src/lib/contract.ts — owned by Track A, imported by Track B (never edited by B).
// The single shared contract between the agent backend and the UI.

export interface ChatRequest {
  patientId: string;
  message: string;
}

export interface MemoryOp {
  op: "recall" | "traverse" | "write";
  label: string; // short human label, e.g. "recall: dry cough"
  detail: string; // what came back / went in
  ms: number; // duration
  ts: string; // ISO
}

export interface ChatResponse {
  reply: string;
  memoryOps: MemoryOp[];
}

export interface SeedRequest {
  patientId: string;
}

export interface SeedResponse {
  ok: boolean;
  nodeCount: number;
  error?: string;
}

// POST /api/chat   -> ChatRequest -> ChatResponse
// POST /api/seed   -> SeedRequest -> SeedResponse
