"use client";

import { useCallback } from "react";
import Image from "next/image";
import { RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface AppLoadingStalledProps {
  className?: string;
}

export const STALLED_TITLE = "This is taking longer than it should";
export const STALLED_DESCRIPTION =
  "Your workspace has not finished syncing. The connection to the server may be down. Reloading usually clears it; if it does not, sign in again.";

export function AppLoadingStalled({ className }: AppLoadingStalledProps) {
  const handleReload = useCallback(() => {
    window.location.reload();
  }, []);

  return (
    <div
      className={cn(
        "flex min-h-[60vh] flex-1 flex-col items-center justify-center bg-background px-6 text-center",
        className,
      )}
      role="alert"
      aria-live="assertive"
      aria-busy="false"
    >
      <Image
        src="/logo.svg"
        alt="StreamlineOS"
        width={56}
        height={56}
        priority
        className="h-14 w-14 rounded-xl"
      />
      <h2 className="mt-8 text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
        {STALLED_TITLE}
      </h2>
      <p className="mt-3 max-w-sm text-sm leading-relaxed text-muted-foreground">
        {STALLED_DESCRIPTION}
      </p>
      <Button className="mt-7" onClick={handleReload}>
        <RefreshCw className="mr-2 h-4 w-4" aria-hidden="true" />
        Reload
      </Button>
    </div>
  );
}
