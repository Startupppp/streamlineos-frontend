"use client";

import { type ComponentType, type ReactNode } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { DownloadIcon } from "@animateicons/react/lucide";
import { useAnimatedIcon } from "@/hooks/common/use-animated-icon";
import { PmPageShell, PM_PANEL } from "@/components/pm-chrome";
import { cn } from "@/lib/utils";

export const CR_STATUS_LABELS: Record<string, string> = {
  submitted: "Submitted",
  under_review: "Under Review",
  estimated: "Estimated",
  awaiting_approval: "Awaiting Approval",
  approved: "Approved",
  rejected: "Rejected",
  in_progress: "In Progress",
  completed: "Completed",
};

export const CR_STATUS_STYLES: Record<string, string> = {
  submitted: "text-muted-foreground border-border bg-muted/40",
  under_review:
    "text-status-info-ink-strong border-status-info-rule bg-status-info-surface",
  estimated:
    "text-status-warning-ink-strong border-status-warning-rule bg-status-warning-surface",
  awaiting_approval:
    "text-status-warning-ink-strong border-status-warning-rule bg-status-warning-surface",
  approved:
    "text-status-success-ink-strong border-status-success-rule bg-status-success-surface",
  rejected:
    "text-status-danger-ink-strong border-status-danger-rule bg-status-danger-surface",
  in_progress:
    "text-status-info-ink-strong border-status-info-rule bg-status-info-surface",
  completed:
    "text-status-success-ink-strong border-status-success-rule bg-status-success-surface",
};

export function SectionTitle({
  icon: Icon,
  title,
  actions,
}: {
  icon: ComponentType<{ className?: string }>;
  title: string;
  actions?: ReactNode;
}) {
  return (
    <div className="mb-2 flex min-w-0 items-center justify-between gap-2">
      <div className="flex min-w-0 items-center gap-2">
        <Icon className="h-4 w-4 shrink-0 text-muted-foreground" />
        <h2 className="text-sm font-medium text-foreground">{title}</h2>
      </div>
      {actions}
    </div>
  );
}

export function DownloadLink({ href }: { href: string }) {
  const { iconRef, hoverHandlers } = useAnimatedIcon();
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="flex shrink-0 items-center gap-1 text-micro text-primary hover:underline"
      {...hoverHandlers}
    >
      <DownloadIcon ref={iconRef} size={12} />
      Download
    </a>
  );
}

export function DashboardSkeleton() {
  return (
    <PmPageShell>
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="space-y-2">
          <Skeleton className="h-5 w-36" />
          <div className={cn(PM_PANEL, "space-y-2 p-2")}>
            {Array.from({ length: 6 }).map((_, j) => (
              <Skeleton key={j} className="h-10 w-full rounded-lg" />
            ))}
          </div>
        </div>
      ))}
    </PmPageShell>
  );
}
