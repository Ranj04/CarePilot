"use client";

import { useRef, useState } from "react";
import type { ChatRequest, ChatResponse, MemoryOp } from "@/lib/contract";
import VoiceButton from "@/components/VoiceButton";

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

// Speak text via the browser's speech synthesis. Never throws — a voice
// failure must never block the text chat.
function speak(text: string) {
  try {
    const synth = typeof window !== "undefined" ? window.speechSynthesis : undefined;
    if (!synth) return;
    synth.cancel();
    synth.speak(new SpeechSynthesisUtterance(text));
  } catch {
    /* voice is best-effort */
  }
}

export default function Chat({ patientId, onMemoryOps }: ChatProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [voiceOn, setVoiceOn] = useState(false);
  const [voiceMsg, setVoiceMsg] = useState<string | null>(null);
  const threadRef = useRef<HTMLDivElement>(null);

  function scrollToBottom() {
    requestAnimationFrame(() => {
      const el = threadRef.current;
      if (el) el.scrollTop = el.scrollHeight;
    });
  }

  // textArg lets voice dictation send hands-free without waiting on input state.
  async function send(textArg?: string) {
    const text = (textArg ?? input).trim();
    if (!text || sending) return; // empty input is blocked

    setMessages((m) => [...m, { role: "user", text }]);
    setInput("");
    setSending(true);
    scrollToBottom();

    try {
      // Send prior turns (excluding error bubbles) so the agent has context.
      const history = messages
        .filter((m) => !m.isError)
        .map((m) => ({ role: m.role, content: m.text }));
      const payload: ChatRequest = { patientId, message: text, history };
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error(`API ${res.status}`);

      const data = (await res.json()) as ChatResponse;
      setMessages((m) => [...m, { role: "assistant", text: data.reply }]);
      onMemoryOps?.(data.memoryOps ?? []);
      if (voiceOn) speak(data.reply);
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

  function toggleVoice() {
    setVoiceOn((on) => {
      const next = !on;
      if (!next && typeof window !== "undefined") window.speechSynthesis?.cancel();
      return next;
    });
    setVoiceMsg(null);
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
        {sending && (
          <div className="row assistant">
            <div
              className="bubble fromAssistant thinking"
              role="status"
              aria-label="CarePilot is thinking"
            >
              <span className="dot" />
              <span className="dot" />
              <span className="dot" />
            </div>
          </div>
        )}
      </div>

      <div className="composer">
        <button
          type="button"
          className={`voiceToggle${voiceOn ? " on" : ""}`}
          onClick={toggleVoice}
          aria-pressed={voiceOn}
          aria-label={voiceOn ? "Disable voice" : "Enable voice"}
          title={voiceOn ? "Voice on — replies are spoken; mic enabled" : "Enable voice"}
        >
          <svg viewBox="0 0 16 16" width="16" height="16" aria-hidden="true">
            <path
              d="M3 6.2v3.6h2.2L8.5 12V4L5.2 6.2H3z"
              fill="currentColor"
            />
            {voiceOn ? (
              <path
                d="M10.6 5.4a3 3 0 0 1 0 5.2M12.2 3.8a5 5 0 0 1 0 8.4"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.2"
                strokeLinecap="round"
              />
            ) : (
              <line
                x1="10.5"
                y1="5.5"
                x2="13.5"
                y2="10.5"
                stroke="currentColor"
                strokeWidth="1.3"
                strokeLinecap="round"
              />
            )}
          </svg>
        </button>

        {voiceOn && (
          <VoiceButton
            onTranscript={(t) => {
              setVoiceMsg(null);
              send(t);
            }}
            onError={(msg) => setVoiceMsg(msg)}
            disabled={sending}
          />
        )}

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
          onClick={() => send()}
          disabled={sending || input.trim() === ""}
        >
          {sending ? "…" : "Send"}
        </button>
      </div>

      {voiceMsg && (
        <p className="voiceMsg" role="status">
          {voiceMsg}
        </p>
      )}
    </div>
  );
}
