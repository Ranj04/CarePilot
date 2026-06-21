import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import Chat from "./Chat";
import type { ChatResponse } from "@/lib/contract";

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

function mockFetchOnce(body: ChatResponse, ok = true, status = 200) {
  return vi.spyOn(global, "fetch").mockResolvedValue({
    ok,
    status,
    json: async () => body,
  } as Response);
}

const okResponse: ChatResponse = {
  reply: "Thanks — noted.",
  memoryOps: [
    { op: "recall", label: "recall: cough", detail: "found 1", ms: 5, ts: "t" },
  ],
};

describe("Chat (B0)", () => {
  it("renders the empty state before any messages", () => {
    render(<Chat patientId="maya" />);
    expect(screen.getByText(/dry cough/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /send/i })).toBeDisabled();
  });

  it("happy path: sends a message and renders the user message + reply", async () => {
    const fetchSpy = mockFetchOnce(okResponse);
    const user = userEvent.setup();
    render(<Chat patientId="maya" />);

    await user.type(screen.getByLabelText("Message"), "I have a dry cough");
    await user.click(screen.getByRole("button", { name: /send/i }));

    expect(await screen.findByText("I have a dry cough")).toBeInTheDocument();
    expect(await screen.findByText("Thanks — noted.")).toBeInTheDocument();

    // posted the contract-shaped request to /api/chat
    const [url, init] = fetchSpy.mock.calls[0];
    expect(url).toBe("/api/chat");
    expect(JSON.parse((init as RequestInit).body as string)).toEqual({
      patientId: "maya",
      message: "I have a dry cough",
    });
  });

  it("forwards memoryOps to the onMemoryOps callback (B1 wiring)", async () => {
    mockFetchOnce(okResponse);
    const onMemoryOps = vi.fn();
    const user = userEvent.setup();
    render(<Chat patientId="maya" onMemoryOps={onMemoryOps} />);

    await user.type(screen.getByLabelText("Message"), "hi");
    await user.click(screen.getByRole("button", { name: /send/i }));

    await waitFor(() =>
      expect(onMemoryOps).toHaveBeenCalledWith(okResponse.memoryOps)
    );
  });

  it("blocks empty / whitespace-only input (no fetch fired)", async () => {
    const fetchSpy = vi.spyOn(global, "fetch");
    const user = userEvent.setup();
    render(<Chat patientId="maya" />);

    // button stays disabled with no input
    expect(screen.getByRole("button", { name: /send/i })).toBeDisabled();

    // whitespace then Enter does nothing
    await user.type(screen.getByLabelText("Message"), "   {Enter}");
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("error state: a 500 response shows an error bubble, not a crash", async () => {
    mockFetchOnce({ reply: "", memoryOps: [] }, false, 500);
    const user = userEvent.setup();
    render(<Chat patientId="cold" />);

    await user.type(screen.getByLabelText("Message"), "hello");
    await user.click(screen.getByRole("button", { name: /send/i }));

    expect(await screen.findByText(/something went wrong/i)).toBeInTheDocument();
    // user message still rendered; app is interactive again
    expect(screen.getByText("hello")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /send/i })).toBeInTheDocument();
  });
});
