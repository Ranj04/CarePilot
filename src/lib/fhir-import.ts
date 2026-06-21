// Pure FHIR R4 parsing — NO HydraDB, NO network. Maps a small FHIR bundle to
// the MemoryEvent shapes that memory.ts already consumes. The import endpoint
// (src/app/api/import-records/route.ts) writes these via the existing path.
import type { MemoryEvent } from "./types";

// Minimal FHIR R4 shapes — only the fields we read.
interface Coding {
  system?: string;
  code?: string;
  display?: string;
}
interface CodeableConcept {
  text?: string;
  coding?: Coding[];
}
interface HumanName {
  text?: string;
  given?: string[];
  family?: string;
}
interface FhirResource {
  resourceType?: string;
  code?: CodeableConcept;
  medicationCodeableConcept?: CodeableConcept;
  name?: HumanName[];
}
interface BundleEntry {
  resource?: FhirResource;
}
export interface FhirBundle {
  resourceType?: string;
  entry?: BundleEntry[];
}

export interface ImportedRecords {
  patientName: string | null;
  conditions: string[];
  medications: string[];
  allergies: string[];
  /** The same MemoryEvent shapes memory.ts/capture() consume (entity nodes). */
  events: MemoryEvent[];
}

// label = code.text, falling back to the first coding[].display.
function conceptLabel(concept?: CodeableConcept): string | null {
  if (!concept) return null;
  if (concept.text && concept.text.trim()) return concept.text.trim();
  const display = concept.coding?.find((c) => c.display && c.display.trim())?.display;
  return display ? display.trim() : null;
}

function readPatientName(names?: HumanName[]): string | null {
  const n = names?.[0];
  if (!n) return null;
  if (n.text && n.text.trim()) return n.text.trim();
  const parts = [...(n.given ?? []), n.family].filter((p): p is string => !!p && !!p.trim());
  return parts.length ? parts.join(" ") : null;
}

export function parseFhirBundle(bundle: FhirBundle | null | undefined): ImportedRecords {
  const conditions: string[] = [];
  const medications: string[] = [];
  const allergies: string[] = [];
  let patientName: string | null = null;

  for (const entry of bundle?.entry ?? []) {
    const r = entry?.resource;
    if (!r?.resourceType) continue; // skip malformed / typeless entries

    switch (r.resourceType) {
      case "Patient":
        patientName = patientName ?? readPatientName(r.name);
        break;
      case "Condition": {
        const label = conceptLabel(r.code);
        if (label) conditions.push(label);
        break;
      }
      case "MedicationStatement":
      case "MedicationRequest": {
        const label = conceptLabel(r.medicationCodeableConcept);
        if (label) medications.push(label);
        break;
      }
      case "AllergyIntolerance": {
        const label = conceptLabel(r.code);
        if (label) allergies.push(label);
        break;
      }
      default:
        break; // unknown resource type — ignore, don't crash
    }
  }

  const events: MemoryEvent[] = [
    ...conditions.map<MemoryEvent>((label) => ({
      kind: "Condition",
      label,
      text: `Condition (imported from connected health records): ${label}.`,
    })),
    ...medications.map<MemoryEvent>((label) => ({
      kind: "Medication",
      label,
      text: `Medication (imported from connected health records): ${label}. The patient is currently taking this per their chart.`,
    })),
    ...allergies.map<MemoryEvent>((label) => ({
      kind: "Allergy",
      label,
      text: `Allergy (imported from connected health records): the patient is allergic to ${label}.`,
    })),
  ];

  return { patientName, conditions, medications, allergies, events };
}
