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
      className="flex shrink-0 items-center justify-center gap-2 bg-amber-500/10 px-4 py-1.5 text-[13px] font-medium text-amber-700 dark:text-amber-400"
    >
      <WifiOff className="h-4 w-4 shrink-0" aria-hidden="true" />
      <span>You are offline. Some features may be unavailable.</span>
    </div>
  );
}
