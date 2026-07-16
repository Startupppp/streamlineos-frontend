"use client";

import Link from "next/link";
import { differenceInDays, format, subDays } from "date-fns";
import {
  CheckCircle2,
  Clock,
  ShieldCheck,
  FileDown,
  Lock,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { ErrorState } from "@/components/shared/error-state";
import { getErrorMessage } from "@/lib/get-error-message";
import { useSubscription } from "@/hooks/api/subscription";

const TRIAL_TOTAL_DAYS = 14;

function TrialPageSkeleton() {
  return (
    <div className="flex flex-1 min-h-0 flex-col gap-4">
      <Skeleton className="h-48 w-full rounded-lg" />
      <Skeleton className="h-36 w-full rounded-lg" />
      <div className="grid gap-3 sm:grid-cols-3">
        <Skeleton className="h-28 rounded-lg" />
        <Skeleton className="h-28 rounded-lg" />
        <Skeleton className="h-28 rounded-lg" />
      </div>
    </div>
  );
}

function TrialExpiryItems() {
  return (
    <ul className="space-y-2 mt-3">
      {[
        { icon: ShieldCheck, text: "Data preserved for 30 days" },
        { icon: Lock, text: "Access restricted to read-only" },
        { icon: FileDown, text: "Import/export available" },
      ].map(({ icon: Icon, text }) => (
        <li key={text} className="flex items-center gap-2 text-sm text-muted-foreground">
          <Icon className="h-3.5 w-3.5 shrink-0 text-muted-foreground/70" />
          {text}
        </li>
      ))}
    </ul>
  );
}

export default function TrialsPage() {
  const { data, isLoading, isError, error, refetch } = useSubscription();

  function handleRetry() {
    void refetch();
  }

  return (
    <PageWrapper
      title="Trial Management"
      subtitle="Track your trial and convert to a paid plan"
    >
      {isLoading ? (
        <TrialPageSkeleton />
      ) : isError ? (
        <ErrorState title="Failed to load subscription info" description={getErrorMessage(error)} onRetry={handleRetry} className="flex-1" />
      ) : !data?.subscription ? (
        <div className="flex flex-col items-center justify-center flex-1 py-16 gap-3">
          <Clock className="h-10 w-10 text-muted-foreground/40" />
          <p className="text-sm font-medium text-foreground">No active subscription</p>
          <p className="text-xs text-muted-foreground mb-2">
            Start a trial or choose a plan to get started.
          </p>
          <Button asChild size="sm">
            <Link href="/billing/checkout">View Plans</Link>
          </Button>
        </div>
      ) : data.subscription.status !== "TRIAL" ? (
        <div className="space-y-4">
          <div className="rounded-lg border border-green-200 bg-green-50/50 dark:border-green-500/30 dark:bg-green-500/10 p-6 flex flex-col items-center text-center gap-3">
            <CheckCircle2 className="h-12 w-12 text-green-600 dark:text-green-400" />
            <div>
              <p className="text-base font-semibold text-foreground">
                You&apos;re on the {data.subscription.plan} Plan
              </p>
              <p className="text-sm text-muted-foreground mt-0.5">
                Your subscription is active and all features are available.
              </p>
            </div>
            {data.subscription.currentPeriodEnd && (
              <p className="text-xs text-muted-foreground">
                Renews on{" "}
                {format(
                  new Date(data.subscription.currentPeriodEnd),
                  "dd MMM yyyy",
                )}
              </p>
            )}
            <Button variant="outline" size="sm" asChild>
              <Link href="/billing?tab=plan">Manage Subscription</Link>
            </Button>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          {(() => {
            const trialEndsAt = data.subscription.trialEndsAt
              ? new Date(data.subscription.trialEndsAt)
              : null;
            const now = new Date();
            const daysRemaining = trialEndsAt
              ? Math.max(0, differenceInDays(trialEndsAt, now))
              : 0;
            const trialStartDate = trialEndsAt
              ? subDays(trialEndsAt, TRIAL_TOTAL_DAYS)
              : null;
            const daysUsed = trialStartDate
              ? Math.min(
                  TRIAL_TOTAL_DAYS,
                  differenceInDays(now, trialStartDate),
                )
              : 0;
            const progressPercent = Math.min(
              100,
              (daysUsed / TRIAL_TOTAL_DAYS) * 100,
            );

            return (
              <>
                <div className="rounded-lg border border-amber-200 bg-amber-50/40 dark:border-amber-500/30 dark:bg-amber-500/10 p-5 space-y-4">
                  <div className="flex items-center gap-2">
                    <Badge className="bg-amber-500/15 text-amber-700 border-amber-300/60 text-[11px] dark:bg-amber-500/10 dark:text-amber-300 dark:border-amber-500/30">
                      Trial Active
                    </Badge>
                  </div>

                  <div>
                    <p className="text-2xl font-bold text-foreground">
                      {daysRemaining} day{daysRemaining !== 1 ? "s" : ""} remaining
                    </p>
                    {trialEndsAt && (
                      <p className="text-sm text-muted-foreground mt-0.5">
                        Trial ends on {format(trialEndsAt, "dd MMM yyyy")}
                      </p>
                    )}
                  </div>

                  <div className="space-y-1.5">
                    <div className="flex justify-between text-xs text-muted-foreground">
                      <span>Day {daysUsed} of {TRIAL_TOTAL_DAYS}</span>
                      <span>{TRIAL_TOTAL_DAYS - daysUsed} days left</span>
                    </div>
                    <Progress value={progressPercent} className="h-2" />
                  </div>

                  <div>
                    <p className="text-xs font-medium text-muted-foreground mb-1">
                      What happens when your trial ends:
                    </p>
                    <TrialExpiryItems />
                  </div>

                  <Button asChild className="w-full sm:w-auto">
                    <Link href="/billing/checkout">Upgrade Now</Link>
                  </Button>
                </div>

                <div className="rounded-lg border border-border bg-card p-5 space-y-3">
                  <p className="text-sm font-semibold">
                    You&apos;re exploring StreamlineOS with full access
                  </p>
                  <p className="text-xs text-muted-foreground leading-snug">
                    During your trial you have access to all features including
                    HR, CRM, Projects, Inventory, and more. Upgrade to
                    Professional to keep everything after your trial ends.
                  </p>
                  <Button variant="outline" size="sm" asChild>
                    <Link href="/billing/checkout">
                      Convert to Professional
                    </Link>
                  </Button>
                </div>

                <div>
                  <p className="text-xs font-medium text-muted-foreground mb-2">
                    Trial options
                  </p>
                  <div className="grid gap-3 sm:grid-cols-3">
                    {[
                      {
                        title: "Platform Trial",
                        description:
                          "Full access to all StreamlineOS modules — currently active.",
                        badge: "Active",
                        badgeClass:
                          "bg-green-500/10 text-green-600 border-green-500/20 dark:bg-green-500/10 dark:text-green-300 dark:border-green-500/30",
                      },
                      {
                        title: "App Trial",
                        description:
                          "Try individual apps from the Marketplace before adding them.",
                        badge: "Available",
                        badgeClass:
                          "bg-blue-500/10 text-blue-600 border-blue-500/20 dark:bg-blue-500/10 dark:text-blue-300 dark:border-blue-500/30",
                      },
                      {
                        title: "Enterprise POC",
                        description:
                          "Proof of concept engagement for large-scale deployments.",
                        badge: "Contact Sales",
                        badgeClass:
                          "bg-muted text-muted-foreground border-border",
                      },
                    ].map(({ title, description, badge, badgeClass }) => (
                      <div
                        key={title}
                        className="rounded-lg border border-border bg-card p-4 space-y-2"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <p className="text-sm font-medium">{title}</p>
                          <span
                            className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium border ${badgeClass}`}
                          >
                            {badge}
                          </span>
                        </div>
                        <p className="text-xs text-muted-foreground leading-snug">
                          {description}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              </>
            );
          })()}
        </div>
      )}
    </PageWrapper>
  );
}
