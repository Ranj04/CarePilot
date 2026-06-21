# PROMPT A — Backend / Memory / Agent (paste into Claude Code)

You own the **backend track** of CarePilot, an 8-hour HydraDB hackathon project. First read `CLAUDE.md`, `ARCHITECTURE.md`, and `PARALLEL_WORKFLOW.md` in this repo in full. You own `src/lib/*` and `src/app/api/*`. Your teammate owns the UI; do NOT touch `src/app/page.tsx`, `src/components/*`, or `scripts/`.

## GLOBAL RULES (apply to every phase)

1. **One phase at a time. Do NOT start the next phase until the current one is fully functional AND passes its QA gate.** No partial progress carried forward.
2. **Extensive QA each phase:** write real automated tests/verify-scripts (use `node --test` or `vitest`), run them, and show me the output. Cover the happy path, at least 2 edge cases, and 1 failure case (e.g. HydraDB unreachable). Also run `tsc --noEmit`. A phase is "done" only when all of that is green and you've shown me the logs.
3. **Stop at each 🙋 HUMAN CHECKPOINT** and wait for me. Print exactly what you need from me.
4. Keep code minimal and surgical (see CLAUDE.md). HydraDB SDK is imported ONLY in `src/lib/hydra.ts`.
5. Never invent HydraDB API calls — read docs.hydradb.com and confirm against the live service.

---

## PHASE A0 — Repo scaffold + shared contract + mock API (the unblock-my-teammate phase)

Goal: get a runnable skeleton and the API contract onto `main` so my teammate can start.

- Confirm the Next.js app runs (`npm run dev`).
- Create `src/lib/contract.ts` exactly as specified in PARALLEL_WORKFLOW.md (ChatRequest, MemoryOp, ChatResponse).
- Create `src/app/api/chat/route.ts` and `src/app/api/seed/route.ts` as **mocks** that return contract-shaped data (hardcoded reply + a couple of fake MemoryOps). No HydraDB/Nebius yet.
- Add `.env.example` keys from the repo's existing template.

**QA gate A0:** `tsc --noEmit` clean; `npm run build` clean; `curl` (or a test) against `/api/chat` returns valid `ChatResponse`; `/api/seed` returns `{ok,nodeCount}`.

🙋 **HUMAN CHECKPOINT — after A0:**
- I need to: review, then **you commit and push `contract.ts` + mocks to `main`** and tell my teammate to pull. Tell me the exact git commands you ran.
- Confirm my `.env.local` has `HYDRADB_*` and `NEBIUS_*` filled (you cannot proceed to A1 without live HydraDB keys). Ask me for them if missing.
- After I confirm, create branch `track-a` and continue.

---

## PHASE A1 — HydraDB memory model (the riskiest part — de-risk fully here)

Goal: real, traced read/write/traverse against live HydraDB.

- Read docs.hydradb.com. Write `src/lib/hydra.ts`: `upsertNode`, `addEdge`, `recall({query, kinds?})`, `traverse({nodeId, rel?})`. Only this file imports the SDK.
- `src/lib/types.ts` (nodes/edges/events), `src/lib/memory.ts` (capture/recall/relate/context on top of hydra.ts), `src/lib/trace.ts` (log every op → console + in-memory buffer, shaped as `MemoryOp`).
- `src/lib/seed.ts`: patient `"maya"` — lisinopril 10mg, hypertension, a past low-mood entry, and the edge `lisinopril —MAY_CAUSE→ "dry cough"`.

**QA gate A1 (extensive):** automated test that, against **live HydraDB**:
- writes a node and reads it back (identity matches);
- writes an edge and `traverse` returns the neighbor;
- `recall` returns a seeded symptom by semantic match (not just exact string);
- edge case: empty/unknown query returns [] cleanly; recall with a kind filter works;
- failure case: bad credentials / unreachable host throws a clear error, not a crash.
- Run `seed.ts`, then dump Maya's graph and show me the nodes + edges + traces.

🙋 **HUMAN CHECKPOINT — after A1:**
- I need to: eyeball the dumped graph and confirm Maya looks right, and confirm the HydraDB dashboard shows the data (this proves "HydraDB as primary memory"). 
- Commit `track-a`. Tell me if any HydraDB doc detail surprised you (affects the demo).

---

## PHASE A2 — Nebius agent loop + tools + real /api/chat

Goal: the agent autonomously recalls and acts on memory.

- `src/lib/nebius.ts`: OpenAI SDK pointed at Token Factory (`NEBIUS_BASE_URL`, `NEBIUS_CHAT_MODEL`), with tool-calling.
- `src/lib/tools.ts`: `recall_context`, `find_related`, `remember` (schemas + handlers calling `memory.ts`).
- `src/lib/agent.ts`: the loop — message + tool schemas → model calls tools → feed results back → reply. Cap ~4 tool round-trips. Collect every memory op into `MemoryOp[]`.
- Replace the mock `/api/chat` with the real agent. Keep the contract identical.

**QA gate A2 (this is the graded behavior — test it hard):**
- Scripted test, patient `"maya"`, message "I have a dry cough": assert the trace shows the model **autonomously** calling `recall_context` AND `find_related`, and the reply text references the lisinopril side-effect link.
- Cold-vs-warm test: same message for patient `"cold"` (unseeded) does NOT mention lisinopril; for `"maya"` it does. Assert the two replies differ.
- `remember` test: a new symptom message writes a new node + edge (verify via hydra read).
- Edge cases: model returns no tool call (still replies safely); tool throws (loop degrades gracefully, doesn't hang).
- Show me the full trace logs for the dry-cough run.

🙋 **HUMAN CHECKPOINT — after A2:**
- I need to: read the cold-vs-warm transcript and confirm the contrast is demo-worthy; approve the model id/tone.
- **INTEGRATION GATE:** tell my teammate Track A is ready to merge. Coordinate the merge of `track-a` into `track-b`.

---

## PHASE A3 — Hardening + deliverable logs

Goal: production-safe for a live demo + submission artifacts.

- Robust error handling on every external call (HydraDB, Nebius): timeouts, retries-once, clear messages.
- `scripts/export-logs.ts` writing `execution-logs.json` (the required "execution logs/traces" deliverable) from the trace buffer.
- A `scripts/verify-all.ts` that runs the A1+A2 assertions end to end.
- Help my teammate wire the real API if anything in the contract needs clarifying (do NOT edit their files; propose changes to them).

**QA gate A3:** `verify-all` green; `execution-logs.json` produced and contains real recall/traverse/write entries; `npm run build` clean; one full manual chat in the browser works against the real backend.

🙋 **HUMAN CHECKPOINT — after A3:**
- I need to: save `execution-logs.json` for submission; do a full dry-run of the demo with my teammate.
- Tell me anything still flaky and the cut-list if we're short on time.
