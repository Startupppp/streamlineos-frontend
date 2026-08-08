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
      role="region"
      aria-label="Trial expiry notice"
      className="flex items-center justify-between gap-2 border-b border-amber-200 bg-amber-50 px-3 py-2 shrink-0 dark:border-amber-500/30 dark:bg-amber-500/10 sm:gap-3 sm:px-4"
    >
      <div className="flex min-w-0 items-center gap-2">
        <Clock
          className="h-3.5 w-3.5 shrink-0 text-amber-600 dark:text-amber-400"
          aria-hidden="true"
        />
        <p className="min-w-0 text-xs leading-snug text-amber-800 dark:text-amber-200">
          {daysLeft === 0 ? (
            <strong>{label}</strong>
          ) : (
            <>
              <span className="sm:hidden">
                Trial ends in{" "}
                <strong className="font-semibold">
                  {daysLeft}d
                </strong>
              </span>
              <span className="hidden sm:inline">
                Your trial ends in{" "}
                <strong className="font-semibold">
                  {daysLeft} day{daysLeft === 1 ? "" : "s"}
                </strong>
                {" — upgrade to keep full access."}
              </span>
            </>
          )}
        </p>
      </div>
      <div className="flex shrink-0 items-center gap-1.5 sm:gap-2">
        <Button
          asChild
          size="sm"
          className="h-7 border-0 bg-amber-600 px-2.5 text-[11px] text-white hover:bg-amber-700 sm:h-6 sm:px-3"
        >
          <Link href="/settings/billing?tab=plan">
            <span className="sm:hidden">Upgrade</span>
            <span className="hidden sm:inline">Upgrade now</span>
          </Link>
        </Button>
        <button
          type="button"
          onClick={handleDismiss}
          aria-label="Dismiss trial notice"
          className="flex h-7 w-7 items-center justify-center rounded text-amber-600 transition-colors hover:bg-amber-100 hover:text-amber-800 dark:text-amber-400 dark:hover:bg-amber-500/20 dark:hover:text-amber-200 sm:h-5 sm:w-5"
        >
          <X className="h-3 w-3" aria-hidden="true" />
        </button>
      </div>
    </div>
  );
}
