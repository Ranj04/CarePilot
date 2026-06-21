/**
 * scripts/demo.ts — the bulletproof demo runner.
 *
 * Seeds patient "maya", then runs the scripted cold-vs-warm dry-cough exchange
 * against the real backend and prints both transcripts + the memory ops. Use it
 * as a fallback if the live UI network flakes during the demo.
 *
 * Run:  CAREPILOT_URL=http://localhost:3001 npx tsx scripts/demo.ts
 *       (defaults to http://localhost:3000)
 */
import type { ChatResponse, SeedResponse } from "../src/lib/contract";

const BASE = process.env.CAREPILOT_URL ?? "http://localhost:3000";
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

function printOps(label: string, res: ChatResponse) {
  console.log(`\n  ${label} reply:\n    "${res.reply}"`);
  console.log(`  memory ops (${res.memoryOps.length}):`);
  for (const op of res.memoryOps) {
    console.log(`    • ${op.op.toUpperCase().padEnd(9)} ${op.label}  [${op.ms}ms]`);
  }
}

async function main() {
  console.log(`CarePilot demo — backend: ${BASE}\n${"=".repeat(56)}`);

  console.log("\n[1/3] Seeding patient \"maya\"…");
  const seed = await post<SeedResponse>("/api/seed", { patientId: "maya" });
  console.log(`  -> ok=${seed.ok}, nodeCount=${seed.nodeCount}`);
  console.log("  (waiting ~10s for HydraDB to index the new memories)");
  await new Promise((r) => setTimeout(r, 10_000));

  console.log(`\n[2/3] COLD start — patient "cold", message: "${MESSAGE}"`);
  const cold = await post<ChatResponse>("/api/chat", { patientId: "cold", message: MESSAGE });
  printOps("COLD", cold);

  console.log(`\n[3/3] WARM — patient "maya", message: "${MESSAGE}"`);
  const warm = await post<ChatResponse>("/api/chat", { patientId: "maya", message: MESSAGE });
  printOps("WARM", warm);

  console.log(`\n${"=".repeat(56)}`);
  const warmCatchesIt = /lisinopril/i.test(warm.reply);
  const coldStaysGeneric = !/lisinopril/i.test(cold.reply);
  console.log(`Contrast check:`);
  console.log(`  • WARM references lisinopril (side-effect catch): ${warmCatchesIt ? "✅" : "❌"}`);
  console.log(`  • COLD stays generic (no lisinopril):            ${coldStaysGeneric ? "✅" : "❌"}`);
  if (!warmCatchesIt || !coldStaysGeneric) {
    console.error("\n⚠️  Contrast not demo-worthy — check seed/agent before presenting.");
    process.exit(1);
  }
  console.log("\n✅ Same input, different answer — because CarePilot remembered.");
}

main().catch((err) => {
  console.error("\n❌ Demo run failed:", err instanceof Error ? err.message : err);
  process.exit(1);
});
