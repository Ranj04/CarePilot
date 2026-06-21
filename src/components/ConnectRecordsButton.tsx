"use client";

import { useState } from "react";
import type { MemoryOp } from "@/lib/contract";

// Feature flag — the whole feature is off unless this is explicitly enabled,
// so the MVP can never be affected by it.
export const CHART_IMPORT_ENABLED =
  process.env.NEXT_PUBLIC_FEATURE_CHART_IMPORT === "1";

type ImportResult = {
  ok: boolean;
  imported?: { conditions: number; medications: number; allergies: number };
  memoryOps?: MemoryOp[];
  error?: string;
};

type Props = {
  patientId: string;
  onImported?: (ops: MemoryOp[]) => void;
};

export default function ConnectRecordsButton({ patientId, onImported }: Props) {
  const [open, setOpen] = useState(false);
  const [importing, setImporting] = useState(false);
  const [summary, setSummary] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  if (!CHART_IMPORT_ENABLED) return null; // flag off → render nothing

  function reset() {
    setSummary(null);
    setError(null);
    setImporting(false);
  }

  async function connect() {
    setImporting(true);
    setError(null);
    try {
      const res = await fetch("/api/import-records", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ patientId }),
      });
      const data = (await res.json()) as ImportResult;
      if (!res.ok || !data.ok || !data.imported) {
        throw new Error(data.error ?? `Import failed (${res.status})`);
      }
      const { conditions, medications, allergies } = data.imported;
      setSummary(
        `Imported ${conditions} condition${conditions === 1 ? "" : "s"}, ` +
          `${medications} medication${medications === 1 ? "" : "s"}, ` +
          `${allergies} allerg${allergies === 1 ? "y" : "ies"}.`,
      );
      onImported?.(data.memoryOps ?? []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not connect records.");
    } finally {
      setImporting(false);
    }
  }

  return (
    <>
      <button
        className="resetBtn"
        onClick={() => {
          reset();
          setOpen(true);
        }}
        title="Simulate connecting your health records (FHIR import)"
      >
        🔗 Connect records
      </button>

      {open && (
        <div
          className="modalOverlay"
          role="dialog"
          aria-modal="true"
          aria-label="Connect health records"
          onClick={() => setOpen(false)}
        >
          <div className="modalCard" onClick={(e) => e.stopPropagation()}>
            <p className="modalTitle">Connect health records</p>
            <p className="modalHint">
              <strong>MyChart · Demo Health</strong> (simulated — no real login).
              CarePilot will import your conditions, medications, and allergies
              into its memory and use them immediately.
            </p>

            {summary ? (
              <p className="importSummary" role="status">
                ✅ {summary} Ask about a symptom — CarePilot now knows your chart.
              </p>
            ) : error ? (
              <p className="importError" role="alert">
                ⚠️ {error}
              </p>
            ) : null}

            <div className="modalBtns">
              <button className="resetBtn" onClick={() => setOpen(false)}>
                {summary ? "Done" : "Cancel"}
              </button>
              {!summary && (
                <button className="sendBtn" onClick={connect} disabled={importing}>
                  {importing ? "Connecting…" : "Connect"}
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
