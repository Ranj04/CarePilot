import type OpenAI from "openai";
import { contextRecall, relate, capture } from "./memory";
import type { MemoryEvent } from "./types";

export const TOOL_SCHEMAS: OpenAI.Chat.ChatCompletionTool[] = [
  {
    type: "function",
    function: {
      name: "recall_context",
      description:
        "Semantically search the patient's memory graph for relevant facts (medications, symptoms, conditions, mood). Call this first whenever the patient mentions a health topic.",
      parameters: {
        type: "object",
        properties: {
          query: { type: "string", description: "What to search for, e.g. 'dry cough' or 'blood pressure medications'" },
          kinds: {
            type: "array",
            items: { type: "string", enum: ["Patient", "Symptom", "Condition", "Medication", "MoodEntry", "Session"] },
            description: "Optional: filter to specific node types",
          },
        },
        required: ["query"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "find_related",
      description:
        "Traverse the graph from a recalled memory to find relationships (e.g. what conditions a medication may cause). Use the memoryId returned by recall_context.",
      parameters: {
        type: "object",
        properties: {
          memoryId: { type: "string", description: "The memoryId of a node returned by recall_context" },
          rel: { type: "string", description: "Optional relationship filter, e.g. MAY_CAUSE, TREATS, TAKES" },
        },
        required: ["memoryId"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "remember",
      description:
        "Persist new facts to the patient's memory graph (new symptoms, medications, mood, or other health events mentioned in this conversation).",
      parameters: {
        type: "object",
        properties: {
          events: {
            type: "array",
            items: {
              type: "object",
              properties: {
                kind: { type: "string", enum: ["Symptom", "Condition", "Medication", "MoodEntry", "Session"] },
                label: { type: "string", description: "Short label, e.g. 'chest tightness'" },
                text: { type: "string", description: "Full descriptive text to store in memory" },
                relations: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      rel: { type: "string" },
                      toLabel: { type: "string" },
                    },
                    required: ["rel", "toLabel"],
                  },
                },
              },
              required: ["kind", "label", "text"],
            },
          },
        },
        required: ["events"],
      },
    },
  },
];

export async function dispatchTool(
  name: string,
  args: Record<string, unknown>,
  patientId: string,
): Promise<string> {
  if (name === "recall_context") {
    const chunks = await contextRecall(
      args.query as string,
      patientId,
      args.kinds as string[] | undefined,
    );
    if (chunks.length === 0) return "No relevant memory found.";
    return chunks
      .map((c) => `[${c.kind || "memory"} | id:${c.memoryId}] ${c.content}`)
      .join("\n---\n");
  }

  if (name === "find_related") {
    const relations = await relate(
      args.memoryId as string,
      patientId,
      args.rel as string | undefined,
    );
    if (relations.length === 0) return "No graph relations found for this memory.";
    return relations.map((r) => `${r.subject} --[${r.predicate}]--> ${r.object}`).join("\n");
  }

  if (name === "remember") {
    const events = args.events as MemoryEvent[];
    const ids = await capture(events, patientId);
    return `Stored ${ids.length} memory node(s).`;
  }

  return `Unknown tool: ${name}`;
}
