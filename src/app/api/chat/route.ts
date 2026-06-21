import { NextResponse } from "next/server";
import type { ChatRequest, ChatResponse } from "@/lib/contract";
import { runAgent } from "@/lib/agent";

export async function POST(req: Request): Promise<NextResponse<ChatResponse>> {
  const body = (await req.json()) as Partial<ChatRequest>;
  const message = body.message ?? "";
  const patientId = body.patientId ?? "maya";

  const { reply, memoryOps } = await runAgent(message, patientId);
  return NextResponse.json({ reply, memoryOps });
}
