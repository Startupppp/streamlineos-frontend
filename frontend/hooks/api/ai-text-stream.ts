"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ApiError, authedFetch, buildUrl, getApiErrorCode } from "@/lib/api-client";
import { isRecord } from "@/lib/is-record";
import {
  createAiUiMessageStreamDecoder,
  isAiUiMessageStream,
  type AiUiMessageStreamEvent,
} from "@/hooks/api/ai-ui-message-stream";


export const AI_STREAM_TIMEOUT_MS = 180_000;

export type AiTextStreamResult =
  | { status: "completed"; text: string; headers: Headers }
  | { status: "cancelled"; text: string };

export type AiTextStreamOutcome = AiTextStreamResult | { status: "busy" };

export interface AiTextStreamRequest {
  path: string;
  body: unknown;
  onToken?: (token: string) => void;
  onData?: (name: string, data: unknown) => void;
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
  onData,
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
    const frames = isAiUiMessageStream(res.headers)
      ? createAiUiMessageStreamDecoder()
      : null;

    function emit(text: string) {
      if (!text) return;
      received += text;
      onToken?.(text);
    }

    function drain(events: readonly AiUiMessageStreamEvent[]) {
      for (const event of events) {
        if (event.type === "error") throw new ApiError(event.message, 502);
        if (event.type === "data") {
          onData?.(event.name, event.data);
          continue;
        }
        emit(event.text);
      }
    }

    function consume(chunk: string) {
      if (!chunk) return;
      if (frames) drain(frames.decode(chunk));
      else emit(chunk);
    }

    for (;;) {
      if (signal?.aborted) return { status: "cancelled", text: received };
      const { done, value } = await reader.read();
      if (done) break;
      consume(decoder.decode(value, { stream: true }));
    }

    consume(decoder.decode());
    if (frames) drain(frames.flush());

    return { status: "completed", text: received, headers: res.headers };
  } catch (error) {
    if (isAiStreamAbort(error)) return { status: "cancelled", text: received };
    throw error;
  }
}

export interface AiTextStreamHandle {
  stream: (request: Omit<AiTextStreamRequest, "signal">) => Promise<AiTextStreamOutcome>;
  run: (
    produce: (signal: AbortSignal) => Promise<AiTextStreamResult>,
  ) => Promise<AiTextStreamOutcome>;
  stop: () => void;
  isStreaming: boolean;
}

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
