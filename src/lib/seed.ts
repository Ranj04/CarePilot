import { capture } from "./memory";
import type { MemoryEvent } from "./types";

// ============================================================================
// 🔒 CANONICAL DEMO SEED — DO NOT CHANGE THE SCENARIO.
// ----------------------------------------------------------------------------
// Patient "maya" MUST be seeded as:
//   • Medication: lisinopril 10mg, started "last week", for hypertension
//   • Condition:  hypertension
//   • Edge:       lisinopril --MAY_CAUSE--> "dry cough"   (the side-effect catch)
//   • Edge:       lisinopril --TREATS--> hypertension
//   • MoodEntry:  a prior low-mood entry
//
// The HERO demo (see CLAUDE.md "hero behavior" + DEMO.md) is:
//   user says "I have a dry cough" → agent recalls lisinopril, traverses
//   MAY_CAUSE, and flags the known ACE-inhibitor side effect. A cold/unseeded
//   patient must NOT produce this. That contrast IS the demo.
//
// ⚠️  A previous session drifted this to propranolol/anxiety/dizziness, which
//     broke the written demo (DEMO.md, CLAUDE.md, README). If you change the
//     meds/conditions/symptoms here you MUST also update CLAUDE.md + DEMO.md to
//     match — otherwise the demo script and the live agent disagree on stage.
// ============================================================================

export async function seedPatient(patientId: string): Promise<number> {
  const events: MemoryEvent[] = [
    {
      kind: "Patient",
      label: patientId,
      text: `Patient ${patientId} is a 38-year-old person managing high blood pressure with CarePilot.`,
    },
    {
      kind: "Medication",
      label: "lisinopril 10mg",
      text: "Medication: lisinopril 10mg, an ACE inhibitor started last week to treat high blood pressure (hypertension). ACE inhibitors like lisinopril are well known to cause a persistent dry cough as a side effect.",
      data: { dose: "10mg", frequency: "once daily", startedAt: "last week" },
      relations: [
        { rel: "TREATS", toLabel: "hypertension" },
        { rel: "MAY_CAUSE", toLabel: "dry cough" },
      ],
    },
    {
      kind: "Condition",
      label: "hypertension",
      text: "Condition: hypertension (high blood pressure). Recently started on lisinopril 10mg once daily to manage it.",
    },
    {
      kind: "Symptom",
      label: "dry cough",
      text: "Symptom knowledge: a dry, persistent cough is a common and well-documented side effect of ACE inhibitors such as lisinopril, often appearing within weeks of starting the medication.",
    },
    {
      kind: "MoodEntry",
      label: "low mood june-14",
      text: `MoodEntry: ${patientId} reported feeling low mood on June 14 2026. Mood score 3 out of 10. Noted fatigue and low energy.`,
      data: { score: 3, date: "2026-06-14" },
    },
    // Explicit relationship memory that HydraDB can infer/recall from.
    {
      kind: "Session",
      label: "seed-session",
      text: `${patientId} started lisinopril 10mg about a week ago for hypertension (high blood pressure). Lisinopril is an ACE inhibitor, and a persistent dry cough is a known side effect of ACE inhibitors. ${patientId} also had a prior low mood entry in June 2026.`,
    },
  ];

  const ids = await capture(events, patientId);
  return ids.length;
}
