# DEMO.md — 90-second demo

Tell it as one story: a memoryless bot vs. CarePilot.

## The 30-second setup line
"Every health app forgets you the second you close it — so you re-explain your meds and history every time. CarePilot remembers. It stores everything in HydraDB as a connected graph and recalls it on its own to give you advice that actually fits your history."

## The run (have the trace/Memory panel visible the whole time)

1. **Cold start (the contrast).** Fresh patient. Type: *"I've got a dry cough."* CarePilot gives a generic answer. Point out: no memory, generic advice.

2. **The same person, remembered.** Switch to seeded patient "Maya." Type the same: *"I've got a dry cough."*
   - Point at the **Memory panel**: the agent *autonomously* calls `recall_context` and `find_related` — visible HydraDB reads.
   - CarePilot replies: *"You started lisinopril last week — dry cough is a known side effect. Worth flagging before you treat it as a cold."*
   - **This is the whole pitch in one line:** same input, different answer, because it remembered and traversed the graph.

3. **It evolves.** Add: *"My mood's been low again."* Show it `remember()`-ing the new entry (write op in the panel) and noting the trend vs. her past low mood.

## Land it
"Three things the brief asked for: HydraDB as the memory — every op you just saw was a real read or write. Autonomous recall — the agent chose to look things up, we didn't script it. Context-aware execution — same question, different answer, because of memory. That's an agent that remembers, not one with amnesia."

## Demo safety
- Pre-seed Maya before you present; never seed live.
- Have the cold and warm replies pre-captured as a fallback if the network flakes.
- Voice is a bonus — only turn it on if it's been solid; the text + trace panel is the real proof.
