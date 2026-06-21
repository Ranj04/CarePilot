import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import VoiceButton from "./VoiceButton";

afterEach(cleanup);

describe("VoiceButton (B2)", () => {
  it("degrades gracefully when the Speech API is unavailable", async () => {
    // jsdom has no SpeechRecognition — same path as an unsupported browser.
    const onTranscript = vi.fn();
    const user = userEvent.setup();
    render(<VoiceButton onTranscript={onTranscript} />);

    const btn = screen.getByRole("button", { name: /not supported/i });
    expect(btn).toBeDisabled();

    // clicking a disabled/unsupported mic never fires a transcript or throws
    await user.click(btn);
    expect(onTranscript).not.toHaveBeenCalled();
  });

  it("respects the disabled prop", () => {
    render(<VoiceButton onTranscript={vi.fn()} disabled />);
    expect(screen.getByRole("button")).toBeDisabled();
  });
});
