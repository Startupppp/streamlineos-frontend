"use client";

import { useSession } from "next-auth/react";
import Link from "next/link";
import { AlertTriangle } from "lucide-react";

export function SubscriptionWarningBanner() {
  const { data: session } = useSession();

  if (session?.daysUntilExpiry === undefined) return null;
  if (session.daysUntilExpiry >= 14) return null;

  const days = session.daysUntilExpiry;
  const message =
    days <= 0
      ? "Your subscription has expired."
      : days === 1
        ? "Your subscription expires tomorrow."
        : `Your subscription expires in ${days} days.`;

  return (
    <div className="w-full bg-amber-500/10 border-b border-amber-500/20 px-4 py-2.5 flex items-center justify-between gap-3 text-sm">
      <div className="flex items-center gap-2 text-amber-700 dark:text-amber-400">
        <AlertTriangle className="h-4 w-4 shrink-0" />
        <span>{message}</span>
      </div>
      <Link
        href="/settings/subscription"
        className="shrink-0 font-medium text-amber-700 dark:text-amber-400 underline underline-offset-2 hover:no-underline"
      >
        Upgrade now
      </Link>
    </div>
  );
}
