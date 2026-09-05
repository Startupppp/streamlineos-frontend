"use client";

import type { z } from "zod";
import { ApiError, authedFetch, buildUrl } from "@/lib/api-client";
import { AI_STREAM_TIMEOUT_MS, readAiStreamError } from "./ai-text-stream";
import { aiResultFrameSchema } from "./ai-result-stream-schema";

export interface AiResultStreamOptions {
  signal?: AbortSignal;
  onToken?: (token: string) => void;
}

interface AiResultStreamRequest<T extends object> extends AiResultStreamOptions {
  path: string;
  body?: unknown;
  headers?: Record<string, string>;
  schema: z.ZodType<T>;
}

function assertNotAborted(signal?: AbortSignal): void {
  if (signal?.aborted) throw new DOMException("Generation stopped", "AbortError");
}

export async function streamAiResult<T extends object>({
  path, body, headers, schema, signal, onToken,
}: AiResultStreamRequest<T>): Promise<T> {
  assertNotAborted(signal);
  const response = await authedFetch(buildUrl(path), {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/x-ndjson", ...headers },
    body: JSON.stringify(body ?? {}),
  }, path, signal, { timeoutMs: AI_STREAM_TIMEOUT_MS });
  if (!response.ok) throw await readAiStreamError(response, path);
  if (!response.headers.get("content-type")?.includes("application/x-ndjson"))
    throw new ApiError("Unexpected AI stream format", 502, "AI_INVALID_OUTPUT");
  const reader = response.body?.getReader();
  if (!reader) throw new ApiError("Streaming is unavailable", 502, "AI_INVALID_OUTPUT");
  const decoder = new TextDecoder();
  let pending = "";
  let receivedBytes = 0;
  let result: T | undefined;

  function handleFrame(line: string) {
    assertNotAborted(signal);
    if (line.length > 2_000_000)
      throw new ApiError("AI result exceeds the supported size", 502, "AI_INVALID_OUTPUT");
    if (!line.trim()) return;
    if (result !== undefined) throw new ApiError("Unexpected data after AI result", 502, "AI_INVALID_OUTPUT");
    let decoded: unknown;
    try {
      decoded = JSON.parse(line);
    } catch {
      throw new ApiError("Invalid AI stream data", 502, "AI_INVALID_OUTPUT");
    }
    const parsed = aiResultFrameSchema.safeParse(decoded);
    if (!parsed.success) throw new ApiError("Invalid AI stream data", 502, "AI_INVALID_OUTPUT");
    const frame = parsed.data;
    if (frame.type === "error") throw new ApiError("AI generation could not be completed", 502, "AI_STREAM_INCOMPLETE");
    if (frame.type === "text") onToken?.(frame.text);
    else {
      const validated = schema.safeParse(frame.data);
      if (!validated.success) throw new ApiError("Invalid AI result", 502, "AI_INVALID_OUTPUT");
      result = validated.data;
    }
  }

  try {
    for (;;) {
      assertNotAborted(signal);
      const chunk = await reader.read();
      assertNotAborted(signal);
      receivedBytes += chunk.value?.byteLength ?? 0;
      if (receivedBytes > 8_000_000)
        throw new ApiError("AI stream exceeds the supported size", 502, "AI_INVALID_OUTPUT");
      pending += chunk.done ? decoder.decode() : decoder.decode(chunk.value, { stream: true });
      let newline = pending.indexOf("\n");
      while (newline !== -1) {
        handleFrame(pending.slice(0, newline));
        pending = pending.slice(newline + 1);
        newline = pending.indexOf("\n");
      }
      if (pending.length > 2_000_000)
        throw new ApiError("AI result exceeds the supported size", 502, "AI_INVALID_OUTPUT");
      if (chunk.done) break;
    }
    if (pending) handleFrame(pending);
    if (result === undefined)
      throw new ApiError("The AI stream ended before completion. Your draft may be incomplete.", 502, "AI_STREAM_INCOMPLETE");
    return result;
  } finally {
    await reader.cancel().catch(() => undefined);
    reader.releaseLock();
  }
}
