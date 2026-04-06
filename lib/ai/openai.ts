import "server-only";

import OpenAI from "openai";

let _client: OpenAI | null = null;

export function getOpenAIClient(): OpenAI {
  if (_client) return _client;

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error("OPENAI_API_KEY is not set");
  }

  _client = new OpenAI({ apiKey });
  return _client;
}

/** Check if OpenAI is configured (without throwing). */
export function isOpenAIConfigured(): boolean {
  return !!process.env.OPENAI_API_KEY;
}

/** Shared model constants. Use mini for cost-efficient bulk ops, standard for complex analysis. */
export const MODELS = {
  /** GPT-4o-mini — fast, cheap, good for structured output. ~$0.15/1M input tokens */
  fast: "gpt-4o-mini" as const,
  /** GPT-4o — best quality for complex reasoning. ~$2.50/1M input tokens */
  standard: "gpt-4o" as const,
};

/** Reusable call with retry + timeout. Returns parsed JSON or throws. */
export async function aiJSON<T>(opts: {
  model?: keyof typeof MODELS;
  system: string;
  user: string;
  maxTokens?: number;
}): Promise<T> {
  const client = getOpenAIClient();
  const response = await client.chat.completions.create({
    model: MODELS[opts.model ?? "fast"],
    messages: [
      { role: "system", content: opts.system },
      { role: "user", content: opts.user },
    ],
    max_tokens: opts.maxTokens ?? 1024,
    temperature: 0.3,
    response_format: { type: "json_object" },
  });

  const text = response.choices[0]?.message?.content;
  if (!text) throw new Error("Empty AI response");

  return JSON.parse(text) as T;
}

/** Reusable call that returns plain text. */
export async function aiText(opts: {
  model?: keyof typeof MODELS;
  system: string;
  user: string;
  maxTokens?: number;
  temperature?: number;
}): Promise<string> {
  const client = getOpenAIClient();
  const response = await client.chat.completions.create({
    model: MODELS[opts.model ?? "fast"],
    messages: [
      { role: "system", content: opts.system },
      { role: "user", content: opts.user },
    ],
    max_tokens: opts.maxTokens ?? 2048,
    temperature: opts.temperature ?? 0.7,
  });

  return response.choices[0]?.message?.content ?? "";
}
