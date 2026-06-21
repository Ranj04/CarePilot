import { NextResponse } from "next/server";
import type { SeedRequest, SeedResponse } from "@/lib/contract";
import { seedPatient } from "@/lib/seed";

export async function POST(req: Request): Promise<NextResponse<SeedResponse>> {
  const body = (await req.json()) as Partial<SeedRequest>;
  const patientId = body.patientId ?? "maya";

  const nodeCount = await seedPatient(patientId);
  return NextResponse.json({ ok: true, nodeCount });
}
