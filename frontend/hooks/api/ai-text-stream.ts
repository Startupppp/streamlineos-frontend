"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ApiError, authedFetch, buildUrl, getApiErrorCode } from "@/lib/api-client";
import { apiErrorFromResponse } from "@/lib/api-envelope";
import {
  createAiUiMessageStreamDecoder,
  isAiUiMessageStream,
  type AiUiMessageStreamEvent,
} from "@/hooks/api/ai-ui-message-stream";


const CHAT_STREAM_SERVER_DEADLINE_MS = 120_000;
export const AI_STREAM_TIMEOUT_MS = CHAT_STREAM_SERVER_DEADLINE_MS + 5_000;

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

    if (!res.ok) throw await apiErrorFromResponse(res, path);

    onHeaders?.(res.headers);

    const reader = res.body?.getReader();
    if (!reader) throw new Error("Streaming is not supported in this browser");

    const decoder = new TextDecoder();
    const frames = isAiUiMessageStream(res.headers)
      ? createAiUiMessageStreamDecoder()
      : null;

    let lastToolError: string | null = null;

    function assertNever(x: never): never {
      throw new ApiError(`Unhandled stream event: ${JSON.stringify(x)}`, 502);
    }

    function emit(text: string) {
      if (!text) return;
      received += text;
      onToken?.(text);
    }

    function drain(events: readonly AiUiMessageStreamEvent[]) {
      for (const event of events) {
        switch (event.type) {
          case "error":
            throw new ApiError(event.message, 502);
          case "abort":
            throw new ApiError(
              "The assistant's response was cut short. Please try again.",
              502,
            );
          case "tool-error":
            lastToolError = event.message;
            break;
          case "data":
            onData?.(event.name, event.data);
            break;
          case "text":
            emit(event.text);
            break;
          default:
            assertNever(event);
        }
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

    if (received.length === 0 && lastToolError !== null)
      throw new ApiError(lastToolError, 502);

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
