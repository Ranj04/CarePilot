"use client";

import { useRef, useState } from "react";

// Minimal Web Speech API typings (webkit-prefixed APIs aren't in lib.dom).
type SpeechResultAlt = { transcript: string };
type SpeechRecognitionEventLike = {
  results: ArrayLike<ArrayLike<SpeechResultAlt>>;
};
type SpeechRecognitionErrorLike = { error?: string };
type SpeechRecognitionLike = {
  lang: string;
  interimResults: boolean;
  continuous: boolean;
  start: () => void;
  stop: () => void;
  onresult: ((e: SpeechRecognitionEventLike) => void) | null;
  onerror: ((e: SpeechRecognitionErrorLike) => void) | null;
  onend: (() => void) | null;
};

function getRecognitionCtor(): (new () => SpeechRecognitionLike) | null {
  if (typeof window === "undefined") return null;
  const w = window as unknown as {
    SpeechRecognition?: new () => SpeechRecognitionLike;
    webkitSpeechRecognition?: new () => SpeechRecognitionLike;
  };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

type VoiceButtonProps = {
  onTranscript: (text: string) => void;
  onError?: (message: string) => void;
  disabled?: boolean;
};

export default function VoiceButton({
  onTranscript,
  onError,
  disabled,
}: VoiceButtonProps) {
  const [listening, setListening] = useState(false);
  const recRef = useRef<SpeechRecognitionLike | null>(null);
  const Ctor = getRecognitionCtor();
  const supported = Ctor !== null;

  function toggle() {
    if (!supported || disabled) return;
    if (listening) {
      recRef.current?.stop();
      return;
    }
    try {
      const rec = new Ctor!();
      rec.lang = "en-US";
      rec.interimResults = false;
      rec.continuous = false;
      rec.onresult = (e) => {
        const text = e.results?.[0]?.[0]?.transcript ?? "";
        if (text) onTranscript(text);
      };
      rec.onerror = (e) => {
        const code = e.error ?? "unknown";
        const blocked = code === "not-allowed" || code === "service-not-allowed";
        onError?.(
          blocked
            ? "Microphone blocked — you can still type."
            : `Voice input unavailable (${code}) — you can still type.`,
        );
        setListening(false);
      };
      rec.onend = () => setListening(false);
      recRef.current = rec;
      rec.start();
      setListening(true);
    } catch {
      onError?.("Couldn't start voice input — you can still type.");
      setListening(false);
    }
  }

  return (
    <button
      type="button"
      className={`micBtn${listening ? " listening" : ""}`}
      onClick={toggle}
      disabled={!supported || disabled}
      aria-pressed={listening}
      aria-label={
        !supported
          ? "Voice input not supported"
          : listening
            ? "Stop dictation"
            : "Start dictation"
      }
      title={
        supported ? "Dictate a message" : "Voice not supported in this browser"
      }
    >
      <svg viewBox="0 0 16 16" width="16" height="16" aria-hidden="true">
        <rect x="6" y="2" width="4" height="8" rx="2" fill="currentColor" />
        <path
          d="M4 8a4 4 0 0 0 8 0"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.3"
          strokeLinecap="round"
        />
        <line
          x1="8"
          y1="12"
          x2="8"
          y2="14.5"
          stroke="currentColor"
          strokeWidth="1.3"
          strokeLinecap="round"
        />
      </svg>
    </button>
  );
}
