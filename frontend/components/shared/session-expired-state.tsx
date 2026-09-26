"use client";

import { LogIn } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { GateStateProps } from "./page-state-shared";

export function SessionExpiredState({ compact = false, className }: GateStateProps) {
  function handleSignIn() {
    window.location.assign("/signin");
  }

  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center text-center",
        compact ? "py-6 px-4" : "min-h-full w-full flex-1 py-12 px-6",
        className,
      )}
      role="status"
      aria-label="Session expired"
    >
      <div
        className={cn(
          "rounded-2xl bg-muted flex items-center justify-center mb-4",
          compact ? "h-10 w-10" : "h-14 w-14",
        )}
      >
        <LogIn className={cn("text-muted-foreground", compact ? "w-5" : "w-7")} />
      </div>
      <h2 className={cn("font-semibold mb-1", compact ? "text-sm" : "text-base")}>
        Your session expired
      </h2>
      <p
        className={cn(
          "text-muted-foreground max-w-sm mb-4",
          compact ? "text-xs" : "text-sm",
        )}
      >
        You were signed out after a period of inactivity. Signing in again will bring you
        straight back here.
      </p>
      <Button size={compact ? "sm" : "default"} onClick={handleSignIn}>
        Sign in again
      </Button>
    </div>
  );
}
