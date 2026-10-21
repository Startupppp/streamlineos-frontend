"use client";

import { useEffect } from "react";
import { apiClient } from "@/lib/api-client";
import { lazyContract } from "@/lib/api-envelope";

type ChatTelemetryMetric = "send_to_visible" | "reconnect_gap" | "duplicate_dropped";

interface ChatTelemetrySample {
  metric: ChatTelemetryMetric;
  value: number;
  realtime: boolean;
}

const FLUSH_INTERVAL_MS = 30_000;
const FLUSH_AT_SAMPLES = 20;
const MAX_SAMPLE_VALUE = 120_000;
const SENT_KEYS_KEPT = 200;

const noContentContract = lazyContract(() =>
  import("@/hooks/api/cursor-page-schema").then((m) => m.noContentContract),
);

const queue: ChatTelemetrySample[] = [];
let duplicatesDropped = 0;
let realtimeConnected = false;
let flushMounts = 0;
let stopFlushing: (() => void) | null = null;
const pendingSends = new Map<string, { startedAt: number; realtime: boolean }>();
const sentClientKeys = new Set<string>();

function sampleValue(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.min(MAX_SAMPLE_VALUE, Math.max(0, Math.round(value)));
}

function now(): number {
  return typeof performance !== "undefined" ? performance.now() : Date.now();
}

function post(samples: ChatTelemetrySample[]): void {
  try {
    void apiClient
      .post<void>("/chat/telemetry", { samples }, undefined, noContentContract)
      .catch(() => undefined);
  } catch {
    return;
  }
}

export function flushChatTelemetry(): void {
  if (duplicatesDropped > 0) {
    queue.push({ metric: "duplicate_dropped", value: sampleValue(duplicatesDropped), realtime: true });
    duplicatesDropped = 0;
  }
  while (queue.length > 0) post(queue.splice(0, FLUSH_AT_SAMPLES));
}

function recordChatTelemetry(sample: ChatTelemetrySample): void {
  queue.push({ ...sample, value: sampleValue(sample.value) });
  if (queue.length >= FLUSH_AT_SAMPLES) flushChatTelemetry();
}

export function setChatTelemetryRealtime(connected: boolean): void {
  realtimeConnected = connected;
}

export function beginChatSend(clientKey: string): void {
  pendingSends.set(clientKey, { startedAt: now(), realtime: realtimeConnected });
  sentClientKeys.add(clientKey);
  if (sentClientKeys.size > SENT_KEYS_KEPT) {
    const oldest = sentClientKeys.values().next().value;
    if (oldest !== undefined) sentClientKeys.delete(oldest);
  }
}

export function abandonChatSend(clientKey: string): void {
  pendingSends.delete(clientKey);
}

export function chatSendVisible(clientKey: string | null | undefined): void {
  if (!clientKey) return;
  const pending = pendingSends.get(clientKey);
  if (!pending) return;
  pendingSends.delete(clientKey);
  recordChatTelemetry({
    metric: "send_to_visible",
    value: now() - pending.startedAt,
    realtime: pending.realtime,
  });
}

export function recordChatReconnectGap(added: number): void {
  recordChatTelemetry({ metric: "reconnect_gap", value: added, realtime: true });
}

export function noteChatDuplicateDropped(clientKey: string | null | undefined): void {
  if (clientKey && sentClientKeys.has(clientKey)) return;
  duplicatesDropped += 1;
}

function startFlushing(): () => void {
  const interval = setInterval(flushChatTelemetry, FLUSH_INTERVAL_MS);
  const onVisibility = (): void => {
    if (document.visibilityState === "hidden") flushChatTelemetry();
  };
  document.addEventListener("visibilitychange", onVisibility);
  return () => {
    clearInterval(interval);
    document.removeEventListener("visibilitychange", onVisibility);
    flushChatTelemetry();
  };
}

export function useChatTelemetryFlush(): void {
  useEffect(() => {
    flushMounts += 1;
    if (flushMounts === 1) stopFlushing = startFlushing();
    return () => {
      flushMounts -= 1;
      if (flushMounts > 0) return;
      stopFlushing?.();
      stopFlushing = null;
    };
  }, []);
}
