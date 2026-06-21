import { capture } from "./memory";
import type { EdgeRel, MemoryEvent } from "./types";

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

// 🔒 Maya's events are hand-tuned for the hero demo's semantic recall. Keep
// this verbatim — do NOT derive it from the roster below (see warning above).
function mayaEvents(patientId: string): MemoryEvent[] {
  return [
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
}

// Generic builder: turns a declarative SeedPatient into memory nodes + edges.
// Each fact also feeds a narrative Session note so semantic recall stays strong.
function buildEvents(p: SeedPatient): MemoryEvent[] {
  const name = p.displayName;
  const events: MemoryEvent[] = [];
  const patientRel: { rel: EdgeRel; toLabel: string }[] = [];
  const narrative: string[] = [];

  for (const c of p.conditions) {
    patientRel.push({ rel: "HAS_CONDITION", toLabel: c.label });
    events.push({
      kind: "Condition",
      label: c.label,
      text: `Condition: ${name} has been diagnosed with ${c.label}.`,
    });
    narrative.push(`${name} has ${c.label}.`);
  }

  for (const m of p.medications) {
    patientRel.push({ rel: "TAKES", toLabel: m.label });
    const medRel: { rel: EdgeRel; toLabel: string }[] = [];
    const medText = [
      `Medication: ${name} takes ${m.label}${m.startedAt ? `, started ${m.startedAt}` : ""}.`,
    ];

    for (const t of m.treats ?? []) {
      medRel.push({ rel: "TREATS", toLabel: t });
      medText.push(`It is taken to treat ${t}.`);
    }
    for (const s of m.mayCause ?? []) {
      medRel.push({ rel: "MAY_CAUSE", toLabel: s });
      medText.push(`A known side effect of ${m.label} is ${s}.`);
      events.push({
        kind: "Symptom",
        label: s,
        text: `Symptom knowledge: ${s} is a recognised side effect of ${m.label}.`,
      });
      narrative.push(`${m.label} can cause ${s}.`);
    }
    for (const other of m.interactsWith ?? []) {
      medRel.push({ rel: "INTERACTS_WITH", toLabel: other });
      medText.push(
        `${m.label} has a significant drug interaction with ${other} — taking them together can be dangerous.`,
      );
      events.push({
        kind: "Medication",
        label: other,
        text: `Medication: ${other}. It interacts dangerously with ${m.label}, so the combination should be avoided.`,
      });
      narrative.push(`${m.label} interacts dangerously with ${other}.`);
    }

    events.push({
      kind: "Medication",
      label: m.label,
      text: medText.join(" "),
      data: m.startedAt ? { startedAt: m.startedAt } : undefined,
      relations: medRel,
    });
    narrative.push(`${name} takes ${m.label}${m.startedAt ? ` (started ${m.startedAt})` : ""}.`);
  }

  for (const a of p.allergies) {
    patientRel.push({ rel: "ALLERGIC_TO", toLabel: a.label });
    const allergyRel: { rel: EdgeRel; toLabel: string }[] = [];
    const allergyText = [`Allergy: ${name} is allergic to ${a.label}.`];
    for (const c of a.contraindicates ?? []) {
      allergyRel.push({ rel: "CONTRAINDICATES", toLabel: c });
      allergyText.push(`Because of this allergy, ${c} must be avoided.`);
      events.push({
        kind: "Medication",
        label: c,
        text: `Medication: ${c}. Contraindicated for ${name} due to a ${a.label} allergy.`,
      });
      narrative.push(`${name} is allergic to ${a.label}; avoid ${c}.`);
    }
    events.push({ kind: "Allergy", label: a.label, text: allergyText.join(" "), relations: allergyRel });
  }

  // Group repeated symptoms so recurrence ("3rd time this month") is visible.
  const byLabel = new Map<string, SeedSymptom[]>();
  for (const s of p.pastSymptoms) {
    const arr = byLabel.get(s.label) ?? [];
    arr.push(s);
    byLabel.set(s.label, arr);
  }
  for (const [label, occ] of byLabel) {
    patientRel.push({ rel: "REPORTED", toLabel: label });
    const detail = occ
      .map((o) => `${o.date}${o.severity ? ` (severity ${o.severity}/10)` : ""}${o.note ? ` — ${o.note}` : ""}`)
      .join("; ");
    events.push({
      kind: "Symptom",
      label,
      text: `Symptom history: ${name} has reported ${label} ${occ.length} time(s): ${detail}.`,
      data: { dates: occ.map((o) => o.date), count: occ.length },
    });
    narrative.push(`${name} reported ${label} ${occ.length} time(s) recently (${occ.map((o) => o.date).join(", ")}).`);
  }

  const moods = [...p.moods].sort((a, b) => a.date.localeCompare(b.date));
  for (const mood of moods) {
    const label = `mood ${mood.date}`;
    patientRel.push({ rel: "REPORTED", toLabel: label });
    events.push({
      kind: "MoodEntry",
      label,
      text: `MoodEntry: on ${mood.date}, ${name} rated their mood ${mood.score}/10${mood.note ? ` — ${mood.note}` : ""}.`,
      data: { score: mood.score, date: mood.date },
    });
  }
  if (moods.length) {
    narrative.push(
      `${name}'s recent mood scores: ${moods.map((m) => `${m.date}: ${m.score}/10`).join(", ")}.`,
    );
  }

  events.unshift({
    kind: "Patient",
    label: p.id,
    text: `Patient ${name} uses CarePilot to track their health. ${narrative.join(" ")}`.trim(),
    relations: patientRel,
  });

  events.push({
    kind: "Session",
    label: "seed-session",
    text: `Background on ${name}: ${narrative.join(" ")}`,
  });

  return events;
}

export async function seedPatient(patientId: string): Promise<number> {
  // The cold-start control must stay empty — that contrast is part of the demo.
  if (patientId === "cold") return 0;

  const patient = SEED_PATIENTS.find((p) => p.id === patientId);
  // Maya (and any unknown id) uses the canonical hand-tuned hero events.
  const events =
    patientId === "maya" || !patient ? mayaEvents(patientId) : buildEvents(patient);

  const ids = await capture(events, patientId);
  return ids.length;
}

// ============================================================================
// Demo roster (declarative).
// ----------------------------------------------------------------------------
// `seedPatient` DOES consume this roster: "maya" uses the canonical hand-tuned
// hero events (mayaEvents) for strongest semantic recall, and every other id
// (walter/sam/jordan/aisha/diego) is seeded via buildEvents() from its entry
// here. "cold" is intentionally absent so it stays the empty control. These
// pairings are well-documented and used only to demo memory/graph recall;
// CarePilot flags and suggests "raise with your clinician" — never diagnoses.
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
