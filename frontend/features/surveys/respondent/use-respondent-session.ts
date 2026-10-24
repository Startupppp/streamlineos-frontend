"use client";

import { useCallback, useSyncExternalStore } from "react";
import { z } from "zod";

const SESSION_EVENT = "survey-respondent-session-change";

const storedSessionSchema = z.object({
  sessionId: z.number().int().positive(),
  respondentKey: z.string().min(16),
});

export type RespondentSession = z.infer<typeof storedSessionSchema>;

function storageKey(collectorToken: string): string {
  return `survey-respondent-session:${collectorToken}`;
}

function readRaw(key: string): string | null {
  try {
    return window.sessionStorage.getItem(key);
  } catch {
    return null;
  }
}

function subscribe(onChange: () => void): () => void {
  window.addEventListener(SESSION_EVENT, onChange);
  return () => window.removeEventListener(SESSION_EVENT, onChange);
}

function getServerSnapshot(): string | null {
  return null;
}

function parse(raw: string | null): RespondentSession | null {
  if (raw === null) return null;
  try {
    const parsed = storedSessionSchema.safeParse(JSON.parse(raw));
    return parsed.success ? parsed.data : null;
  } catch {
    return null;
  }
}

function write(key: string, value: RespondentSession | null): void {
  try {
    if (value === null) window.sessionStorage.removeItem(key);
    else window.sessionStorage.setItem(key, JSON.stringify(value));
  } catch {
  }
  window.dispatchEvent(new Event(SESSION_EVENT));
}

export function useRespondentSession(
  collectorToken: string,
): [RespondentSession | null, (next: RespondentSession | null) => void] {
  const key = storageKey(collectorToken);
  const getSnapshot = useCallback(() => readRaw(key), [key]);
  const raw = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  const setSession = useCallback((next: RespondentSession | null) => write(key, next), [key]);
  return [parse(raw), setSession];
}
