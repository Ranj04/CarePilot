"use client";

import { useEffect, useRef, useState } from "react";
import Chat from "@/components/Chat";
import MemoryPanel from "@/components/MemoryPanel";
import type { MemoryOp } from "@/lib/contract";

// Pre-seeded demo roster shown as tabs (each proves a different memory power).
// Mirrors the ids seeded by src/lib/seed.ts. Kept here (not imported from
// seed.ts) so this client component doesn't bundle the server-only seeder.
const PATIENTS = [
  { id: "maya", label: "Maya", beat: "BP meds → dry cough" },
  { id: "walter", label: "Walter", beat: "drug interaction" },
  { id: "sam", label: "Sam", beat: "symptom recurrence" },
  { id: "jordan", label: "Jordan", beat: "mood trend" },
  { id: "aisha", label: "Aisha", beat: "asthma context" },
  { id: "diego", label: "Diego", beat: "allergy safety" },
] as const;

export default function Home() {
  const [patientId, setPatientId] = useState<string>("maya");
  const [ops, setOps] = useState<MemoryOp[]>([]);
  const [ready, setReady] = useState(false);
  const [resetKey, setResetKey] = useState(0);
  const [showNamePrompt, setShowNamePrompt] = useState(false);
  const [nameInput, setNameInput] = useState("");
  const seeded = useRef<Set<string>>(new Set());

  const isCustom = !PATIENTS.some((p) => p.id === patientId);

  // Auto-seed a roster patient (once per session) before chatting, so their
  // memory exists in HydraDB. Custom "new" patients are created via /api/init
  // in startNewSession instead — they start cold and build memory live.
  useEffect(() => {
    let cancelled = false;
    const isRoster = PATIENTS.some((p) => p.id === patientId);

    if (!isRoster || seeded.current.has(patientId)) {
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
        // If seeding fails, still let them chat — recall just comes back empty.
      } finally {
        if (!cancelled) setReady(true);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [patientId]);

  function switchPatient(id: string) {
    if (id === patientId) return;
    setPatientId(id);
    setOps([]); // each patient is a separate session — reset the trace
  }

  // Create a brand-new, memoryless patient and start a live session for them.
  async function startNewSession(name: string) {
    const slug = name.trim().toLowerCase().replace(/\s+/g, "-") || `user-${Date.now()}`;
    seeded.current.add(slug); // don't run the roster seeder for a custom patient
    setShowNamePrompt(false);
    setNameInput("");
    setOps([]);
    setReady(false);
    setPatientId(slug);
    try {
      await fetch("/api/init", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ patientId: slug }),
      });
    } catch {
      // init is best-effort; chatting still works (recall just starts empty).
    } finally {
      setReady(true);
    }
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
            <button
              className="segBtn"
              onClick={() => setShowNamePrompt(true)}
              aria-pressed={isCustom}
              title="Start a brand-new patient with no memory and watch it build live"
            >
              {isCustom ? `${patientId} · new` : "+ New"}
            </button>
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

      {showNamePrompt && (
        <div
          className="modalOverlay"
          role="dialog"
          aria-modal="true"
          aria-label="New patient"
          onClick={() => setShowNamePrompt(false)}
        >
          <div className="modalCard" onClick={(e) => e.stopPropagation()}>
            <p className="modalTitle">Start a new patient</p>
            <p className="modalHint">
              They begin with no memory — CarePilot builds it as you chat.
            </p>
            <input
              className="field"
              autoFocus
              value={nameInput}
              onChange={(e) => setNameInput(e.target.value)}
              onKeyDown={(e) =>
                e.key === "Enter" && nameInput.trim() && startNewSession(nameInput)
              }
              placeholder="e.g. Jordan"
              aria-label="New patient name"
            />
            <div className="modalBtns">
              <button className="resetBtn" onClick={() => setShowNamePrompt(false)}>
                Cancel
              </button>
              <button
                className="sendBtn"
                onClick={() => nameInput.trim() && startNewSession(nameInput)}
              >
                Start
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="workspace">
        <div className="chatArea">
          {ready ? (
            // key remounts the thread on patient switch or reset — sessions stay separate
            <Chat
              key={`${patientId}-${resetKey}`}
              patientId={patientId}
              onMemoryOps={addOps}
            />
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
