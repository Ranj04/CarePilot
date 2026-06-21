# CarePilot

A personal health companion that **remembers across sessions** using HydraDB. Built for the MEMORY2026 hackathon.

> Not medical advice. Call 911 in an emergency.

## Run it

```bash
cp .env.example .env.local
# Fill in: HYDRADB_API_KEY, HYDRADB_TENANT_ID, NEBIUS_API_KEY, NEBIUS_CHAT_MODEL
npm install
npm run dev
# Open http://localhost:3000
```

1. Click **Seed Maya** — writes her health history (propranolol 20mg, anxiety, dizziness MAY_CAUSE edge) into HydraDB
2. Type **"I have been feeling dizzy"**
3. Watch the **HydraDB Memory Ops** panel show autonomous recall + traversal, and the reply name the medication connection

## The three judging criteria

| Requirement | How it's met |
|---|---|
| **HydraDB as primary memory** | All patient facts live in HydraDB via `src/lib/hydra.ts`. No localStorage, no SQLite. |
| **Autonomous recall** | The Nebius agent calls `recall_context` and `find_related` tools on its own — nothing is pre-fetched or hardcoded. |
| **Context-aware execution** | Cold session (no memory) → generic reply. Warm session (Maya seeded) → names propranolol and its known side effect. See `execution-logs.json`. |

## HydraDB integration

| Operation | Endpoint | Used for |
|---|---|---|
| Store node | `POST /memories/add_memory` | Medications, symptoms, conditions, mood |
| Store edge | `POST /memories/add_memory` (relationship text + `infer:true`) | MAY_CAUSE, TREATS, REPORTED links |
| Semantic recall | `POST /recall/recall_preferences` | Agent's `recall_context` tool |
| Graph traversal | `GET /list/graph_relations_by_id` | Agent's `find_related` tool |

Memories are scoped per patient via `sub_tenant_id`. The `infer:true` flag lets HydraDB extract relationship triplets automatically. Only `src/lib/hydra.ts` touches the API — everything else goes through `src/lib/memory.ts`.

## Why HydraDB and not a table

The win is **relationships**, not rows. `Patient —TAKES→ Medication —MAY_CAUSE→ Symptom` — traversing that edge at recall time is what catches the propranolol→dizziness link. A flat lookup can't do that.

## Stack

- **HydraDB** — memory graph (semantic recall + relationship traversal)
- **Nebius Token Factory** — `meta-llama/Llama-3.3-70B-Instruct`, OpenAI-compatible tool-calling
- **Next.js 15 + TypeScript strict** — single app
- **Browser Web Speech API** — optional voice, no extra keys

## API endpoints

| Route | Method | Description |
|---|---|---|
| `/api/chat` | POST `{patientId, message}` | Runs agent loop; returns reply + memory ops |
| `/api/seed` | POST `{patientId}` | Seeds patient graph into HydraDB |
| `/api/logs` | GET | Returns last 50 HydraDB trace ops |

## File layout

```
src/lib/
  hydra.ts     ← HydraDB client (only file calling the API)
  memory.ts    ← capture / recall / relate
  agent.ts     ← Nebius agent loop, up to 4 tool rounds
  tools.ts     ← recall_context, find_related, remember
  seed.ts      ← seeds patient graph on demand
  trace.ts     ← op logger (console + ring buffer for UI)
  nebius.ts    ← OpenAI SDK → Token Factory
  types.ts     ← MemoryNode, RecalledChunk, GraphRelation, MemoryEvent
  contract.ts  ← shared API types
```

## Deliverables

- `execution-logs.json` — captured cold-vs-warm contrast with ops and verdict
- `DEMO.md` — 90-second demo script
