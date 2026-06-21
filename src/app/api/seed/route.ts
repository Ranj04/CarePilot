import { NextResponse } from "next/server";
import type { SeedRequest, SeedResponse } from "@/lib/contract";

// PHASE A0 MOCK — returns contract-shaped data only. No HydraDB yet.
// Replaced by real seeding (seed.ts) in Phase A1.
export async function POST(req: Request): Promise<NextResponse<SeedResponse>> {
  const body = (await req.json()) as Partial<SeedRequest>;
  const patientId = body.patientId ?? "maya";

  // Maya's seed graph will be: patient + lisinopril + hypertension + 1 mood entry
  // = 4 canonical nodes. Hardcoded here until A1 writes them to HydraDB.
  const nodeCount = patientId === "maya" ? 4 : 0;

  return NextResponse.json({ ok: true, nodeCount });
}
