import { NextResponse } from "next/server";
import type { SeedRequest, SeedResponse } from "@/lib/contract";
import { seedPatient } from "@/lib/seed";

export async function POST(req: Request): Promise<NextResponse<SeedResponse>> {
  const body = (await req.json()) as Partial<SeedRequest>;
  const patientId = body.patientId ?? "maya";

  try {
    const nodeCount = await seedPatient(patientId);
    return NextResponse.json({ ok: true, nodeCount });
  } catch (error) {
    const detail = error instanceof Error ? error.message : "Unknown error";
    console.error("[seed]", detail);
    return NextResponse.json({ ok: false, nodeCount: 0, error: detail }, { status: 502 });
  }
}
