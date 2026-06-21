import type OpenAI from "openai";
import { getClient, MODEL } from "./nebius";
import { TOOL_SCHEMAS, dispatchTool } from "./tools";
import { drainOps } from "./trace";
import type { ChatTurn, MemoryOp } from "./contract";

const SYSTEM_PROMPT = `You are CarePilot, a warm and concise personal health companion with persistent memory.

RULES — follow in order every turn:
1. ALWAYS call recall_context first when the patient mentions any symptom, medication, mood, or health concern.
2. If recall returns memory chunks, call find_related on the most relevant memoryId to check for causal links.
3. Call remember to store any new symptom, medication, or mood the patient shares.
4. When you surface a NEW connection from memory, EXPLICITLY name the medications, conditions, or past events involved. Do not give a generic answer if relevant memory was found.

CONVERSATION FLOW — this is a continuing chat, not a series of one-shots:
- Read the prior turns. Answer the patient's ACTUAL latest message; do not repeat a connection you already explained.
- If you already told them lisinopril may cause their cough and they now ask "what should I do?", give concrete next steps (e.g. don't stop the med on your own, log when it started, book a call with their prescriber, watch for red-flag symptoms) — do NOT restate the side-effect line verbatim.
- Vary your wording and build on what was already said so the conversation feels human.

Example of a GOOD first reply when memory is found:
"You mentioned dizziness — I can see in your history that you take propranolol 20mg for anxiety, which is known to cause dizziness. This could be connected. Worth flagging to your doctor."

Example of a GOOD follow-up to "what should I do?":
"A few practical steps: keep taking it for now rather than stopping abruptly, jot down when the cough started and how often it hits, and call your prescriber to ask whether to switch — an ACE-inhibitor cough is common and they may move you to a different med. If you get short of breath or swelling, treat that as urgent."

Never diagnose. Always recommend a doctor for medical decisions.
Not medical advice. Call 911 in an emergency.`;

export async function runAgent(
  message: string,
  patientId: string,
  history: ChatTurn[] = [],
): Promise<{ reply: string; memoryOps: MemoryOp[] }> {
  const client = getClient();
  drainOps(); // clear buffer for this turn

  const messages: OpenAI.Chat.ChatCompletionMessageParam[] = [
    { role: "system", content: SYSTEM_PROMPT },
    ...history.map((t) => ({ role: t.role, content: t.content })),
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
      max_tokens: 512,
      temperature: 0.6,
      top_p: 0.9,
      // @ts-expect-error Nebius-specific sampling param passed through extra body
      top_k: 50,
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
    max_tokens: 512,
    temperature: 0.6,
    top_p: 0.9,
    // @ts-expect-error Nebius-specific sampling param passed through extra body
    top_k: 50,
  });

  return {
    reply: final.choices[0].message.content ?? "(no reply)",
    memoryOps: drainOps(),
  };
}
