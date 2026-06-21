# DEMO.md — 90-second demo

Tell it as one story: a memoryless bot vs. CarePilot.

## The 30-second setup line
"Every health app forgets you the second you close it — so you re-explain your meds and history every time. CarePilot remembers. It stores everything in HydraDB as a connected graph and recalls it on its own to give you advice that actually fits your history."

## The spine (always run this — it's the proof)

The Memory panel must be visible the whole time.

1. **Cold start (the contrast).** Pick the **New** patient (no memory). Type: *"I have a dry cough."* CarePilot gives a generic answer and says it has no history. Point out: no memory, generic advice.

2. **The same person, remembered.** Switch to **Maya** (auto-seeds). Type the same: *"I have a dry cough."*
   - Point at the **Memory panel**: the agent *autonomously* calls `recall` and `traverse` — visible HydraDB reads.
   - CarePilot replies: *"You started lisinopril 10mg last week — a dry cough is a known side effect of ACE inhibitors. Worth flagging to your doctor before treating it as a cold."*
   - **This is the whole pitch in one line:** same input, different answer, because it remembered and traversed the graph.

## Bonus beats (optional — pick 1 if time allows; each is a different memory power)

Each patient auto-seeds on select. All verified working:

| Patient | Type | What memory makes it catch |
|---|---|---|
| **Walter** | "I started taking ibuprofen for my back." | He's on **warfarin** → flags the dangerous drug interaction. |
| **Diego** | "The doctor wants to start me on amoxicillin." | **Penicillin allergy** → amoxicillin is a penicillin; flags it before he fills it. |
| **Sam** | "My chest feels tight again." | Surfaces the **recurring pattern** of past chest-tightness reports. |
| **Jordan** | "I've been feeling pretty low." | Recalls the **declining mood trend** over recent weeks. |
| **Aisha** | "I'm a bit short of breath." | Knows she has **asthma** → contextualizes the symptom. |

> The strongest single bonus for non-technical judges is **Diego** (the allergy catch — obvious stakes). **Walter** is a close second.

## Land it
"Three things the brief asked for: HydraDB as the memory — every op you just saw was a real read or write. Autonomous recall — the agent chose to look things up, we didn't script it. Context-aware execution — same question, different answer, because of memory. That's an agent that remembers, not one with amnesia."

## Demo safety
- **Pre-seed before you present; never seed live.** Open each patient you plan to show once beforehand so HydraDB has indexed their memory (there's a ~10–15s indexing lag after seeding).
- The hero pair (**New → Maya**) is the fallback — `npm run demo` prints the cold-vs-warm transcript if the live network flakes.
- **Latency:** most replies land in ~10–20s (the thinking indicator covers the wait). A few queries (notably Aisha) can spike to ~90s — if you're tight on time, stick to Maya/Walter/Diego.
- Voice works in **real Google Chrome** only; keep it off if the demo network blocks Google's speech service.
- Use the **↻ Reset** control to clear a session between runs.
