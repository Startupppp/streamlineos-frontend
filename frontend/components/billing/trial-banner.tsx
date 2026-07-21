"use client";

import { useState } from "react";
import Link from "next/link";
import { X, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useSubscription } from "@/hooks/api/subscription";

function getDaysRemaining(trialEndsAt: string): number {
  return Math.max(
    0,
    Math.ceil((new Date(trialEndsAt).getTime() - Date.now()) / 86_400_000),
  );
}

export function TrialBanner() {
  const [dismissed, setDismissed] = useState(false);
  const { data, isLoading, isError } = useSubscription();

  function handleDismiss() {
    setDismissed(true);
  }

  if (isLoading || isError || dismissed) return null;

  const subscription = data?.subscription;
  if (
    !subscription ||
    subscription.status !== "TRIAL" ||
    !subscription.trialEndsAt
  )
    return null;

  const daysLeft = getDaysRemaining(subscription.trialEndsAt);
  const label =
    daysLeft === 0
      ? "Your trial expires today"
      : `Your trial ends in ${daysLeft} day${daysLeft === 1 ? "" : "s"}`;

  return (
    <div
      role="banner"
      aria-label="Trial expiry notice"
      className="flex items-center justify-between gap-3 border-b border-amber-200 dark:border-amber-500/30 bg-amber-50 dark:bg-amber-500/10 px-4 py-2 shrink-0"
    >
      <div className="flex items-center gap-2 min-w-0">
        <Clock
          className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400 shrink-0"
          aria-hidden="true"
        />
        <p className="text-xs text-amber-800 dark:text-amber-200 truncate">
          {daysLeft === 0 ? (
            <strong>{label}</strong>
          ) : (
            <>
              Your trial ends in{" "}
              <strong className="font-semibold">
                {daysLeft} day{daysLeft === 1 ? "" : "s"}
              </strong>
            </>
          )}
          {" — upgrade to keep full access."}
        </p>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        <Button
          asChild
          size="sm"
          className="h-6 px-3 text-[11px] bg-amber-600 hover:bg-amber-700 text-white border-0"
        >
          <Link href="/billing?tab=plan">Upgrade now</Link>
        </Button>
        <button
          type="button"
          onClick={handleDismiss}
          aria-label="Dismiss trial notice"
          className="h-5 w-5 flex items-center justify-center rounded text-amber-600 dark:text-amber-400 hover:text-amber-800 dark:hover:text-amber-200 hover:bg-amber-100 dark:hover:bg-amber-500/20 transition-colors"
        >
          <X className="h-3 w-3" aria-hidden="true" />
        </button>
      </div>
    </div>
  );
}
