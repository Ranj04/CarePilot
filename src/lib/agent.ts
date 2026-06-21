import type OpenAI from "openai";
import { getClient, MODEL } from "./nebius";
import { TOOL_SCHEMAS, dispatchTool } from "./tools";
import { drainOps } from "./trace";
import type { MemoryOp } from "./contract";

const SYSTEM_PROMPT = `You are CarePilot, a warm and concise personal health companion with persistent memory.

RULES — follow in order every turn:
1. ALWAYS call recall_context first when the patient mentions any symptom, medication, mood, or health concern.
2. If recall returns memory chunks, call find_related on the most relevant memoryId to check for causal links.
3. Call remember to store any new symptom, medication, or mood the patient shares.
4. In your reply, EXPLICITLY name any medications, conditions, or past events found in memory that connect to what the patient said. Do not give a generic answer if memory was found.

Example of a GOOD reply when memory is found:
"You mentioned dizziness — I can see in your history that you take propranolol 20mg for anxiety, which is known to cause dizziness. This could be connected. Worth flagging to your doctor."

Example of a BAD reply (do NOT do this even when memory was found):
"Dizziness can have many causes. Please see a doctor."

Never diagnose. Always recommend a doctor for medical decisions.
Not medical advice. Call 911 in an emergency.`;

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
