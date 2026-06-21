import { NextResponse } from "next/server";
import type { ChatRequest, ChatResponse, MemoryOp } from "@/lib/contract";

// PHASE A0 MOCK — returns contract-shaped data only. No HydraDB / Nebius yet.
// Replaced by the real agent in Phase A2. Keep the response shape identical.
export async function POST(req: Request): Promise<NextResponse<ChatResponse>> {
  const body = (await req.json()) as Partial<ChatRequest>;
  const message = body.message ?? "";
  const now = new Date().toISOString();

  const memoryOps: MemoryOp[] = [
    {
      op: "recall",
      label: `recall: ${message.slice(0, 40) || "(empty)"}`,
      detail: "[mock] would semantically recall related nodes from HydraDB",
      ms: 12,
      ts: now,
    },
    {
      op: "write",
      label: "write: session turn",
      detail: "[mock] would persist this turn as a Session/Symptom node",
      ms: 8,
      ts: now,
    },
  ];

  const reply =
    `[mock reply] You said: "${message}". ` +
    `The real agent will recall your history from HydraDB and answer in context.`;

  return NextResponse.json({ reply, memoryOps });
}
