"use client";

import type { ProjectWebhook } from "@/hooks/api/build/webhooks";
import { cn } from "@/lib/utils";

export function secretAgeLabel(
  webhook: Pick<ProjectWebhook, "hasSecret" | "secretSetAt">,
): string {
  if (!webhook.hasSecret) return "no signing secret";
  if (!webhook.secretSetAt) return "secret age unknown";
  return `secret since ${new Date(webhook.secretSetAt).toLocaleDateString(
    undefined,
    { month: "short", year: "numeric" },
  )}`;
}

interface LastDeliveryMetaProps {
  lastDeliveryAt?: string | null;
  lastDeliveryStatus?: "success" | "failed" | "pending" | null;
  failureRate?: number | null;
}

export function LastDeliveryMeta({
  lastDeliveryAt,
  lastDeliveryStatus,
  failureRate,
}: LastDeliveryMetaProps) {
  if (!lastDeliveryAt) return null;
  const statusColor =
    lastDeliveryStatus === "success"
      ? "bg-status-success-fill"
      : lastDeliveryStatus === "failed"
        ? "bg-status-danger-fill"
        : "bg-status-warning-fill";
  const failurePct =
    failureRate !== null && failureRate !== undefined
      ? `${Math.round(failureRate * 100)}% failure`
      : null;
  return (
    <div className="flex items-center gap-2 mt-1">
      <div
        className={cn("h-1.5 w-1.5 rounded-full shrink-0", statusColor)}
        aria-hidden
      />
      <span className="text-micro text-muted-foreground">
        {new Date(lastDeliveryAt).toLocaleDateString(undefined, {
          month: "short",
          day: "numeric",
        })}
      </span>
      {failurePct && (
        <span className="text-micro text-status-danger-ink-strong font-mono">
          {failurePct}
        </span>
      )}
    </div>
  );
}
