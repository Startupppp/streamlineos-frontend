import "server-only";

import { ChatOpenAI } from "@langchain/openai";
import type { z } from "zod";

/**
 * Centralized LangChain client for all AI features.
 *
 * Why LangChain?
 *   - Provider-agnostic (swap models with one line)
 *   - Native Zod schema support via .withStructuredOutput()
 *   - Built-in retries, timeouts, structured output guarantees
 *   - Composable chains for complex workflows
 *   - Same TypeScript types end-to-end
 */

let _fastModel: ChatOpenAI | null = null;
let _standardModel: ChatOpenAI | null = null;

/** Check if OpenAI is configured (without throwing). */
export function isOpenAIConfigured(): boolean {
  return !!process.env.OPENAI_API_KEY;
}

function getFastModel(): ChatOpenAI {
  if (_fastModel) return _fastModel;
  if (!process.env.OPENAI_API_KEY) {
    throw new Error("OPENAI_API_KEY is not set");
  }
  _fastModel = new ChatOpenAI({
    apiKey: process.env.OPENAI_API_KEY,
    model: "gpt-4o-mini",
    temperature: 0.3,
    timeout: 30000,
    maxRetries: 2,
  });
  return _fastModel;
}

function getStandardModel(): ChatOpenAI {
  if (_standardModel) return _standardModel;
  if (!process.env.OPENAI_API_KEY) {
    throw new Error("OPENAI_API_KEY is not set");
  }
  _standardModel = new ChatOpenAI({
    apiKey: process.env.OPENAI_API_KEY,
    model: "gpt-4o",
    temperature: 0.3,
    timeout: 60000,
    maxRetries: 2,
  });
  return _standardModel;
}

type ModelTier = "fast" | "standard";

/**
 * Invoke an AI model with a Zod schema and get a typed, validated response.
 *
 * This is the SINGLE entry point for all AI calls in this codebase.
 * Built on LangChain's `withStructuredOutput()` which uses OpenAI's native
 * structured outputs feature for guaranteed schema-compliant JSON.
 *
 * @example
 *   const result = await aiInvoke({
 *     model: "fast",
 *     schema: LeadScoreSchema,
 *     schemaName: "lead_score",
 *     system: "You are a sales analyst.",
 *     user: "Score this lead: ...",
 *   });
 *   // result is fully typed via z.infer<typeof LeadScoreSchema>
 */
export async function aiInvoke<T extends z.ZodTypeAny>(opts: {
  model?: ModelTier;
  schema: T;
  /** Short, lowercase, snake_case name. Required by structured outputs. */
  schemaName: string;
  system: string;
  user: string;
}): Promise<z.infer<T>> {
  const model = opts.model === "standard" ? getStandardModel() : getFastModel();

  const structured = model.withStructuredOutput(opts.schema, {
    name: opts.schemaName,
    method: "jsonSchema",
    strict: true,
  });

  const result = await structured.invoke([
    { role: "system", content: opts.system },
    { role: "user", content: opts.user },
  ]);

  return result as z.infer<T>;
}

/**
 * Invoke an AI model with a plain text response.
 * Use only for free-form output where schema validation is not needed.
 */
export async function aiText(opts: {
  model?: ModelTier;
  system: string;
  user: string;
  temperature?: number;
}): Promise<string> {
  const baseModel = opts.model === "standard" ? getStandardModel() : getFastModel();

  // Override temperature if explicitly provided
  const model = opts.temperature !== undefined
    ? new ChatOpenAI({
        apiKey: process.env.OPENAI_API_KEY,
        model: opts.model === "standard" ? "gpt-4o" : "gpt-4o-mini",
        temperature: opts.temperature,
        timeout: 30000,
        maxRetries: 2,
      })
    : baseModel;

  const result = await model.invoke([
    { role: "system", content: opts.system },
    { role: "user", content: opts.user },
  ]);

  return typeof result.content === "string" ? result.content : JSON.stringify(result.content);
}

/* ─── Backward compatibility shim ─────────────────────────────────────────── */

/** @deprecated Use aiInvoke() with a Zod schema instead. */
export async function aiJSON<T>(opts: {
  model?: ModelTier;
  system: string;
  user: string;
  maxTokens?: number;
}): Promise<T> {
  const baseModel = opts.model === "standard" ? getStandardModel() : getFastModel();
  const result = await baseModel.invoke(
    [
      { role: "system", content: `${opts.system}\n\nRespond with valid JSON only.` },
      { role: "user", content: opts.user },
    ],
  );
  const text = typeof result.content === "string" ? result.content : "";
  // Strip markdown fences if present
  const cleaned = text.replace(/^```json\s*/i, "").replace(/```\s*$/i, "").trim();
  return JSON.parse(cleaned) as T;
}
