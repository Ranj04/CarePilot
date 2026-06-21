import { describe, expect, it } from "vitest";
import { parseFhirBundle, type FhirBundle } from "./fhir-import";
import sampleBundle from "../../data/sample-fhir-bundle.json";

describe("parseFhirBundle (C0)", () => {
  it("parses the sample bundle into the right counts + labels", () => {
    const r = parseFhirBundle(sampleBundle as FhirBundle);

    expect(r.patientName).toBe("Maya Rivera");
    expect(r.conditions).toEqual(["Hypertension", "Type 2 diabetes mellitus"]);
    expect(r.medications).toEqual(["lisinopril 10mg", "metformin 500mg"]);
    expect(r.allergies).toEqual(["Penicillin"]);

    // one MemoryEvent per imported entity (2 + 2 + 1)
    expect(r.events).toHaveLength(5);
    expect(r.events.map((e) => e.kind).sort()).toEqual([
      "Allergy",
      "Condition",
      "Condition",
      "Medication",
      "Medication",
    ]);

    // the demo catch depends on lisinopril being importable
    expect(r.medications).toContain("lisinopril 10mg");
  });

  it("falls back to coding[].display when code.text is missing", () => {
    const bundle: FhirBundle = {
      resourceType: "Bundle",
      entry: [
        {
          resource: {
            resourceType: "Condition",
            code: { coding: [{ display: "Asthma" }] }, // no .text
          },
        },
      ],
    };
    expect(parseFhirBundle(bundle).conditions).toEqual(["Asthma"]);
  });

  it("ignores unknown resource types without crashing", () => {
    const bundle: FhirBundle = {
      resourceType: "Bundle",
      entry: [
        { resource: { resourceType: "Observation", code: { text: "Heart rate" } } },
        { resource: { resourceType: "Condition", code: { text: "Hypertension" } } },
        { resource: {} }, // typeless resource
        {}, // empty entry
      ],
    };
    const r = parseFhirBundle(bundle);
    expect(r.conditions).toEqual(["Hypertension"]);
    expect(r.medications).toEqual([]);
    expect(r.events).toHaveLength(1);
  });

  it("returns empty records for an empty / missing bundle", () => {
    for (const input of [{ resourceType: "Bundle", entry: [] }, {}, null, undefined]) {
      const r = parseFhirBundle(input as FhirBundle);
      expect(r.conditions).toEqual([]);
      expect(r.medications).toEqual([]);
      expect(r.allergies).toEqual([]);
      expect(r.events).toEqual([]);
      expect(r.patientName).toBeNull();
    }
  });
});
