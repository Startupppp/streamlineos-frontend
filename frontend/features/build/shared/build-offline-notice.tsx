"use client";

import { CloudOff } from "lucide-react";
import { useOnlineStatus } from "@/hooks/common/use-online-status";
import { formatRelativeTime } from "@/lib/format-relative-time";

interface BuildOfflineNoticeProps {
  dataUpdatedAt?: number;
}

export function BuildOfflineNotice({ dataUpdatedAt }: BuildOfflineNoticeProps) {
  const isOnline = useOnlineStatus();
  if (isOnline) return null;
  const freshness =
    dataUpdatedAt !== undefined && dataUpdatedAt > 0
      ? `loaded ${formatRelativeTime(new Date(dataUpdatedAt))}`
      : "loaded earlier";
  return (
    <div
      role="status"
      data-testid="offline-notice"
      className="flex items-center gap-2 rounded-md border border-border bg-muted/40 px-3 py-2 text-sm text-muted-foreground"
    >
      <CloudOff className="h-4 w-4 shrink-0" aria-hidden="true" />
      <span>
        Offline — showing data {freshness}. Changes are paused until the
        connection returns.
      </span>
    </div>
  );
}
