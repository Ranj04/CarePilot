import { capture } from "./memory";
import type { MemoryEvent } from "./types";

export async function seedPatient(patientId: string): Promise<number> {
  const events: MemoryEvent[] = [
    {
      kind: "Patient",
      label: patientId,
      text: `Patient ${patientId} is a 38-year-old person managing their health with CarePilot.`,
    },
    {
      kind: "Medication",
      label: "lisinopril 10mg",
      text: "Medication: lisinopril 10mg. An ACE inhibitor antihypertensive drug taken daily to control blood pressure.",
      data: { dose: "10mg", frequency: "daily" },
      relations: [
        { rel: "TREATS", toLabel: "hypertension" },
        { rel: "MAY_CAUSE", toLabel: "dry cough" },
      ],
    },
    {
      kind: "Condition",
      label: "hypertension",
      text: "Condition: hypertension (high blood pressure). Diagnosed and managed with lisinopril 10mg.",
      relations: [{ rel: "TREATS", toLabel: "lisinopril 10mg" }],
    },
    {
      kind: "Symptom",
      label: "dry cough",
      text: "Symptom: dry cough. Known side effect of ACE inhibitor medications such as lisinopril. A persistent dry cough can indicate drug-induced cough from lisinopril.",
    },
    {
      kind: "MoodEntry",
      label: "low mood june-14",
      text: `MoodEntry: ${patientId} reported feeling low mood on June 14 2026. Mood score 3 out of 10. Noted fatigue and low energy.`,
      data: { score: 3, date: "2026-06-14" },
    },
    // Explicit relationship memories that HydraDB can infer from
    {
      kind: "Session",
      label: "seed-session",
      text: `${patientId} takes lisinopril 10mg daily for hypertension. Lisinopril 10mg may cause dry cough as a known side effect of ACE inhibitors. Patient has history of hypertension condition. Prior mood entry shows low mood in June 2026.`,
    },
  ];

  const ids = await capture(events, patientId);
  return ids.length;
}
