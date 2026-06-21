"use client";

import { useEffect, useRef, useState } from "react";
import Chat from "@/components/Chat";
import MemoryPanel from "@/components/MemoryPanel";
import type { MemoryOp } from "@/lib/contract";

// Demo roster shown as tabs. Mirrors the ids seeded by src/lib/seed.ts.
// "cold" is the intentionally-empty control. Kept here (not imported from
// seed.ts) so this client component doesn't bundle the server-only seeder.
const PATIENTS = [
  { id: "maya", label: "Maya", beat: "BP meds" },
  { id: "walter", label: "Walter", beat: "interaction" },
  { id: "sam", label: "Sam", beat: "recurrence" },
  { id: "jordan", label: "Jordan", beat: "mood trend" },
  { id: "aisha", label: "Aisha", beat: "asthma" },
  { id: "diego", label: "Diego", beat: "allergy" },
  { id: "cold", label: "New", beat: "no memory" },
] as const;

type PatientId = (typeof PATIENTS)[number]["id"];

export default function Home() {
  const [patientId, setPatientId] = useState<PatientId>("maya");
  const [ops, setOps] = useState<MemoryOp[]>([]);
  const [ready, setReady] = useState(false);
  const [resetKey, setResetKey] = useState(0);
  const seeded = useRef<Set<string>>(new Set());

  // Auto-seed the selected patient (once per session) before chatting, so
  // their memory exists in HydraDB. "cold" is never seeded.
  useEffect(() => {
    let cancelled = false;

    if (patientId === "cold" || seeded.current.has(patientId)) {
      setReady(true);
      return;
    }

    setReady(false);
    (async () => {
      try {
        await fetch("/api/seed", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ patientId }),
        });
        seeded.current.add(patientId);
      } catch {
        // If seeding fails, still let them chat — recall will just come back empty.
      } finally {
        if (!cancelled) setReady(true);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [patientId]);

  function switchPatient(id: PatientId) {
    if (id === patientId) return;
    setPatientId(id);
    setOps([]); // each patient is a separate session — reset the trace
  }

  // newest turn's ops on top; execution order preserved within a turn
  function addOps(turnOps: MemoryOp[]) {
    setOps((prev) => [...turnOps, ...prev]);
  }

  // Clear the visible session (thread + trace) to re-run a demo for the same
  // patient. Seeded memory persists in HydraDB, so no reseed is needed.
  function resetSession() {
    setOps([]);
    setResetKey((k) => k + 1);
  }

  const activeLabel = PATIENTS.find((p) => p.id === patientId)?.label ?? patientId;

  return (
    <main className="shell">
      <header className="appHeader">
        <div className="brand">
          <h1 className="wordmark">
            Care<em>Pilot</em>
          </h1>
          <p className="tagline">
            <span className="pulse" aria-hidden="true" />
            Remembers across sessions
          </p>
        </div>

        <div className="headerControls">
          <div className="segment" role="group" aria-label="Patient">
            {PATIENTS.map((p) => (
              <button
                key={p.id}
                className="segBtn"
                onClick={() => switchPatient(p.id)}
                aria-pressed={patientId === p.id}
                title={p.beat}
              >
                {p.label}
              </button>
            ))}
          </div>
          <button
            className="resetBtn"
            onClick={resetSession}
            title="Clear this session's chat & trace to re-run the demo"
          >
            ↻ Reset
          </button>
        </div>
      </header>

      <div className="workspace">
        <div className="chatArea">
          {ready ? (
            // key remounts the thread on patient switch or reset — sessions stay separate
            <Chat key={`${patientId}-${resetKey}`} patientId={patientId} onMemoryOps={addOps} />
          ) : (
            <div className="seeding" role="status" aria-live="polite">
              <div className="seedingDots">
                <span className="dot" />
                <span className="dot" />
                <span className="dot" />
              </div>
              <p>Preparing {activeLabel}&apos;s memory…</p>
            </div>
          )}
        </div>
        <MemoryPanel ops={ops} />
      </div>

      <p className="disclaimer">
        Not medical advice — call 911 in an emergency.
      </p>
    </main>
  );
}
