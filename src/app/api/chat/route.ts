import { NextResponse } from "next/server";
import type { ChatRequest, ChatResponse } from "@/lib/contract";
import { runAgent } from "@/lib/agent";

export async function POST(req: Request): Promise<NextResponse<ChatResponse>> {
  const body = (await req.json()) as Partial<ChatRequest>;
  const message = body.message ?? "";
  const patientId = body.patientId ?? "maya";
  const history = body.history ?? [];

  try {
    const { reply, memoryOps } = await runAgent(message, patientId, history);
    return NextResponse.json({ reply, memoryOps });
  } catch (error) {
    const detail = error instanceof Error ? error.message : "Unknown error";
    console.error("[chat]", detail);
    return NextResponse.json(
      {
        reply: `I could not reach the memory/model service yet: ${detail}`,
        memoryOps: [],
      },
      { status: 502 },
    );
  }
}
