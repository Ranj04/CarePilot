"use client";

import { useState, useRef, useEffect } from "react";
import type { ChatResponse, MemoryOp } from "@/lib/contract";

interface Message {
  role: "user" | "assistant";
  content: string;
}

export default function Home() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [seeding, setSeeding] = useState(false);
  const [seeded, setSeeded] = useState(false);
  const [ops, setOps] = useState<MemoryOp[]>([]);
  const [patientId] = useState("maya");
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function seedMaya() {
    setSeeding(true);
    const res = await fetch("/api/seed", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ patientId }),
    });
    const data = (await res.json()) as { ok: boolean; nodeCount: number; error?: string };
    setSeeded(data.ok);
    setSeeding(false);
    setMessages((m) => [
      ...m,
      {
        role: "assistant",
        content: data.ok
          ? `Memory seeded: ${data.nodeCount} nodes written to HydraDB for ${patientId}. (propranolol, anxiety, dizziness, skipped breakfast, mood context)`
          : `Could not seed HydraDB yet: ${data.error ?? "unknown error"}`,
      },
    ]);
  }

  async function send() {
    const text = input.trim();
    if (!text || loading) return;
    setInput("");
    setMessages((m) => [...m, { role: "user", content: text }]);
    setLoading(true);

    const res = await fetch("/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ patientId, message: text }),
    });
    const data = (await res.json()) as ChatResponse;
    setMessages((m) => [...m, { role: "assistant", content: data.reply }]);
    setOps((prev) => [...data.memoryOps, ...prev].slice(0, 50));
    setLoading(false);
  }

  return (
    <div style={{ display: "flex", height: "100vh", fontFamily: "system-ui", fontSize: 14 }}>
      {/* Chat panel */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", borderRight: "1px solid #e5e7eb" }}>
        {/* Header */}
        <div style={{ padding: "16px 20px", borderBottom: "1px solid #e5e7eb", display: "flex", alignItems: "center", gap: 12 }}>
          <div>
            <div style={{ fontWeight: 700, fontSize: 16 }}>CarePilot</div>
            <div style={{ color: "#6b7280", fontSize: 12 }}>Patient: {patientId}</div>
          </div>
          <button
            onClick={seedMaya}
            disabled={seeding || seeded}
            style={{
              marginLeft: "auto",
              padding: "6px 14px",
              background: seeded ? "#d1fae5" : "#4f46e5",
              color: seeded ? "#065f46" : "#fff",
              border: "none",
              borderRadius: 6,
              cursor: seeded ? "default" : "pointer",
              fontSize: 13,
            }}
          >
            {seeding ? "Seeding…" : seeded ? "Memory seeded" : "Seed Maya"}
          </button>
        </div>

        {/* Messages */}
        <div style={{ flex: 1, overflowY: "auto", padding: "16px 20px", display: "flex", flexDirection: "column", gap: 12 }}>
          {messages.length === 0 && (
            <div style={{ color: "#9ca3af", textAlign: "center", marginTop: 60 }}>
              Seed Maya first, then start chatting. Try: &quot;I keep feeling dizzy&quot;
            </div>
          )}
          {messages.map((m, i) => (
            <div
              key={i}
              style={{
                alignSelf: m.role === "user" ? "flex-end" : "flex-start",
                maxWidth: "80%",
                background: m.role === "user" ? "#4f46e5" : "#f3f4f6",
                color: m.role === "user" ? "#fff" : "#111827",
                borderRadius: m.role === "user" ? "16px 16px 4px 16px" : "16px 16px 16px 4px",
                padding: "10px 14px",
                lineHeight: 1.5,
                whiteSpace: "pre-wrap",
              }}
            >
              {m.content}
            </div>
          ))}
          {loading && (
            <div style={{ alignSelf: "flex-start", color: "#9ca3af", fontStyle: "italic" }}>
              thinking…
            </div>
          )}
          <div ref={bottomRef} />
        </div>

        {/* Input */}
        <div style={{ padding: "12px 20px", borderTop: "1px solid #e5e7eb", display: "flex", gap: 8 }}>
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && send()}
            placeholder="Tell me how you're feeling…"
            style={{ flex: 1, padding: "10px 14px", borderRadius: 8, border: "1px solid #d1d5db", fontSize: 14, outline: "none" }}
          />
          <button
            onClick={send}
            disabled={loading || !input.trim()}
            style={{ padding: "10px 18px", background: "#4f46e5", color: "#fff", border: "none", borderRadius: 8, cursor: "pointer", fontWeight: 600 }}
          >
            Send
          </button>
        </div>

        {/* Disclaimer */}
        <div style={{ textAlign: "center", padding: "6px 20px 10px", color: "#9ca3af", fontSize: 11 }}>
          Not medical advice. Call 911 in an emergency.
        </div>
      </div>

      {/* Memory panel */}
      <div style={{ width: 320, display: "flex", flexDirection: "column", background: "#f9fafb" }}>
        <div style={{ padding: "16px 16px 10px", borderBottom: "1px solid #e5e7eb" }}>
          <div style={{ fontWeight: 700, fontSize: 13 }}>HydraDB Memory Ops</div>
          <div style={{ color: "#6b7280", fontSize: 11 }}>Live trace — autonomous tool calls</div>
        </div>
        <div style={{ flex: 1, overflowY: "auto", padding: 12, display: "flex", flexDirection: "column", gap: 8 }}>
          {ops.length === 0 && (
            <div style={{ color: "#9ca3af", fontSize: 12, textAlign: "center", marginTop: 40 }}>
              Memory ops will appear here after you chat.
            </div>
          )}
          {ops.map((op, i) => (
            <div
              key={i}
              style={{
                background: "#fff",
                borderRadius: 8,
                padding: "8px 10px",
                border: "1px solid #e5e7eb",
                fontSize: 12,
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                <span
                  style={{
                    fontWeight: 700,
                    color: op.op === "recall" ? "#7c3aed" : op.op === "traverse" ? "#0891b2" : "#059669",
                    textTransform: "uppercase",
                    fontSize: 10,
                  }}
                >
                  {op.op}
                </span>
                <span style={{ color: "#9ca3af" }}>{op.ms}ms</span>
              </div>
              <div style={{ fontWeight: 600, color: "#374151", marginBottom: 2 }}>{op.label}</div>
              <div style={{ color: "#6b7280", fontSize: 11, lineHeight: 1.4 }}>{op.detail}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
