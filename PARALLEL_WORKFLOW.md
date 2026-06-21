# PARALLEL_WORKFLOW.md — how the two of you work at once

Two Claude Code sessions, two tracks, one repo.

- **Track A — Backend / Memory / Agent.** Owns `src/lib/*` and `src/app/api/*`. This is the graded core (HydraDB, autonomous recall, context-aware execution).
- **Track B — Frontend / Voice / Demo + QA.** Owns `src/app/page.tsx`, `src/components/*`, and `scripts/` (demo + QA harness).

## The one rule that prevents conflicts

You edit **different folders**. The only shared file is `src/lib/contract.ts` (types + API shapes). **Track A creates it and owns it; Track B only imports from it, never edits it.**

## The single serialization point

Track B cannot start until Track A finishes **Phase A0** (repo scaffold + `contract.ts` + a mock `/api/chat` pushed to `main`). While waiting, Track B does SETUP.md (accounts, keys, read docs).

```
A0 (scaffold + contract + mock API) ──push main──┐
                                                 ├──► A1, A2, A3 on branch track-a
B pulls main, then ───────────────────────────► B0, B1, B2, B3 on branch track-b
                                                 │
                          INTEGRATION GATE: merge track-a into track-b after A2 + B1
```

## Branches

- A: `git checkout -b track-a` after A0.
- B: `git checkout -b track-b` after pulling A0.
- Integration: when A reaches end of A2 and B reaches end of B1, B merges `track-a` and switches the UI from the mock to the real `/api/chat`.

## The shared contract (both tracks code to this exact shape)

```ts
// src/lib/contract.ts  — owned by Track A, imported by Track B
export interface ChatRequest { patientId: string; message: string }
export interface MemoryOp {
  op: "recall" | "traverse" | "write";
  label: string;        // short human label, e.g. "recall: dry cough"
  detail: string;       // what came back / went in
  ms: number;           // duration
  ts: string;           // ISO
}
export interface ChatResponse { reply: string; memoryOps: MemoryOp[] }
// POST /api/chat   -> ChatRequest -> ChatResponse
// POST /api/seed   -> { patientId } -> { ok: boolean; nodeCount: number }
```

Seeded patient id for the demo: `"maya"`. An unseeded id (e.g. `"cold"`) = the cold-start contrast.
