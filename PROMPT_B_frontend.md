# PROMPT B — Frontend / Voice / Demo + QA (paste into Claude Code)

You own the **frontend track** of CarePilot, an 8-hour HydraDB hackathon project. First read `CLAUDE.md`, `ARCHITECTURE.md`, and `PARALLEL_WORKFLOW.md` in this repo in full. You own `src/app/page.tsx`, `src/components/*`, and `scripts/` (demo + QA harness). Your teammate owns the backend; do NOT touch `src/lib/*` or `src/app/api/*`. **Import types only from `src/lib/contract.ts` — never edit it.**

## GLOBAL RULES (apply to every phase)

1. **One phase at a time. Do NOT start the next phase until the current one is fully functional AND passes its QA gate.** No partial progress carried forward.
2. **Extensive QA each phase:** write real tests and run them. For UI use a component/interaction test (e.g. `vitest` + Testing Library) or, if that's too heavy for the time, a Playwright smoke test; plus manual steps you walk me through. Cover: renders correctly, happy-path interaction, empty state, and an error state (API returns 500). Run `tsc --noEmit`. Show me the output. A phase is done only when all green and demonstrated.
3. **Stop at each 🙋 HUMAN CHECKPOINT** and wait for me. Print exactly what you need.
4. Until the integration gate, build against the **mock `/api/chat`** Track A committed — your code must work purely from the `contract.ts` shapes, so swapping to the real backend changes nothing in your components.
5. Keep it minimal (see CLAUDE.md). Plain, clean, legible UI beats fancy.

---

## PHASE B0 — Wait, pull, then chat UI against the mock

**Dependency: do not start until I confirm Track A pushed Phase A0 to `main`.** Print: "Waiting for Track A0 — confirm contract.ts + mock API are on main." When I confirm:

- `git pull`, then `git checkout -b track-b`.
- Build `src/app/page.tsx`: a chat thread (messages list + input + send) that POSTs `ChatRequest` to `/api/chat` and renders `ChatResponse.reply`. A patient toggle: `"maya"` vs `"cold"`. A visible "Not medical advice — call 911 in an emergency" line.
- `src/components/Chat.tsx` for the thread.

**QA gate B0:** `tsc --noEmit` clean; test that submitting a message renders the user message + the mock reply; empty input is blocked; a 500 from the API shows an error state, not a crash. Demo it to me in the browser.

🙋 **HUMAN CHECKPOINT — after B0:**
- I need to: look at the chat in Chrome and approve the layout/feel.
- Commit `track-b`.

---

## PHASE B1 — Memory / trace panel

Goal: make the agent's memory work **visible** (this is what sells the judges live).

- `src/components/MemoryPanel.tsx`: renders `ChatResponse.memoryOps` per turn — each op as a row with an icon by `op` type (recall / traverse / write), its `label`, `detail`, and `ms`. Newest on top; keep a running list across the session.
- Place it beside the chat so ops appear as you send messages.

**QA gate B1:** test that given a `ChatResponse` with 3 mixed memoryOps, the panel renders 3 rows with correct icons/labels; empty ops shows a tidy empty state; long detail truncates without breaking layout. Demo with the mock (have the mock return a recall + traverse + write).

🙋 **HUMAN CHECKPOINT — after B1:**
- I need to: confirm the panel reads clearly from across a room (demo legibility).
- **INTEGRATION GATE:** when Track A says A2 is ready, merge `track-a` into `track-b`. The mock `/api/chat` becomes the real one — your components should need zero changes. Re-run B0 + B1 QA against the REAL backend and show me it still passes. Fix only integration mismatches (report any contract drift to my teammate; don't edit contract.ts).

---

## PHASE B2 — Voice (optional but in-scope; browser-only)

Goal: speak to CarePilot and hear it reply. No new API keys.

- `src/components/VoiceButton.tsx`: `webkitSpeechRecognition` (Web Speech API) to dictate into the chat input; `speechSynthesis.speak()` on the agent's reply. Thin layer over the existing text path — a voice failure must never block typing.
- Toggle to enable/disable voice.

**QA gate B2:** in Chrome, dictate a message → it sends → reply is spoken. Test: denying mic permission falls back to text with a clear message; toggling off stops TTS; works without breaking B0/B1 tests. Walk me through it live.

🙋 **HUMAN CHECKPOINT — after B2:**
- I need to: test voice on the actual demo machine/mic in Chrome (it's environment-sensitive).
- Decide go/no-go on voice for the live demo. If flaky, we keep it off and rely on text + trace panel.

---

## PHASE B3 — Demo harness + deliverables

Goal: a repeatable, bulletproof demo and the submission artifacts.

- `scripts/demo.ts`: seeds `"maya"` (calls `/api/seed`), then runs the scripted cold-vs-warm dry-cough exchange and prints both transcripts (fallback if live network flakes).
- A one-click "Reset & Seed" control in the UI for resetting between demo runs.
- Ensure the UI can surface/download the session's memory ops (supports the execution-logs deliverable Track A exports).
- Final styling pass: readable, calm, the disclaimer visible.

**QA gate B3:** `scripts/demo.ts` runs clean and prints a clear cold-vs-warm contrast against the real backend; reset control works twice in a row; `npm run build` clean; full manual run of DEMO.md end to end.

🙋 **HUMAN CHECKPOINT — after B3:**
- I need to: do a full dry-run of DEMO.md with my teammate and time it (≤90s).
- Record the backup demo video. Confirm the disclaimer is visible. Then we submit (portal code MEMORY2026).
