"use client";

import { useRef, useState } from "react";
import type { ChatRequest, ChatResponse, MemoryOp } from "@/lib/contract";

export type ChatMessage = {
  role: "user" | "assistant";
  text: string;
  isError?: boolean;
};

type ChatProps = {
  patientId: string;
  // B1 wiring: hand each turn's memory ops up to the MemoryPanel.
  onMemoryOps?: (ops: MemoryOp[]) => void;
};

export default function Chat({ patientId, onMemoryOps }: ChatProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const threadRef = useRef<HTMLDivElement>(null);

  function scrollToBottom() {
    requestAnimationFrame(() => {
      const el = threadRef.current;
      if (el) el.scrollTop = el.scrollHeight;
    });
  }

  async function send() {
    const text = input.trim();
    if (!text || sending) return; // empty input is blocked

    setMessages((m) => [...m, { role: "user", text }]);
    setInput("");
    setSending(true);
    scrollToBottom();

    try {
      const payload: ChatRequest = { patientId, message: text };
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error(`API ${res.status}`);

      const data = (await res.json()) as ChatResponse;
      setMessages((m) => [...m, { role: "assistant", text: data.reply }]);
      onMemoryOps?.(data.memoryOps ?? []);
    } catch {
      setMessages((m) => [
        ...m,
        {
          role: "assistant",
          text: "Something went wrong reaching CarePilot. Please try again.",
          isError: true,
        },
      ]);
    } finally {
      setSending(false);
      scrollToBottom();
    }
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      send();
    }
  }

  return (
    <div className="chat">
      <div className="thread" ref={threadRef} role="log" aria-live="polite">
        {messages.length === 0 ? (
          <div className="emptyState">
            <div className="glyph" aria-hidden="true">
              ❝
            </div>
            <p>
              Tell CarePilot how you&apos;re feeling — e.g. &ldquo;I&apos;ve got
              a dry cough.&rdquo;
            </p>
          </div>
        ) : (
          messages.map((m, i) => (
            <div key={i} className={`row ${m.role}`}>
              <div
                className={[
                  "bubble",
                  m.role === "user" ? "fromUser" : "fromAssistant",
                  m.isError ? "isError" : "",
                ]
                  .join(" ")
                  .trim()}
              >
                {m.text}
              </div>
            </div>
          ))
        )}
      </div>

      <div className="composer">
        <input
          className="field"
          aria-label="Message"
          placeholder="Type a message…"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={onKeyDown}
          disabled={sending}
        />
        <button
          className="sendBtn"
          onClick={send}
          disabled={sending || input.trim() === ""}
        >
          {sending ? "…" : "Send"}
        </button>
      </div>
    </div>
  );
}
