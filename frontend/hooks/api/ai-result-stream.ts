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

export async function streamAiResult<T extends object>({
  path, body, headers, schema, signal, onToken,
}: AiResultStreamRequest<T>): Promise<T> {
  signal?.throwIfAborted();
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
  let result: T | undefined;

  function handleFrame(line: string) {
    if (!line.trim()) return;
    if (result !== undefined) throw new ApiError("Unexpected data after AI result", 502, "AI_INVALID_OUTPUT");
    const decoded: unknown = JSON.parse(line);
    const frame = aiResultFrameSchema.parse(decoded);
    if (frame.type === "text") onToken?.(frame.text);
    else result = schema.parse(frame.data);
  }

  try {
    for (;;) {
      signal?.throwIfAborted();
      const chunk = await reader.read();
      signal?.throwIfAborted();
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
