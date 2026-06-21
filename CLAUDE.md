# CLAUDE.md — CarePilot build brief

You are building **CarePilot** in an **8-hour hackathon**. Read this fully before writing code.

## Goal

A personal health companion that **remembers across sessions using HydraDB** and changes its advice because of what it remembers. One agent, text chat with optional voice. Nothing more.

## Hard constraints (do not violate)

- **HydraDB is the primary and only canonical memory.** All facts (meds, symptoms, mood, conditions, relationships) persist in HydraDB. Do NOT use localStorage/SQLite/files as the source of truth. (A tiny in-memory cache for the current request is fine.)
- **Keep it simple.** This is 8 hours. Build the smallest thing that demonstrates: store memory → autonomously recall it → act differently because of it. No extra features.
- **No scope creep.** Do NOT build: voice-biomarker models, Inngest/cron workflows, bill/appeal parsing, FHIR import, a 3D body atlas, auth, or payments. If tempted, stop and ask.
- **Minimal, surgical code.** Smallest implementation that works. No speculative abstractions, no config for things we don't need. If a senior engineer would call it overcomplicated, simplify.

## The three things the judges grade (your definition of done)

1. **HydraDB usage** — it's the memory layer, used for real.
2. **Autonomous recall** — the *agent* decides to fetch memory via tool calls; recall is not hardcoded.
3. **Context-aware execution** — the agent's recommendation visibly changes based on stored history.

If all three are demonstrably true and traced, we win. Optimize for that, not for surface area.

## FIRST STEP — before writing app code

1. Open the HydraDB docs at **docs.hydradb.com** (concepts + SDK/quickstart). Learn the exact calls to: create/upsert a node, create an edge/relationship, query by semantic similarity, and traverse relationships. **Do not guess the API.**
2. Write `src/lib/hydra.ts` as a thin client exposing: `upsertNode`, `addEdge`, `recall({query, kinds?})`, `traverse({nodeId, rel?})`. This is the ONLY file allowed to import the HydraDB SDK.
3. Write a 10-line throwaway script that writes one node and reads it back. **Confirm the round-trip works against the live HydraDB before building anything else.** This is the riskiest unknown; de-risk it first.

## Tech stack

- **Next.js (App Router) + TypeScript (strict)**, single app.
- **Nebius Token Factory** for the LLM — OpenAI-compatible. Use the `openai` npm package:
  ```ts
  new OpenAI({ baseURL: process.env.NEBIUS_BASE_URL, apiKey: process.env.NEBIUS_API_KEY })
  ```
  Base URL: `https://api.tokenfactory.nebius.com/v1/`. Use a **tool-calling-capable instruct model** from the catalog (e.g. a Llama-3.x-Instruct or Qwen2.5-Instruct — verify the exact id in the playground; avoid pure reasoning models like DeepSeek-R1 for function-calling).
- **Voice (optional, do last):** browser Web Speech API only — `webkitSpeechRecognition` for input, `speechSynthesis` for output. No extra API keys.

## Architecture

Follow `ARCHITECTURE.md` in this folder. Summary:

- Memory graph in HydraDB: nodes `Patient/Symptom/Condition/Medication/MoodEntry/Session`; edges include `TAKES`, `MAY_CAUSE`, `SUGGESTS`, `TREATS`, `REPORTED`, `RECORDED_IN`.
- Agent loop in `src/lib/agent.ts`: send message + tool schemas to Nebius → model calls tools → feed results back → reply. Max ~4 tool round-trips per turn.
- Three tools in `src/lib/tools.ts`: `recall_context`, `find_related` (graph traversal), `remember` (write nodes + edges).
- `src/lib/trace.ts`: log every HydraDB op (op, args, result summary, ms) to console AND an in-memory buffer surfaced in a UI panel.
- `src/lib/seed.ts`: seed patient "Maya" — takes **lisinopril 10mg**, has **hypertension**, and a prior **low mood** entry — with the `Medication —MAY_CAUSE→ "dry cough"` relationship present so the demo's side-effect catch works.

## The hero behavior to make work

When the user says they have a **dry cough**, the agent should `recall_context`, then `find_related` on the cough/meds, discover lisinopril `MAY_CAUSE` cough, and say something like: *"You started lisinopril last week — a dry cough is a known side effect. Worth flagging to your doctor before assuming it's a cold."* A cold/empty session must NOT produce this. That contrast is the demo.

## Coding conventions

- TypeScript strict. Match existing file style. Small functions.
- Every changed line should trace to this brief. No drive-by refactors.
- Remove imports/vars your changes orphan; don't touch unrelated code.
- Prefer clarity over cleverness; a tired teammate reads this at hour 7.

## Verification (loop until these pass)

- `npm run build` and `tsc --noEmit` clean.
- HydraDB round-trip script passes (write → read).
- A scripted two-session test: session 1 records a symptom + med; session 2 recalls them and the reply references them. Assert the warm reply differs from a cold-start reply.
- Trace buffer shows real `recall`/`traverse`/`write` ops with timings.

## Disclaimer

CarePilot is a navigation/triage helper, not a diagnosis tool. Keep a visible "not medical advice; call 911 in an emergency" line in the UI.
