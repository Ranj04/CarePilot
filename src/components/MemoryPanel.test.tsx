import { afterEach, describe, expect, it } from "vitest";
import { cleanup, render, screen, within } from "@testing-library/react";
import MemoryPanel from "./MemoryPanel";
import type { MemoryOp } from "@/lib/contract";

afterEach(cleanup);

const threeOps: MemoryOp[] = [
  { op: "recall", label: "recall: dry cough", detail: "matched 2 nodes", ms: 14, ts: "t1" },
  { op: "traverse", label: "traverse: lisinopril", detail: "MAY_CAUSE -> dry cough", ms: 9, ts: "t2" },
  { op: "write", label: "write: symptom", detail: "persisted Symptom node", ms: 7, ts: "t3" },
];

describe("MemoryPanel (B1)", () => {
  it("renders one row per op with the correct icon + label", () => {
    render(<MemoryPanel ops={threeOps} />);

    const rows = screen.getAllByRole("listitem");
    expect(rows).toHaveLength(3);

    // each row carries an op-typed icon (accessible name = op type)
    expect(screen.getAllByRole("img").map((el) => el.getAttribute("aria-label")))
      .toEqual(["recall", "traverse", "write"]);

    // kind tags + human labels render
    expect(within(rows[0]).getByText("RECALL")).toBeInTheDocument();
    expect(within(rows[0]).getByText("recall: dry cough")).toBeInTheDocument();
    expect(within(rows[1]).getByText("TRAVERSE")).toBeInTheDocument();
    expect(within(rows[2]).getByText("WRITE")).toBeInTheDocument();

    // durations are surfaced
    expect(screen.getByText("14ms")).toBeInTheDocument();
    expect(screen.getByText("9ms")).toBeInTheDocument();

    // count badge reflects total
    expect(screen.getByText("3 ops")).toBeInTheDocument();
  });

  it("shows a tidy empty state with no ops", () => {
    render(<MemoryPanel ops={[]} />);
    expect(screen.queryByRole("listitem")).not.toBeInTheDocument();
    expect(screen.getByText(/appear here as you chat/i)).toBeInTheDocument();
    expect(screen.getByText("0 ops")).toBeInTheDocument();
  });

  it("keeps full detail in title while clamping long text (no layout break)", () => {
    const long = "x".repeat(400);
    render(
      <MemoryPanel
        ops={[{ op: "recall", label: "recall: big", detail: long, ms: 3, ts: "t" }]}
      />
    );
    const detail = screen.getByText(long);
    // full text preserved as the hover title; CSS line-clamp handles the visual truncation
    expect(detail).toHaveAttribute("title", long);
    expect(detail).toHaveClass("opDetail");
  });
});
