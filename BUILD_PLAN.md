# BUILD_PLAN.md — the 8-hour plan

Each phase has a **verify gate**. Do not move on until it passes. If you're behind, cut from the stretch list — never from Phase 1–4.

## Phase 0 — De-risk HydraDB (0:00–0:45)
The one thing that can sink you. Do it first.
- Read docs.hydradb.com; write `src/lib/hydra.ts` (`upsertNode`, `addEdge`, `recall`, `traverse`).
- Throwaway script: write one node, read it back, write an edge, traverse it.
- **Verify:** the script prints the node and the related node from live HydraDB.

## Phase 1 — Memory model + seed (0:45–2:00)
- `types.ts` (nodes/edges/events), `memory.ts` (capture/recall/relate/context on top of `hydra.ts`).
- `seed.ts`: patient "Maya" — lisinopril 10mg, hypertension, a past low-mood entry, and the `lisinopril —MAY_CAUSE→ dry cough` edge.
- `trace.ts`: log every HydraDB op to console + in-memory buffer.
- **Verify:** run seed; query HydraDB and see Maya's nodes + edges; traces print.

## Phase 2 — Nebius agent loop + tools (2:00–4:00)
- `nebius.ts` (OpenAI SDK → Token Factory) with tool-calling.
- `tools.ts`: `recall_context`, `find_related`, `remember` (schemas + handlers calling `memory.ts`).
- `agent.ts`: loop — message + tools → model calls tools → reply. Cap ~4 round-trips.
- **Verify:** a Node script sends "I have a dry cough", and the trace shows the model autonomously calling `recall_context` + `find_related`, and the reply names the lisinopril side-effect link.

## Phase 3 — Chat UI + trace panel (4:00–5:30)
- `app/api/chat/route.ts` wires the agent to the web.
- `app/page.tsx`: chat thread + a **Memory panel** showing live HydraDB ops. Visible "not medical advice" line.
- **Verify:** full chat works in the browser; memory panel updates as you talk.

## Phase 4 — The context-aware proof (5:30–6:30)
This is the demo's spine; make it bulletproof.
- Script/replay two sessions: **cold** (no memory) vs **warm** (Maya seeded). Capture both replies.
- **Verify:** warm reply references meds/history and fires the side-effect catch; cold reply does not. Save both outputs for the submission.

## Phase 5 — Polish + deliverables (6:30–7:30)
- Export trace logs to a file (`execution-logs.json`) — required deliverable.
- Tighten the system prompt and the agent's tone (warm, concise, not preachy).
- README in the repo with run instructions + the HydraDB integration write-up.
- **Verify:** `npm run build` clean; logs file exists; README explains the integration.

## Phase 6 — Record the demo (7:30–8:00)
- Record the 90-second flow in DEMO.md (have this as backup even if you also present live).
- Submit via the portal with code **MEMORY2026**: working prototype/video, source repo, execution logs, optional deck.

## Stretch (only if a phase finished early)
- Voice: Web Speech API STT into the input + `speechSynthesis` on replies.
- A second pattern beat: "third time you've mentioned chest tightness this month" (recurrence count).
- Mood-trend sparkline from MoodEntry recency.

## If you fall behind — cut in this order
1. Voice. 2. Mood trend. 3. Pretty UI (a plain chat + trace list is enough). 
Never cut: HydraDB round-trip, autonomous tool-call recall, the cold-vs-warm contrast.
