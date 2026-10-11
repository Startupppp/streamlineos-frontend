"use client";

import Link from "next/link";
import { Rocket } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import type { ManagedProductSummary } from "@/hooks/api/build/managed-product-summary";
import { statusToneClasses } from "@/lib/design-tokens";
import { formatShortDate } from "@/lib/date-utils";
import { cn } from "@/lib/utils";
import {
  OverviewMeter,
  OverviewPanel,
  OverviewRecordLink,
  OverviewSectionLink,
  OverviewSegmentedBar,
} from "./overview-metric";
import { countdownLabel, percentOf, wholeDaysUntil } from "./overview-signals";

interface DeliveryCardProps {
  managedProductId: number;
  delivery: ManagedProductSummary["delivery"];
  previews: ManagedProductSummary["previews"];
  now: Date;
}

const HORIZON_LABEL: Readonly<Record<string, string>> = {
  now: "Now",
  next: "Next",
  later: "Later",
};

function ticketProgressLabel(done: number, total: number): string {
  if (total === 0) return "No linked work";
  return `${done}/${total} (${Math.round((done / total) * 100)}%)`;
}

function NextRelease({
  managedProductId,
  release,
  now,
}: {
  managedProductId: number;
  release: NonNullable<ManagedProductSummary["delivery"]["nextRelease"]>;
  now: Date;
}) {
  const days = release.releaseDate ? wholeDaysUntil(release.releaseDate, now) : null;
  return (
    <Link
      href={`/build/managed-products/${managedProductId}/releases`}
      className="flex min-h-11 items-center gap-3 rounded-lg border border-border bg-muted/40 px-3 py-2.5 transition-colors hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
    >
      <span aria-hidden className="flex size-8 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
        <Rocket className="size-4" />
      </span>
      <span className="flex min-w-0 flex-1 flex-col">
        <span className="text-xs text-muted-foreground">Next release</span>
        <span className="truncate text-sm font-medium text-foreground">
          {release.name} <span className="font-mono tabular-nums text-muted-foreground">{release.version}</span>
        </span>
      </span>
      <span className="flex shrink-0 flex-col items-end">
        <span className="text-xs text-muted-foreground">
          {release.releaseDate ? formatShortDate(release.releaseDate) : "No date"}
        </span>
        {days !== null ? (
          <span
            className={cn("text-xs font-medium", days < 0 ? statusToneClasses("danger").ink : "text-foreground")}
          >
            {countdownLabel(days)}
          </span>
        ) : null}
      </span>
    </Link>
  );
}

export function ManagedProductOverviewDeliveryCard({
  managedProductId,
  delivery,
  previews,
  now,
}: DeliveryCardProps) {
  const base = `/build/managed-products/${managedProductId}`;
  const nowNextItems = previews.roadmap.filter(
    (item) => item.horizon === "now" || item.horizon === "next",
  );
  const ticketPct = percentOf(delivery.ticketTotals.done, delivery.ticketTotals.total) ?? 0;
  const segments = [
    { id: "now", label: "Now", value: delivery.roadmapByHorizon.now, fillClassName: "bg-primary" },
    { id: "next", label: "Next", value: delivery.roadmapByHorizon.next, fillClassName: statusToneClasses("info").fill },
    { id: "later", label: "Later", value: delivery.roadmapByHorizon.later, fillClassName: "bg-muted-foreground/40" },
    {
      id: "completed",
      label: "Completed",
      value: delivery.roadmapCompleted,
      fillClassName: statusToneClasses("success").fill,
    },
  ];

  return (
    <OverviewPanel
      title="Delivery progress"
      description="Roadmap distribution and execution across linked projects."
      action={<OverviewSectionLink href={`${base}/roadmap`}>View roadmap</OverviewSectionLink>}
    >
      <OverviewSegmentedBar label="Roadmap by horizon" segments={segments} />

      <div className="flex flex-col gap-2">
        <div className="flex items-baseline justify-between gap-3">
          <p className="text-sm text-muted-foreground">Ticket progress</p>
          <p className="font-mono text-sm tabular-nums text-foreground">
            {ticketProgressLabel(delivery.ticketTotals.done, delivery.ticketTotals.total)}
          </p>
        </div>
        <OverviewMeter label="Ticket progress" percent={ticketPct} fillClassName={statusToneClasses("success").fill} />
        <div className="flex items-baseline justify-between gap-3">
          <p className="text-xs text-muted-foreground">Across linked projects</p>
          <Link
            href={`${base}/projects`}
            className="inline-flex min-h-11 items-center font-mono text-sm tabular-nums text-primary underline-offset-2 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring sm:min-h-0"
          >
            {delivery.linkedProjects} {delivery.linkedProjects === 1 ? "project" : "projects"}
          </Link>
        </div>
      </div>

      {delivery.nextRelease ? (
        <NextRelease managedProductId={managedProductId} release={delivery.nextRelease} now={now} />
      ) : null}

      {nowNextItems.length > 0 ? (
        <div>
          <p className="text-xs font-medium text-muted-foreground">Now and next</p>
          <div className="mt-1">
            {nowNextItems.map((item) => (
              <OverviewRecordLink
                key={item.id}
                href={`${base}/roadmap?horizon=${encodeURIComponent(item.horizon)}`}
                title={item.title}
                trailing={
                  <>
                    <span className="text-xs text-muted-foreground">{HORIZON_LABEL[item.horizon] ?? item.horizon}</span>
                    <Badge variant="outline" className="h-5 px-2 py-0.5 text-xs">
                      {item.status.replaceAll("_", " ")}
                    </Badge>
                  </>
                }
              />
            ))}
          </div>
        </div>
      ) : null}

      {previews.releases.length > 0 || previews.changelogPublished > 0 ? (
        <div className="flex flex-col gap-1">
          <div className="flex items-baseline justify-between gap-3">
            <p className="text-xs font-medium text-muted-foreground">Releases</p>
            <span className="text-xs text-muted-foreground">
              <span className="font-mono tabular-nums text-foreground">{previews.changelogPublished}</span> changelog{" "}
              {previews.changelogPublished === 1 ? "entry" : "entries"} published
            </span>
          </div>
          {previews.releases.map((release) => (
            <OverviewRecordLink
              key={release.id}
              href={`${base}/releases`}
              title={release.name}
              trailing={
                <>
                  <span className="text-xs text-muted-foreground">{release.status}</span>
                  <span className="font-mono text-xs tabular-nums text-muted-foreground">{release.version}</span>
                </>
              }
            />
          ))}
        </div>
      ) : null}
    </OverviewPanel>
  );
}
