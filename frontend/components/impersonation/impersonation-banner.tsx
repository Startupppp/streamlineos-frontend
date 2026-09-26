"use client";

import { useEffect, useState } from "react";
import { UserX } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getErrorMessage } from "@/lib/get-error-message";
import { getImpersonationUser, getImpersonationSessionId, isImpersonating } from "@/lib/api-client";
import { useStopImpersonation } from "@/hooks/api/impersonation";
import { toast } from "sonner";

interface ImpersonationDetail {
  active: boolean;
  targetUser?: { id: string; name: string | null; email: string } | null;
  sessionId?: string | null;
}

function isImpersonationDetail(v: unknown): v is ImpersonationDetail {
  return (
    typeof v === "object" &&
    v !== null &&
    "active" in v &&
    typeof v.active === "boolean"
  );
}

export function ImpersonationBanner() {
  const [active, setActive] = useState(() => isImpersonating());
  const [targetUser, setTargetUser] = useState(() => getImpersonationUser());
  const [sessionId, setSessionId] = useState(() => getImpersonationSessionId());
  const stopMutation = useStopImpersonation();

  useEffect(() => {
    function handleChange(event: Event) {
      if (!(event instanceof CustomEvent)) return;
      const raw: unknown = event.detail;
      if (!isImpersonationDetail(raw)) return;
      setActive(raw.active);
      setTargetUser(raw.active ? (raw.targetUser ?? null) : null);
      setSessionId(raw.active ? (raw.sessionId ?? null) : null);
    }

    window.addEventListener("impersonation-change", handleChange);
    return () => {
      window.removeEventListener("impersonation-change", handleChange);
    };
  }, []);

  function handleExit() {
    if (!sessionId) return;
    stopMutation.mutate(sessionId, {
      onError: (error) => {
        toast.error(getErrorMessage(error));
      },
    });
  }

  if (!active) return null;

  const displayName = targetUser?.name ?? targetUser?.email ?? "unknown user";

  return (
    <div
      role="alert"
      aria-live="polite"
      className="flex items-center justify-between gap-2 border-b border-amber-200 bg-amber-50 px-3 py-2 shrink-0 dark:border-amber-500/30 dark:bg-amber-500/10 sm:gap-3 sm:px-4"
    >
      <div className="flex min-w-0 items-center gap-2">
        <UserX
          className="h-3.5 w-3.5 shrink-0 text-amber-700 dark:text-amber-400"
          aria-hidden="true"
        />
        <span className="min-w-0 truncate text-sm font-medium text-amber-800 dark:text-amber-300">
          You are viewing as{" "}
          <span className="font-semibold">{displayName}</span>
        </span>
      </div>
      <Button
        type="button"
        variant="outline"
        size="sm"
        className="h-7 shrink-0 border-amber-300 bg-amber-100 px-3 text-xs font-medium text-amber-800 hover:bg-amber-200 dark:border-amber-500/50 dark:bg-amber-500/20 dark:text-amber-300 dark:hover:bg-amber-500/30"
        disabled={stopMutation.isPending}
        onClick={handleExit}
      >
        Exit
      </Button>
    </div>
  );
}
