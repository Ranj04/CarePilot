"use client";

import { useState } from "react";
import Chat from "@/components/Chat";
import MemoryPanel from "@/components/MemoryPanel";
import type { MemoryOp } from "@/lib/contract";

type PatientId = "maya" | "cold";

export default function Home() {
  const [patientId, setPatientId] = useState<PatientId>("maya");
  const [ops, setOps] = useState<MemoryOp[]>([]);

  function switchPatient(id: PatientId) {
    if (id === patientId) return;
    setPatientId(id);
    setOps([]); // cold vs warm are separate sessions — reset the trace
  }

  // newest turn's ops on top; execution order preserved within a turn
  function addOps(turnOps: MemoryOp[]) {
    setOps((prev) => [...turnOps, ...prev]);
  }

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

        <div className="segment" role="group" aria-label="Patient">
          {(["maya", "cold"] as PatientId[]).map((id) => (
            <button
              key={id}
              className="segBtn"
              onClick={() => switchPatient(id)}
              aria-pressed={patientId === id}
            >
              {id === "maya" ? "Maya · seeded" : "Cold · new"}
            </button>
          ))}
        </div>
      </header>

      <div className="workspace">
        <div className="chatArea">
          {/* key remounts the thread when switching patients — cold vs warm stay separate */}
          <Chat key={patientId} patientId={patientId} onMemoryOps={addOps} />
        </div>
        <MemoryPanel ops={ops} />
      </div>

      <p className="disclaimer">
        Not medical advice — call 911 in an emergency.
      </p>
    </main>
  );
}
