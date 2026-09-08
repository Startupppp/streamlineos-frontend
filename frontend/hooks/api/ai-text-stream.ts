"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ApiError, authedFetch, buildUrl, getApiErrorCode } from "@/lib/api-client";
import { isRecord } from "@/lib/is-record";

/**
 * The client for every AI text-stream route the backend exposes.
 *
 * All of them share one wire format. `respondWithAiTextStream` pipes the provider stream
 * straight through `pipeTextStreamToResponse`, so the body is raw UTF-8 text deltas under
 * `text/plain; charset=utf-8` — no SSE frames, no `data:` prefix, no JSON envelope and no
 * terminator sentinel. A parser that splits on newlines or calls `JSON.parse` would corrupt
 * it. Read the bytes, decode them, forward them.
 *
 * Sidecar metadata rides on response headers rather than in the body (`x-kb-sources` is the
 * only one today), so `headers` is returned with the completed outcome.
 *
 * Errors raised before the first byte arrive as real HTTP status codes, which is what keeps
 * a 402 renderable as credit exhaustion rather than a generic failure. A fault mid-stream
 * ends the response instead, and the read loop sees it as a normal `done` — the caller gets
 * whatever text arrived.
 */

/**
 * A stream ends when the BACKEND's deadline ends it — 120 s for chat
 * (`CHAT_STREAM_DEADLINE_MS`), 60 s for the other stream routes
 * (`AI_TEXT_STREAM_DEADLINE_MS`, `KB_STREAM_DEADLINE_MS`). The client's ordinary
 * 30 s cap is tighter than every one of them, so it was aborting paid streams
 * the server was still producing and reporting them as cancellations. This is a
 * backstop for a socket that dies silently, not a deadline on the answer, so it
 * sits above the longest server deadline rather than under it.
 */
export const AI_STREAM_TIMEOUT_MS = 180_000;

export type AiTextStreamResult =
  | { status: "completed"; text: string; headers: Headers }
  | { status: "cancelled"; text: string };

export type AiTextStreamOutcome = AiTextStreamResult | { status: "busy" };

export interface AiTextStreamRequest {
  path: string;
  body: unknown;
  onToken?: (token: string) => void;
  /**
   * Sidecar metadata rides ahead of the body, so it is already on the wire when
   * the first token arrives. Delivering it through a callback rather than only
   * on the completed outcome is what lets a stream the user stops halfway keep
   * its citations — the backend sends them precisely so a truncated answer
   * still has them, and returning them only with `completed` threw that away.
   */
  onHeaders?: (headers: Headers) => void;
  signal?: AbortSignal;
}

export function isAiStreamAbort(error: unknown): boolean {
  return (
    ((error instanceof DOMException || error instanceof Error) &&
      error.name === "AbortError") ||
    getApiErrorCode(error) === "ABORTED"
  );
}

export async function readAiStreamError(res: Response, path: string): Promise<ApiError> {
  let message = `${res.status} ${res.statusText}`;
  let code: string | undefined;
  try {
    const body: unknown = await res.json();
    if (isRecord(body)) {
      if (typeof body.message === "string") message = body.message;
      else if (typeof body.error === "string") message = body.error;
      if (typeof body.code === "string") code = body.code;
    }
  } catch {
    message = `${res.status} ${res.statusText}`;
  }
  return new ApiError(message || path, res.status, code);
}

/**
 * The signal belongs in `authedFetch`'s fourth argument, never in `init`. `authedFetch`
 * builds its own combined signal and spreads `init` underneath it, so an `init.signal`
 * is overwritten and every cancel becomes a silent no-op — the defect this seam already
 * shipped once.
 */
export async function streamAiText({
  path,
  body,
  onToken,
  onHeaders,
  signal,
}: AiTextStreamRequest): Promise<AiTextStreamResult> {
  let received = "";
  if (signal?.aborted) return { status: "cancelled", text: received };

  try {
    const res = await authedFetch(
      buildUrl(path),
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      },
      path,
      signal,
      { timeoutMs: AI_STREAM_TIMEOUT_MS },
    );

    if (!res.ok) throw await readAiStreamError(res, path);

    onHeaders?.(res.headers);

    const reader = res.body?.getReader();
    if (!reader) throw new Error("Streaming is not supported in this browser");

    const decoder = new TextDecoder();
    for (;;) {
      if (signal?.aborted) return { status: "cancelled", text: received };
      const { done, value } = await reader.read();
      if (done) break;
      const token = decoder.decode(value, { stream: true });
      if (!token) continue;
      received += token;
      onToken?.(token);
    }

    const tail = decoder.decode();
    if (tail) {
      received += tail;
      onToken?.(tail);
    }

    return { status: "completed", text: received, headers: res.headers };
  } catch (error) {
    if (isAiStreamAbort(error)) return { status: "cancelled", text: received };
    throw error;
  }
}

export interface AiTextStreamHandle {
  stream: (request: Omit<AiTextStreamRequest, "signal">) => Promise<AiTextStreamOutcome>;
  /**
   * The same single-flight, Stop and unmount-abort machinery for a surface whose
   * transport is a typed per-route helper rather than a raw path and body. A
   * second copy of the guard is how one surface ends up charging twice.
   */
  run: (
    produce: (signal: AbortSignal) => Promise<AiTextStreamResult>,
  ) => Promise<AiTextStreamOutcome>;
  stop: () => void;
  isStreaming: boolean;
}

/**
 * Single-flight wrapper for a surface that owns its own Stop button. A second call while one
 * stream is open returns `busy` rather than opening a second paid request, and unmounting
 * aborts the open one so an abandoned stream is not left spending.
 */
export function useAiTextStream(): AiTextStreamHandle {
  const [isStreaming, setIsStreaming] = useState(false);
  const abortRef = useRef<AbortController | null>(null);
  const inFlightRef = useRef(false);

  const run = useCallback(
    async (
      produce: (signal: AbortSignal) => Promise<AiTextStreamResult>,
    ): Promise<AiTextStreamOutcome> => {
      if (inFlightRef.current) return { status: "busy" };

      const controller = new AbortController();
      abortRef.current = controller;
      inFlightRef.current = true;
      setIsStreaming(true);

      try {
        return await produce(controller.signal);
      } finally {
        inFlightRef.current = false;
        setIsStreaming(false);
        abortRef.current = null;
      }
    },
    [],
  );

  const stream = useCallback(
    (request: Omit<AiTextStreamRequest, "signal">): Promise<AiTextStreamOutcome> =>
      run((signal) => streamAiText({ ...request, signal })),
    [run],
  );

  const stop = useCallback(() => {
    abortRef.current?.abort();
  }, []);

  useEffect(() => {
    return () => {
      abortRef.current?.abort();
    };
  }, []);

  return { stream, run, stop, isStreaming };
}
