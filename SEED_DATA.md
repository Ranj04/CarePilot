# SEED_DATA.md — demo scenarios

Six seeded patients, each proving a **different** memory capability, plus a cold-start control. Pick whichever beat fits the room; have 2–3 ready as backups.

> Framing rule for every scenario: CarePilot **surfaces and flags**, it never diagnoses or prescribes. Every reply ends with "worth flagging to your clinician" — not "you have X."

| Patient id | Capability shown | You type | What memory makes it say |
|---|---|---|---|
| `maya` | **Graph traversal** (med → side effect) | "I've had a dry cough." | Recalls she takes lisinopril, traverses `MAY_CAUSE`, flags the cough as a known ACE-inhibitor side effect — not a random cold. |
| `walter` | **Relational safety** (drug ↔ drug) | "I started taking ibuprofen for my back." | Recalls he's on warfarin, traverses `INTERACTS_WITH`, warns about increased bleeding risk before he keeps taking it. |
| `sam` | **Recurrence / pattern over time** | "My chest feels tight again." | Recalls this is the **third** chest-tightness report this month and that they cluster on stressful days — surfaces the pattern, not just the single event. |
| `jordan` | **Trend / recency** (mood) | "I've been feeling pretty low." | Recalls mood check-ins trending **down over three weeks**, not a one-off — recommends raising it now rather than waiting. |
| `aisha` | **Context-aware escalation** | "I'm a bit short of breath." | Recalls she has **asthma**, so the same symptom escalates the recommended care level higher than it would for a healthy person. |
| `diego` | **Relational safety** (allergy ↔ drug) | "The doctor wants to start me on amoxicillin." | Recalls a **penicillin allergy**, knows amoxicillin is a penicillin, and flags it before he fills the script. |
| `cold` | **Baseline (no memory)** | any of the above | Generic, memoryless answer. This is your contrast — run it right before a seeded one. |

## The two strongest demo pairings (use these if short on time)

1. **`cold` then `maya`** — identical input ("dry cough"), opposite answers. The cleanest proof of "context over amnesia."
2. **`diego`** — the allergy catch lands hard with non-technical judges because the stakes are obvious ("it stopped me taking something I'm allergic to").

## Capabilities map (say these out loud)

- **Semantic recall** — type "my chest is tight" and it still matches Sam's stored "chest tightness." Not exact-string.
- **Graph traversal** — `maya`, `walter`, `diego` all traverse a relationship a flat table wouldn't connect.
- **Temporal memory** — `sam` (recurrence count) and `jordan` (trend) use *when* things happened, not just *that* they happened.
- **Context-aware execution** — `aisha` changes the *recommendation*, not just the explanation. This is the hardest-graded requirement; lead with it if judges are technical.

## New edge types these scenarios add to the graph

Beyond the originals (`TAKES`, `HAS_CONDITION`, `REPORTED`, `MAY_CAUSE`, `TREATS`, `SUGGESTS`, `RECORDED_IN`), the seed data introduces:

- `Medication —INTERACTS_WITH→ Medication` (walter)
- `Patient —ALLERGIC_TO→ Allergy` and `Allergy —CONTRAINDICATES→ Medication` (diego)

Track A: add these to `hydra.ts`/`memory.ts` when wiring the seed.

## Demo safety

- Seed all patients **before** presenting (`/api/seed` per patient, or one seed-all script).
- Pre-capture each scenario's reply as a fallback for network/rate-limit hiccups.
- Keep the "not medical advice — call 911 in an emergency" line visible the whole time.
