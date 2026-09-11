"use client";

import { WifiOff } from "lucide-react";
import { useOnlineStatus } from "@/hooks/common/use-online-status";

export function ShellOfflineBanner() {
  const isOnline = useOnlineStatus();

  if (isOnline) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      className="flex shrink-0 items-center justify-center gap-2 bg-status-warning-surface px-4 py-1.5 text-label font-medium text-status-warning-ink"
    >
      <WifiOff className="h-4 w-4 shrink-0" aria-hidden="true" />
      <span>You are offline. Some features may be unavailable.</span>
    </div>
  );
}
