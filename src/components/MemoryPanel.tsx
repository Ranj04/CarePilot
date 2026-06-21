"use client";

import type { MemoryOp } from "@/lib/contract";

type MemoryPanelProps = {
  ops: MemoryOp[];
};

// One visual identity per op type so the panel reads at a glance / across a room.
const OP_META: Record<
  MemoryOp["op"],
  { label: string; color: string; icon: React.ReactNode }
> = {
  recall: {
    label: "RECALL",
    color: "var(--pine)",
    icon: (
      <svg viewBox="0 0 16 16" width="15" height="15" aria-hidden="true">
        <circle cx="8" cy="8" r="1.6" fill="currentColor" />
        <circle
          cx="8"
          cy="8"
          r="4.4"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.3"
        />
        <circle
          cx="8"
          cy="8"
          r="7"
          fill="none"
          stroke="currentColor"
          strokeWidth="1"
          opacity="0.5"
        />
      </svg>
    ),
  },
  traverse: {
    label: "TRAVERSE",
    color: "var(--amber)",
    icon: (
      <svg viewBox="0 0 16 16" width="15" height="15" aria-hidden="true">
        <line x1="4" y1="4" x2="11" y2="12" stroke="currentColor" strokeWidth="1.3" />
        <circle cx="4" cy="4" r="2.2" fill="currentColor" />
        <circle cx="12" cy="12" r="2.2" fill="currentColor" />
      </svg>
    ),
  },
  write: {
    label: "WRITE",
    color: "var(--coral)",
    icon: (
      <svg viewBox="0 0 16 16" width="15" height="15" aria-hidden="true">
        <path
          d="M9.5 2.5l4 4-7 7H2.5v-4l7-7z"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.3"
          strokeLinejoin="round"
        />
      </svg>
    ),
  },
};

export default function MemoryPanel({ ops }: MemoryPanelProps) {
  return (
    <aside className="memory" aria-label="Memory activity">
      <div className="memoryHead">
        <span className="memoryTitle">Memory</span>
        <span className="memoryCount">{ops.length} ops</span>
      </div>

      {ops.length === 0 ? (
        <div className="memoryEmpty">
          <span className="memoryEmptyGlyph" aria-hidden="true">
            ⟲
          </span>
          <p>HydraDB reads &amp; writes appear here as you chat.</p>
        </div>
      ) : (
        <ul className="opList">
          {ops.map((op, i) => {
            const meta = OP_META[op.op];
            return (
              <li className="opRow" key={i}>
                <span
                  className="opIcon"
                  role="img"
                  aria-label={op.op}
                  style={{ color: meta.color }}
                >
                  {meta.icon}
                </span>
                <div className="opBody">
                  <div className="opTop">
                    <span className="opKind" style={{ color: meta.color }}>
                      {meta.label}
                    </span>
                    <span className="opLabel">{op.label}</span>
                    <span className="opMs">{op.ms}ms</span>
                  </div>
                  <p className="opDetail" title={op.detail}>
                    {op.detail}
                  </p>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </aside>
  );
}
