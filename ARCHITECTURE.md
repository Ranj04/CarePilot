# CarePilot — Architecture

The whole system is one loop: **recall from HydraDB → reason on Nebius → respond → write back to HydraDB**, with every memory operation traced.

```
User ──> Chat/Voice UI ──> /api/chat ──> Agent loop
                                            │
                    ┌───────────────────────┼───────────────────────┐
                    ▼                        ▼                        ▼
            recall_context()          find_related()             remember()
              (semantic +              (graph traversal)         (write nodes
               recency recall)                                    + edges)
                    │                        │                        │
                    └──────────► HydraDB (context graph) ◄────────────┘
                                            │
                                   every op -> trace log
```

## 1. The memory model (HydraDB graph)

> Confirm exact node/edge API against **docs.hydradb.com** — keep all HydraDB calls behind `lib/hydra.ts` so the rest of the app never touches the SDK directly.

**Nodes (entities):**

- `Patient` — the user (single patient for the demo).
- `Symptom` — e.g. "dry cough", with severity + free text.
- `Condition` — e.g. "hypertension".
- `Medication` — e.g. "lisinopril 10mg".
- `MoodEntry` — timestamped mood with a score.
- `Session` — one conversation (for provenance + recency).

**Edges (relationships — this is why it's HydraDB, not a table):**

- `Patient —TAKES→ Medication`
- `Patient —HAS_CONDITION→ Condition`
- `Patient —REPORTED→ Symptom`
- `Medication —MAY_CAUSE→ Symptom`  ← the side-effect link the demo turns on
- `Medication —TREATS→ Condition`
- `Symptom —SUGGESTS→ Condition`
- `Symptom | MoodEntry —RECORDED_IN→ Session`

**Three recall powers** (lean on whichever HydraDB exposes natively):

1. **Semantic** — match new symptom text against past nodes ("chest is tight" ≈ "tightness in chest"). Prefer HydraDB's built-in semantic recall; only compute Nebius embeddings yourself if HydraDB needs you to supply vectors.
2. **Relational** — traverse edges (new symptom → meds that may cause it → flag).
3. **Recency / trend** — order MoodEntry/Symptom by time; compute a simple decay-weighted mood trend.

## 2. The agent loop (`lib/agent.ts`)

Each user turn:

1. Send the message to Nebius with the system prompt + the tool schemas.
2. The model **chooses** to call tools (this is the "autonomous recall" requirement — do not pre-fetch and stuff context; let the model ask):
   - `recall_context({ query, kinds? })` → relevant nodes via semantic + recency recall.
   - `find_related({ nodeId, rel? })` → graph neighbors (e.g. meds linked to a symptom).
   - `remember({ events })` → write new Symptom/Mood/Medication nodes + edges with provenance.
3. Feed tool results back; the model produces a context-aware reply.
4. Return the reply + a list of the memory ops performed (for the trace panel).

Keep the loop to a max of ~4 tool round-trips per turn so demos stay snappy.

## 3. Tools (Nebius function-calling schemas)

| Tool | Input | Does |
|---|---|---|
| `recall_context` | `query`, optional `kinds[]` | Semantic + recency read from HydraDB; returns nodes. |
| `find_related` | `nodeId`, optional `rel` | Graph traversal; returns connected nodes (the side-effect catch). |
| `remember` | `events[]` (`{kind, label, data, relations?}`) | Writes nodes + edges; returns ids. |

`get_mood_trend({ window })` is optional sugar; the model can also derive it from `recall_context`.

## 4. File layout (fresh Next.js app)

```
carepilot/
  CLAUDE.md                 # the build brief (already written — keep at root)
  .env.local                # from .env.example
  src/
    app/
      page.tsx              # chat UI (+ optional voice orb) + a "Memory" / trace panel
      api/chat/route.ts     # the agent endpoint (streams the reply)
    lib/
      hydra.ts              # HydraDB client: upsertNode, addEdge, recall, traverse  (ONLY file touching the SDK)
      nebius.ts             # Nebius client (OpenAI SDK pointed at Token Factory) + tool-call helper
      memory.ts             # capture / recall / relate / context — built on hydra.ts
      agent.ts              # the loop + tool dispatch
      tools.ts              # the 3 tool schemas + handlers
      trace.ts              # trace logger (console + in-memory ring buffer for the UI panel)
      seed.ts               # seeds "Maya": lisinopril, hypertension, a past mood dip
      types.ts              # Node/Edge/Event types
    components/
      Chat.tsx, MemoryPanel.tsx, VoiceButton.tsx (optional)
```

> You already have a reference implementation of `types.ts` / `memory.ts` / `tools.ts` shapes in the earlier `carepilot-memory` scaffold — reuse those shapes, but swap the in-memory store for real HydraDB in `hydra.ts`.

## 5. Voice (optional, browser-only — no extra keys)

- **Speech-to-text:** `webkitSpeechRecognition` (Web Speech API) → fills the chat input.
- **Text-to-speech:** `speechSynthesis.speak()` on the agent's reply.
- Keep it a thin layer over the text path so a voice failure never blocks the demo. (Grok Voice realtime is a post-hackathon upgrade.)

## 6. Trace logging (deliverable #3)

`lib/trace.ts` logs every HydraDB write and query: `{ op, args, resultSummary, ms, ts }`. Print to the server console **and** keep the last ~50 in memory, exposed to a `MemoryPanel` in the UI so the demo *shows* autonomous reads/writes happening live. Export them to a file at the end for the submission.

## 7. How each mandatory requirement is satisfied (point at these in the demo)

- **HydraDB primary memory** → `lib/hydra.ts` is the only persistence; nothing canonical in localStorage.
- **Autonomous recall** → the model emits `recall_context` / `find_related` tool calls itself; show them in the trace panel.
- **Context-aware execution** → run the same prompt cold vs. warm; the warm answer changes (and the side-effect catch only fires with memory).
