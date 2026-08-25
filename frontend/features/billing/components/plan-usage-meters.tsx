"use client";

import Link from "next/link";
import { AlertCircle } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useEntitlements, type EntitlementLimit } from "@/hooks/api/entitlements";

const LIMIT_LABELS: Record<string, string> = {
  members: "Members",
  projects: "Projects",
  kbPages: "KB Pages",
  chatChannels: "Chat Channels",
  crmLeads: "CRM Leads",
  crmContacts: "CRM Contacts",
  crmDeals: "CRM Deals",
  supportTickets: "Support Tickets",
  automations: "Automations",
  signEnvelopes: "Sign Envelopes",
  surveys: "Surveys",
  acctInvoices: "Accounting Invoices",
};

function UsageMeter({ label, entry }: { label: string; entry: EntitlementLimit }) {
  const isUnlimited = entry.limit === null;
  const pct = isUnlimited ? 0 : Math.min(100, Math.round((entry.used / (entry.limit ?? 1)) * 100));

  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-xs">
        <span className="text-muted-foreground">{label}</span>
        <span className="font-medium text-foreground tabular-nums">
          {isUnlimited ? (
            <span className="text-muted-foreground">Unlimited</span>
          ) : (
            `${entry.used} / ${entry.limit}`
          )}
        </span>
      </div>
      {!isUnlimited && (
        <Progress
          value={pct}
          aria-label={`${label} usage: ${entry.used} of ${entry.limit ?? "unlimited"}`}
          className={`h-1.5 ${pct >= 100 ? "[&>div]:bg-destructive" : pct >= 80 ? "[&>div]:bg-status-warning-fill" : ""}`}
        />
      )}
    </div>
  );
}

function PlanUsageSkeletons() {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="space-y-1.5">
          <div className="flex justify-between">
            <Skeleton className="h-3 w-20" />
            <Skeleton className="h-3 w-12" />
          </div>
          <Skeleton className="h-1.5 w-full" />
        </div>
      ))}
    </div>
  );
}

export function PlanUsageMetersSkeleton() {
  return (
    <div className="rounded-xl border border-border bg-card shadow-sm p-5 space-y-4">
      <Skeleton className="h-4 w-24" />
      <PlanUsageSkeletons />
    </div>
  );
}

interface PlanUsageMetersProps {
  onUpgradeClick?: () => void;
}

export function PlanUsageMeters({ onUpgradeClick }: PlanUsageMetersProps) {
  const { data, isLoading, isError } = useEntitlements();

  if (isLoading) {
    return (
      <div className="rounded-xl border border-border bg-card shadow-sm p-5 space-y-4">
        <Skeleton className="h-4 w-24" />
        <PlanUsageSkeletons />
      </div>
    );
  }

  if (isError || !data) {
    return null;
  }

  const entries = Object.entries(data.limits) as [string, EntitlementLimit][];
  const hasNearLimit = entries.some(([, e]) => {
    if (e.limit === null) return false;
    return e.used / e.limit >= 0.8;
  });

  const atLimitEntries = entries.filter(([, e]) => {
    if (e.limit === null) return false;
    return e.used >= e.limit;
  });

  return (
    <div className="rounded-xl border border-border bg-card shadow-sm p-5 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-foreground">Plan Usage</h3>
        {hasNearLimit && onUpgradeClick && (
          <Button variant="outline" size="sm" onClick={onUpgradeClick} className="text-xs h-7">
            <AlertCircle className="h-3 w-3 mr-1.5 text-status-warning-ink" />
            Upgrade plan
          </Button>
        )}
        {hasNearLimit && !onUpgradeClick && (
          <Button variant="outline" size="sm" asChild className="text-xs h-7">
            <Link href="/settings/billing?tab=plan">
              <AlertCircle className="h-3 w-3 mr-1.5 text-status-warning-ink" />
              Upgrade plan
            </Link>
          </Button>
        )}
      </div>

      {atLimitEntries.length > 0 && (
        <div className="flex items-start gap-2.5 rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2.5">
          <AlertCircle className="h-4 w-4 text-destructive mt-0.5 shrink-0" />
          <p className="text-xs text-destructive leading-snug">
            <span className="font-semibold">Limit reached:</span>{" "}
            {atLimitEntries.map(([k]) => LIMIT_LABELS[k] ?? k).join(", ")}.{" "}
            Actions that create new records will be blocked until you upgrade.
          </p>
        </div>
      )}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {entries.map(([key, entry]) => (
          <UsageMeter
            key={key}
            label={LIMIT_LABELS[key] ?? key}
            entry={entry}
          />
        ))}
      </div>
    </div>
  );
}
