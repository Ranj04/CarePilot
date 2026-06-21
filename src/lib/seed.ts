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
      label: "propranolol 20mg",
      text: "Medication: propranolol 20mg. A beta blocker taken as needed for anxiety and physical symptoms such as racing heart.",
      data: { dose: "20mg", frequency: "as needed" },
      relations: [
        { rel: "TREATS", toLabel: "anxiety" },
        { rel: "MAY_CAUSE", toLabel: "dizziness" },
      ],
    },
    {
      kind: "Condition",
      label: "anxiety",
      text: "Condition: anxiety. Managed partly with propranolol 20mg as needed for physical anxiety symptoms.",
      relations: [{ rel: "TREATS", toLabel: "propranolol 20mg" }],
    },
    {
      kind: "Symptom",
      label: "dizziness",
      text: "Symptom: dizziness and lightheadedness. Previously reported after taking propranolol and skipping breakfast.",
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
      text: `${patientId} takes propranolol 20mg as needed for anxiety. Propranolol can contribute to dizziness or lightheadedness, especially around low food intake. ${patientId} skipped breakfast twice this week and previously reported dizziness. Prior mood entry shows low mood in June 2026.`,
    },
  ];

  const ids = await capture(events, patientId);
  return ids.length;
}
