"use client";

import { useRef } from "react";
import type { RequestConfig } from "@/lib/api-client";
import { IDEMPOTENCY_HEADER, newIdempotencyKey } from "@/lib/idempotency-key";

interface Attempt {
  readonly key: string;
  readonly signature: string;
}

export interface IdempotentOperation {
  /**
   * The request config for this attempt. Retrying the same input reuses the key
   * the first attempt was given, so the backend replays its result instead of
   * performing the action twice; a different input is a different operation and
   * gets a new key.
   */
  configFor(input: unknown, config?: RequestConfig): RequestConfig;
  /** The operation finished. The next call starts a new one, even with identical input. */
  settle(): void;
}

function signatureOf(input: unknown): string {
  try {
    return JSON.stringify(input) ?? "undefined";
  } catch {
    return String(Date.now());
  }
}

/**
 * Keeps one idempotency key alive for as long as an operation is being retried.
 *
 * Minting the key inside the transport made every retry a fresh operation: a
 * compose Retry after a timeout sent the recipient a second real email, because
 * the backend was never handed the same key twice. The key belongs to the send,
 * not to the HTTP call, so it lives here for the life of the attempt and is
 * released on `settle()`.
 */
export function useIdempotentOperation(): IdempotentOperation {
  const attempt = useRef<Attempt | null>(null);

  const configFor = (input: unknown, config?: RequestConfig): RequestConfig => {
    const signature = signatureOf(input);
    if (attempt.current === null || attempt.current.signature !== signature)
      attempt.current = { key: newIdempotencyKey(), signature };
    return {
      ...config,
      headers: {
        ...(config?.headers ?? {}),
        [IDEMPOTENCY_HEADER]: attempt.current.key,
      },
    };
  };

  const settle = (): void => {
    attempt.current = null;
  };

  return { configFor, settle };
}
