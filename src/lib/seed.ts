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

// ============================================================================
// Reference demo roster (declarative).
// ----------------------------------------------------------------------------
// The broader set of demo patients and their clinical pairings, kept here for
// reference and future wiring. NOTE: the live seed path above (`seedPatient`)
// only uses the canonical "maya" scenario with hand-tuned `text` fields for
// strong semantic recall — it does NOT consume this roster. These pairings are
// well-documented and used only to demo memory/graph recall; CarePilot flags
// and suggests "raise with your clinician" — it never diagnoses or prescribes.
// ============================================================================

export interface SeedMedication {
  label: string;
  startedAt?: string; // human phrase, e.g. "last week"
  treats?: string[]; // condition labels -> Medication TREATS Condition
  mayCause?: string[]; // symptom labels -> Medication MAY_CAUSE Symptom
  interactsWith?: string[]; // medication labels -> Medication INTERACTS_WITH Medication
}

export interface SeedSymptom {
  label: string;
  date: string; // ISO date
  severity?: number; // 1-10
  note?: string;
}

export interface SeedMood {
  date: string; // ISO date
  score: number; // 1-10, lower = worse
  note?: string;
}

export interface SeedPatient {
  id: string;
  displayName: string;
  demoBeat: string; // one-line reminder of what this patient proves
  conditions: { label: string }[];
  medications: SeedMedication[];
  allergies: { label: string; contraindicates?: string[] }[];
  pastSymptoms: SeedSymptom[];
  moods: SeedMood[];
}

// Dates are relative to "now"; regenerate at seed time if you want them fresh.
const d = (daysAgo: number) =>
  new Date(Date.now() - daysAgo * 86_400_000).toISOString().slice(0, 10);

export const SEED_PATIENTS: SeedPatient[] = [
  {
    id: "maya",
    displayName: "Maya",
    demoBeat: "Graph traversal: med -> side effect (lisinopril -> dry cough).",
    conditions: [{ label: "hypertension" }],
    medications: [
      {
        label: "lisinopril 10mg",
        startedAt: "last week",
        treats: ["hypertension"],
        mayCause: ["dry cough"],
      },
    ],
    allergies: [],
    pastSymptoms: [],
    moods: [{ date: d(20), score: 4, note: "low after a loss in the family" }],
  },

  {
    id: "walter",
    displayName: "Walter",
    demoBeat: "Relational safety: drug-drug interaction (warfarin x ibuprofen).",
    conditions: [{ label: "atrial fibrillation" }],
    medications: [
      {
        label: "warfarin 5mg",
        startedAt: "six months ago",
        treats: ["atrial fibrillation"],
        interactsWith: ["ibuprofen"],
      },
    ],
    allergies: [],
    pastSymptoms: [],
    moods: [],
  },

  {
    id: "sam",
    displayName: "Sam",
    demoBeat: "Recurrence / pattern over time (3rd chest tightness this month).",
    conditions: [],
    medications: [],
    allergies: [],
    pastSymptoms: [
      { label: "chest tightness", date: d(26), severity: 4, note: "before a deadline" },
      { label: "chest tightness", date: d(14), severity: 5, note: "stressful week" },
      { label: "chest tightness", date: d(5), severity: 4, note: "after an argument" },
    ],
    moods: [],
  },

  {
    id: "jordan",
    displayName: "Jordan",
    demoBeat: "Trend / recency: mood declining over three weeks.",
    conditions: [],
    medications: [],
    allergies: [],
    pastSymptoms: [],
    moods: [
      { date: d(21), score: 6 },
      { date: d(14), score: 5 },
      { date: d(7), score: 4 },
      { date: d(2), score: 3, note: "sleeping badly" },
    ],
  },

  {
    id: "aisha",
    displayName: "Aisha",
    demoBeat: "Context-aware escalation: asthma raises care level for breathlessness.",
    conditions: [{ label: "asthma" }],
    medications: [
      { label: "albuterol inhaler", treats: ["asthma"] },
    ],
    allergies: [],
    pastSymptoms: [
      { label: "wheezing", date: d(40), severity: 3, note: "during a cold" },
    ],
    moods: [],
  },

  {
    id: "diego",
    displayName: "Diego",
    demoBeat: "Relational safety: allergy x drug (penicillin allergy vs amoxicillin).",
    conditions: [{ label: "recurrent sinus infections" }],
    medications: [],
    allergies: [{ label: "penicillin", contraindicates: ["amoxicillin"] }],
    pastSymptoms: [],
    moods: [],
  },

  // The cold-start control: intentionally empty. Do NOT seed nodes for this id.
  {
    id: "cold",
    displayName: "New user (no memory)",
    demoBeat: "Baseline contrast — generic, memoryless answers.",
    conditions: [],
    medications: [],
    allergies: [],
    pastSymptoms: [],
    moods: [],
  },
];
