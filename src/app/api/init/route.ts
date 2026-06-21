import { NextResponse } from "next/server";
import { capture } from "@/lib/memory";

export async function POST(req: Request): Promise<NextResponse<{ ok: boolean; patientId: string; error?: string }>> {
  const body = (await req.json()) as { patientId?: string };
  const patientId = body.patientId ?? `cold-${Date.now()}`;

  try {
    await capture(
      [{
        kind: "Patient",
        label: patientId,
        text: `New patient session started for ${patientId}.`,
      }],
      patientId,
    );
    return NextResponse.json({ ok: true, patientId });
  } catch (error) {
    const detail = error instanceof Error ? error.message : "Unknown error";
    console.error("[init]", detail);
    return NextResponse.json({ ok: false, patientId, error: detail }, { status: 502 });
  }
}
