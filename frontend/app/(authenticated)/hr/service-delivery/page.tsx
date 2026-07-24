"use client";

import Link from "next/link";
import { AlertTriangle, Info, LifeBuoy, Shield, Briefcase } from "lucide-react";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { StatCard, StatCardGrid } from "@/components/ui/stat-card";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { useCan } from "@/hooks/api/access";
import {
  useServiceDeliveryOpsInbox,
  useServiceDeliveryMyItems,
  type ServiceDeliveryItem,
  type AgingBucket,
} from "@/hooks/api/hr/service-delivery";
import { cn } from "@/lib/utils";

const BUCKET_STYLE: Record<AgingBucket, string> = {
  fresh: "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-300 dark:border-emerald-500/30",
  watch:
    "bg-amber-50 text-amber-800 border-amber-200 dark:bg-amber-500/10 dark:text-amber-300 dark:border-amber-500/30",
  overdue:
    "bg-orange-50 text-orange-800 border-orange-200 dark:bg-orange-500/10 dark:text-orange-300 dark:border-orange-500/30",
  critical:
    "bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-500/10 dark:text-rose-300 dark:border-rose-500/30",
};

const KIND_LABEL: Record<ServiceDeliveryItem["kind"], string> = {
  case: "Case",
  safety_incident: "Safety",
  helpdesk: "Helpdesk",
};

function ItemRow({ item }: { item: ServiceDeliveryItem }) {
  return (
    <Link
      href={item.href}
      className="flex flex-wrap items-start justify-between gap-2 px-3 py-2.5 hover:bg-muted/40 transition-colors border-b border-border last:border-0"
    >
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
            {KIND_LABEL[item.kind]}
          </span>
          <span className="text-[11px] font-mono text-muted-foreground">{item.ref}</span>
          <span
            className={cn(
              "inline-flex items-center rounded border px-1.5 py-0.5 text-[10px] font-medium",
              BUCKET_STYLE[item.aging.bucket],
            )}
          >
            {item.aging.bucket}
            {item.aging.slaBreached ? " · SLA" : ""}
          </span>
        </div>
        <p className="text-[13px] font-medium text-foreground mt-0.5 line-clamp-2">
          {item.title}
        </p>
        <p className="text-[11px] text-muted-foreground mt-0.5">
          {item.status}
          {item.severity ? ` · ${item.severity}` : ""} · {item.aging.ageDays}d old
        </p>
      </div>
    </Link>
  );
}

export default function ServiceDeliveryPage() {
  const canOps = useCan("hr:cases:view");
  const canMy = useCan("hr:helpdesk:view");
  const { data: ops, isLoading: opsLoading } = useServiceDeliveryOpsInbox(canOps);
  const { data: mine, isLoading: myLoading } = useServiceDeliveryMyItems(canMy && !canOps);

  const showOps = canOps;
  const data = showOps ? ops : mine;
  const isLoading = showOps ? opsLoading : myLoading;
  const items = data?.items ?? [];

  return (
    <PageWrapper
      title="Service delivery"
      subtitle={showOps ? "Unified HR ops inbox" : "My open requests"}
    >
      <div className="space-y-4">
        <div
          role="status"
          className="flex gap-2.5 rounded-lg border border-border bg-card px-3 py-2.5"
        >
          <Info className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
          <p className="text-[11px] text-muted-foreground leading-snug">
            {data?.honestyNote ??
              "Aggregates cases, safety incidents, and helpdesk tickets within your permissions."}
          </p>
        </div>

        {showOps && ops && (
          <StatCardGrid cols={4}>
            <StatCard
              label="Cases"
              value={String(ops.totals.cases)}
              icon={Briefcase}
              tone="blue"
              isLoading={opsLoading}
            />
            <StatCard
              label="Safety"
              value={String(ops.totals.safety)}
              icon={Shield}
              tone="amber"
              isLoading={opsLoading}
            />
            <StatCard
              label="Helpdesk"
              value={String(ops.totals.helpdesk)}
              icon={LifeBuoy}
              tone="default"
              isLoading={opsLoading}
            />
            <StatCard
              label="Critical / SLA"
              value={`${ops.totals.criticalAging} / ${ops.totals.slaBreached}`}
              icon={AlertTriangle}
              tone="default"
              isLoading={opsLoading}
              hint="Aging critical · SLA breached"
            />
          </StatCardGrid>
        )}

        {isLoading ? (
          <div className="space-y-2">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-14 w-full rounded-lg" />
            ))}
          </div>
        ) : items.length === 0 ? (
          <EmptyState
            title="Nothing open"
            description={
              showOps
                ? "No open cases, safety incidents, or helpdesk tickets in your view."
                : "You have no open helpdesk tickets or reported cases."
            }
            action={
              showOps
                ? { label: "Open cases", href: "/hr/cases" }
                : { label: "Helpdesk", href: "/hr/helpdesk" }
            }
          />
        ) : (
          <div className="rounded-lg border border-border bg-card overflow-hidden">
            <div className="px-3 py-2 border-b border-border flex items-center justify-between">
              <p className="text-[12px] font-semibold">
                {showOps ? "Prioritized queue" : "My open items"} ({items.length})
              </p>
              <div className="flex gap-2 text-[10px] text-muted-foreground">
                <Link href="/hr/cases" className="underline underline-offset-2">
                  Cases
                </Link>
                <Link href="/hr/safety" className="underline underline-offset-2">
                  Safety
                </Link>
                <Link href="/hr/helpdesk" className="underline underline-offset-2">
                  Helpdesk
                </Link>
              </div>
            </div>
            <div className="max-h-[32rem] overflow-y-auto">
              {items.map((item) => (
                <ItemRow key={`${item.kind}-${item.id}`} item={item} />
              ))}
            </div>
          </div>
        )}
      </div>
    </PageWrapper>
  );
}
