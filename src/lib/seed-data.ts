// src/lib/seed-data.ts
// Demo seed data for CarePilot. Track A: consume this in seed.ts and write each
// patient into HydraDB as nodes + edges. See mapping notes at the bottom.
//
// Clinical pairings here are well-documented and used ONLY to demo memory/graph
// recall. CarePilot flags and suggests "raise with your clinician" — it never
// diagnoses or prescribes.

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

// --- Mapping notes for seed.ts (Track A) ------------------------------------
// For each patient (skip "cold"):
//   1. upsert Patient node (id, displayName).
//   2. conditions      -> Condition node + (Patient HAS_CONDITION Condition).
//   3. medications      -> Medication node + (Patient TAKES Medication).
//        med.treats         -> (Medication TREATS Condition)
//        med.mayCause       -> Symptom node (if absent) + (Medication MAY_CAUSE Symptom)
//        med.interactsWith  -> Medication node (if absent) + (Medication INTERACTS_WITH Medication)
//   4. allergies        -> Allergy node + (Patient ALLERGIC_TO Allergy).
//        allergy.contraindicates -> (Allergy CONTRAINDICATES Medication)
//   5. pastSymptoms     -> Symptom node + (Patient REPORTED Symptom) + a Session
//        for that date + (Symptom RECORDED_IN Session). Keep the date on the node
//        so recurrence/recency queries work.
//   6. moods            -> MoodEntry node (score, date) + (MoodEntry RECORDED_IN Session).
// Resolve relation targets by (kind + label); create the target node if missing.
