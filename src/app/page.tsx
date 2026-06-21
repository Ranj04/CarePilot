"use client";

import { useState } from "react";
import Chat from "@/components/Chat";
import MemoryPanel from "@/components/MemoryPanel";
import type { MemoryOp } from "@/lib/contract";

export default function Home() {
  const [patientId, setPatientId] = useState("maya");
  const [isCold, setIsCold] = useState(false);
  const [ops, setOps] = useState<MemoryOp[]>([]);
  const [showNamePrompt, setShowNamePrompt] = useState(false);
  const [nameInput, setNameInput] = useState("");

  async function startNewSession(name: string) {
    const slug = name.trim().toLowerCase().replace(/\s+/g, "-") || `user-${Date.now()}`;
    setPatientId(slug);
    setIsCold(true);
    setOps([]);
    setShowNamePrompt(false);
    setNameInput("");
    await fetch("/api/init", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ patientId: slug }),
    });
  }

  function switchToMaya() {
    setPatientId("maya");
    setIsCold(false);
    setOps([]);
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
          <button className="segBtn" onClick={switchToMaya} aria-pressed={!isCold}>
            Maya · seeded
          </button>
          <button className="segBtn" onClick={() => setShowNamePrompt(true)} aria-pressed={isCold}>
            {isCold ? `${patientId} · new` : "Cold · new"}
          </button>
        </div>
      </header>

      {showNamePrompt && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 50 }}>
          <div style={{ background: "#fff", borderRadius: 12, padding: 24, width: 320, display: "flex", flexDirection: "column", gap: 12 }}>
            <p style={{ fontWeight: 600, margin: 0 }}>New patient name</p>
            <input
              autoFocus
              value={nameInput}
              onChange={(e) => setNameInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && nameInput.trim() && startNewSession(nameInput)}
              placeholder="e.g. John"
              style={{ border: "1px solid #ccc", borderRadius: 8, padding: "8px 12px", fontSize: 14 }}
            />
            <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
              <button onClick={() => setShowNamePrompt(false)} style={{ padding: "6px 14px", borderRadius: 8, border: "1px solid #ccc", cursor: "pointer" }}>Cancel</button>
              <button onClick={() => nameInput.trim() && startNewSession(nameInput)} style={{ padding: "6px 14px", borderRadius: 8, background: "#1a5c4f", color: "#fff", border: "none", cursor: "pointer" }}>Start</button>
            </div>
          </div>
        </div>
      )}

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
