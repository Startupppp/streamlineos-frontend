"use client";

import { AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { InboxSourceStatus } from "@/types/inbox";
import { INBOX_SOURCE_LABELS } from "./inbox-sources";

const GENERIC_FAILURE = "source unavailable";

export interface InboxDegradedBannerProps {
  sources: InboxSourceStatus[];
  onRetry: () => void;
}

export function InboxDegradedBanner({
  sources,
  onRetry,
}: InboxDegradedBannerProps) {
  if (sources.length === 0) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      className="shrink-0 rounded-lg border border-status-warning-rule bg-status-warning-surface px-4 py-3"
    >
      <div className="flex items-center gap-2">
        <AlertTriangle
          className="h-4 w-4 shrink-0 text-status-warning-ink"
          aria-hidden
        />
        <p className="text-xs font-semibold text-status-warning-ink">
          Some sources could not be read. Everything listed below is still
          current.
        </p>
      </div>
      <ul className="mt-2 flex flex-col gap-1.5">
        {sources.map((source) => (
          <li key={source.kind} className="flex items-center gap-2">
            <p className="min-w-0 flex-1 text-xs text-status-warning-ink">
              <span className="font-semibold">
                {INBOX_SOURCE_LABELS[source.kind]}
              </span>
              {` — ${source.error ?? GENERIC_FAILURE}`}
            </p>
            <Button
              variant="outline"
              size="sm"
              className="shrink-0 border-status-warning-rule text-status-warning-ink hover:bg-status-warning-surface"
              aria-label={`Retry ${INBOX_SOURCE_LABELS[source.kind]}`}
              onClick={onRetry}
            >
              Retry
            </Button>
          </li>
        ))}
      </ul>
    </div>
  );
}
