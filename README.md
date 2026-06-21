# CarePilot — the health companion that remembers

> **8-hour HydraDB hackathon build.** One agent. One memory. It remembers your meds, symptoms, and mood across sessions and changes its advice because of them.

## The problem (from the brief)

Most agents have amnesia — close the tab and they forget you. Health is the worst place for that: every visit you re-explain your meds, your history, what the last doctor said.

## What CarePilot does

You chat with CarePilot (text, with optional voice) about how you're feeling. **Before it answers, it autonomously recalls your history from HydraDB** — what you take, what you've reported before, how your mood has trended — and its recommendation changes because of that context.

The moment that wins the demo: you mention a **dry cough**, and CarePilot connects it through its memory graph to the **lisinopril** you started last week (a known side effect) — something a fresh, memoryless bot could never catch.

## How it meets the mandatory requirements

| Requirement | How |
|---|---|
| **HydraDB as primary memory** | Every fact (meds, symptoms, mood, conditions) lives in HydraDB as a graph. No other canonical store. |
| **Autonomous recall** | The agent *decides* to call recall/traverse tools each turn — recall isn't hardcoded into the script. |
| **Context-aware execution** | The recommendation visibly differs between a cold first session and a warm later one, and the graph surfaces links (symptom ↔ medication side-effect) a flat lookup can't. |

## Why HydraDB and not a table

The win is **relationships**, not rows. CarePilot stores a graph — `Patient —TAKES→ Medication —MAY_CAUSE→ Symptom`, `Symptom —SUGGESTS→ Condition` — and *traverses* it at recall time, plus semantic recall ("have you mentioned something like this before?") and mood trend over time. That's the thing a SQL `SELECT` doesn't give you, and it's the answer to the judge's "why do you need HydraDB?"

## Stack

- **HydraDB** — memory & context graph (mandatory, the star).
- **Nebius Token Factory** — the LLM brain (reasoning + tool-calling, OpenAI-compatible).
- **Next.js + TypeScript** — single app, fresh build.
- **Browser Web Speech API** — optional voice (speech-to-text + text-to-speech), no extra keys.

## The docs in this folder

Read them in this order:

1. **SETUP.md** — everything to set up *before* you open Claude Code (accounts, keys, installs, the kickoff prompt).
2. **ARCHITECTURE.md** — the data model, agent loop, tools, and file layout.
3. **CLAUDE.md** — drop this in the repo root; it's the brief Claude Code builds from.
4. **BUILD_PLAN.md** — the hour-by-hour plan with verify gates.
5. **DEMO.md** — the 90-second demo script.
