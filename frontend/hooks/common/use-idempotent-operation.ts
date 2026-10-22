"use client";

import { useRef } from "react";
import type { RequestConfig } from "@/lib/api-client";
import { IDEMPOTENCY_HEADER, newIdempotencyKey } from "@/lib/idempotency-key";

interface Attempt {
  readonly key: string;
  readonly signature: string;
}

export interface IdempotentOperation {
  configFor(input: unknown, config?: RequestConfig): RequestConfig;
  settle(): void;
}

function signatureOf(input: unknown): string {
  try {
    return JSON.stringify(input) ?? "undefined";
  } catch {
    return String(Date.now());
  }
}

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
