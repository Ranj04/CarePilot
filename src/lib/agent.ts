import type OpenAI from "openai";
import { getClient, MODEL } from "./nebius";
import { TOOL_SCHEMAS, dispatchTool } from "./tools";
import { drainOps } from "./trace";
import type { MemoryOp } from "./contract";

const SYSTEM_PROMPT = `You are CarePilot, a personal health companion with memory.
You have access to the patient's health history stored in a memory graph. Use your tools proactively:
- Call recall_context whenever the patient mentions a symptom, medication, or health concern.
- Call find_related to traverse relationships (e.g. what a medication may cause).
- Call remember to store any new health facts the patient shares.
Be warm, concise, and clinically helpful. Surface connections between memory and current symptoms.
Never diagnose. Always recommend consulting a doctor for medical decisions.
Important: Not medical advice. Call 911 in an emergency.`;

export async function runAgent(
  message: string,
  patientId: string,
): Promise<{ reply: string; memoryOps: MemoryOp[] }> {
  const client = getClient();
  drainOps(); // clear buffer for this turn

  const messages: OpenAI.Chat.ChatCompletionMessageParam[] = [
    { role: "system", content: SYSTEM_PROMPT },
    { role: "user", content: message },
  ];

  let rounds = 0;
  const MAX_ROUNDS = 4;

  while (rounds < MAX_ROUNDS) {
    const response = await client.chat.completions.create({
      model: MODEL,
      messages,
      tools: TOOL_SCHEMAS,
      tool_choice: "auto",
    });

    const choice = response.choices[0];
    const assistantMsg = choice.message;
    messages.push(assistantMsg);

    if (choice.finish_reason !== "tool_calls" || !assistantMsg.tool_calls?.length) {
      return {
        reply: assistantMsg.content ?? "(no reply)",
        memoryOps: drainOps(),
      };
    }

    // Dispatch all tool calls in this round
    const toolResults: OpenAI.Chat.ChatCompletionToolMessageParam[] = await Promise.all(
      assistantMsg.tool_calls.map(async (tc) => {
        const args = JSON.parse(tc.function.arguments) as Record<string, unknown>;
        const result = await dispatchTool(tc.function.name, args, patientId);
        return { role: "tool" as const, tool_call_id: tc.id, content: result };
      }),
    );

    messages.push(...toolResults);
    rounds++;
  }

  // Forced final response after max rounds
  const final = await client.chat.completions.create({
    model: MODEL,
    messages,
  });

  return {
    reply: final.choices[0].message.content ?? "(no reply)",
    memoryOps: drainOps(),
  };
}
