import { NextResponse } from "next/server";
import { capture } from "@/lib/memory";
import { parseFhirBundle, type FhirBundle } from "@/lib/fhir-import";
import { drainOps } from "@/lib/trace";
import type { EdgeRel, MemoryEvent } from "@/lib/types";
import sampleBundle from "../../../../data/sample-fhir-bundle.json";

// In-memory idempotency: which (patient, node) keys we've already imported, plus
// a version that bumps on every import. Reusing the stable per-(kind,label) key
// means a re-import writes nothing new — no duplicates. Resets on server
// restart, which is fine for the demo.
const importState = new Map<string, { version: number; keys: Set<string> }>();

type ImportBody = { patientId?: string; bundle?: FhirBundle };

export async function POST(req: Request): Promise<NextResponse> {
  const body = (await req.json().catch(() => ({}))) as ImportBody;
  const patientId = body.patientId ?? "imported-patient";
  // Default to the bundled sample; a caller may pass their own (e.g. tests).
  const bundle = body.bundle ?? (sampleBundle as FhirBundle);

  // Validate BEFORE any write — a malformed bundle must not partially corrupt.
  if (!bundle || bundle.resourceType !== "Bundle" || !Array.isArray(bundle.entry)) {
    return NextResponse.json({ ok: false, error: "Invalid FHIR bundle" }, { status: 400 });
  }

  const records = parseFhirBundle(bundle);
  if (records.events.length === 0) {
    return NextResponse.json(
      { ok: false, error: "No importable records found in bundle" },
      { status: 400 },
    );
  }

  // Patient node links to every imported entity (same shape buildEvents uses).
  const patientRelations: { rel: EdgeRel; toLabel: string }[] = [
    ...records.conditions.map((c) => ({ rel: "HAS_CONDITION" as EdgeRel, toLabel: c })),
    ...records.medications.map((m) => ({ rel: "TAKES" as EdgeRel, toLabel: m })),
    ...records.allergies.map((a) => ({ rel: "ALLERGIC_TO" as EdgeRel, toLabel: a })),
  ];
  const patientEvent: MemoryEvent = {
    kind: "Patient",
    label: patientId,
    text: `Patient ${records.patientName ?? patientId} connected their health records: ${records.conditions.length} condition(s), ${records.medications.length} medication(s), ${records.allergies.length} allergy(ies) imported.`,
    relations: patientRelations,
  };

  const allEvents: MemoryEvent[] = [patientEvent, ...records.events];

  // Idempotency: skip anything already imported for this patient; bump version.
  const state = importState.get(patientId) ?? { version: 0, keys: new Set<string>() };
  state.version += 1;
  const keyOf = (e: MemoryEvent) => `${e.kind}:${e.label.toLowerCase()}`;
  const newEvents = allEvents.filter((e) => !state.keys.has(keyOf(e)));

  drainOps(); // isolate this import's trace ops
  try {
    if (newEvents.length) await capture(newEvents, patientId);
  } catch (error) {
    const detail = error instanceof Error ? error.message : "Unknown error";
    console.error("[import-records]", detail);
    return NextResponse.json({ ok: false, error: detail }, { status: 502 });
  }
  for (const e of newEvents) state.keys.add(keyOf(e));
  importState.set(patientId, state);

  // Tag the write ops with fhir-import provenance for the trace panel.
  const memoryOps = drainOps().map((o) => ({ ...o, detail: `[fhir-import] ${o.detail}` }));

  return NextResponse.json({
    ok: true,
    version: state.version,
    imported: {
      conditions: records.conditions.length,
      medications: records.medications.length,
      allergies: records.allergies.length,
    },
    memoryOps,
  });
}
