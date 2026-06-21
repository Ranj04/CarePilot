import OpenAI from "openai";

let _client: OpenAI | null = null;

export function getClient(): OpenAI {
  if (!_client) {
    _client = new OpenAI({
      baseURL: process.env.NEBIUS_BASE_URL ?? "https://api.tokenfactory.nebius.com/v1/",
      apiKey: process.env.NEBIUS_API_KEY ?? "",
    });
  }
  return _client;
}

export const MODEL = process.env.NEBIUS_CHAT_MODEL ?? "meta-llama/Llama-3.3-70B-Instruct";
