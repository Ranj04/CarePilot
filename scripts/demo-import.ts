/**
 * scripts/demo-import.ts — the chart-import payoff (Phase C3).
 *
 * Proves: a brand-new patient gets a generic answer to "I have a dry cough";
 * after connecting health records (which import lisinopril), the SAME question
 * fires the side-effect catch — using chart-imported memory.
 *
 * Run:  CAREPILOT_URL=http://localhost:3001 npx tsx scripts/demo-import.ts
 */
import type { ChatResponse } from "../src/lib/contract";

const BASE = process.env.CAREPILOT_URL ?? "http://localhost:3000";
const PID = process.env.IMPORT_DEMO_PID ?? `chart-demo-${Date.now()}`;
const MESSAGE = "I have a dry cough";

async function post<T>(path: string, body: unknown): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`${path} -> HTTP ${res.status}`);
  return (await res.json()) as T;
}

async function main() {
  console.log(`Chart-import demo — backend: ${BASE}, patient: ${PID}\n${"=".repeat(60)}`);

  console.log(`\n[1/3] BEFORE import — "${MESSAGE}"`);
  const before = await post<ChatResponse>("/api/chat", { patientId: PID, message: MESSAGE });
  console.log(`  reply: "${before.reply}"`);

  console.log(`\n[2/3] Connect health records (FHIR import)…`);
  const imp = await post<{ imported: { conditions: number; medications: number; allergies: number } }>(
    "/api/import-records",
    { patientId: PID },
  );
  console.log(
    `  imported: ${imp.imported.conditions} conditions, ${imp.imported.medications} medications, ${imp.imported.allergies} allergies`,
  );
  console.log("  (waiting ~14s for HydraDB to index the imported records)");
  await new Promise((r) => setTimeout(r, 14_000));

  console.log(`\n[3/3] AFTER import — "${MESSAGE}"`);
  const after = await post<ChatResponse>("/api/chat", { patientId: PID, message: MESSAGE });
  console.log(`  reply: "${after.reply}"`);

  console.log(`\n${"=".repeat(60)}`);
  const beforeGeneric = !/lisinopril/i.test(before.reply);
  const afterCatches = /lisinopril/i.test(after.reply);
  console.log(`  • BEFORE import stays generic (no lisinopril): ${beforeGeneric ? "✅" : "❌"}`);
  console.log(`  • AFTER import fires the catch (lisinopril):    ${afterCatches ? "✅" : "❌"}`);
  if (!beforeGeneric || !afterCatches) {
    console.error("\n⚠️  Import payoff not demo-worthy — check the import flow before presenting.");
    process.exit(1);
  }
  console.log("\n✅ Same question, different answer — CarePilot now knows the chart it imported.");
}

main().catch((err) => {
  console.error("\n❌ Import demo failed:", err instanceof Error ? err.message : err);
  process.exit(1);
});
