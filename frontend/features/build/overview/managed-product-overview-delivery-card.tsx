"use client";

import { useMemo } from "react";
import Link from "next/link";
import { MapPinnedIcon } from "@animateicons/react/lucide";
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
  type OverviewSegment,
} from "./overview-metric";
import { countdownLabel, percentOf, wholeDaysUntil } from "./overview-signals";

interface DeliveryCardProps {
  managedProductId: number;
  delivery: ManagedProductSummary["delivery"];
  previews: ManagedProductSummary["previews"];
  now: Date;
  ret?: string;
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

function HorizonBoard({ segments }: { segments: ReadonlyArray<OverviewSegment> }) {
  const total = segments.reduce((sum, segment) => sum + segment.value, 0);
  return (
    <ul
      aria-label="Roadmap by horizon"
      className="grid grid-cols-4 overflow-hidden rounded-lg border border-border bg-muted dark:border-background"
    >
      {segments.map((segment) => {
        const active = segment.value > 0;
        const share = total > 0 ? (segment.value / total) * 100 : 0;
        return (
          <li
            key={segment.id}
            className={cn(
              "flex min-w-0 flex-col gap-2 border-r border-border px-1.5 py-2.5 last:border-r-0 dark:border-background sm:px-3",
              active && "bg-card",
            )}
          >
            <span className="flex min-w-0 items-center gap-1.5 text-micro text-muted-foreground sm:text-xs">
              <span aria-hidden className={cn("hidden size-1.5 shrink-0 rounded-full sm:block", segment.fillClassName)} />
              <span className="min-w-0">{segment.label}</span>
            </span>
            <span
              className={cn(
                "font-mono text-xl font-semibold tabular-nums leading-none sm:text-2xl",
                active ? "text-foreground" : "text-muted-foreground",
              )}
            >
              {segment.value}
            </span>
            <span aria-hidden className="mt-auto h-1.5 overflow-hidden rounded-full bg-background">
              <span
                className={cn("block h-full rounded-full", segment.fillClassName)}
                style={{ width: `${share}%` }}
              />
            </span>
          </li>
        );
      })}
    </ul>
  );
}

function NextRelease({
  managedProductId,
  release,
  now,
  ret,
}: {
  managedProductId: number;
  release: NonNullable<ManagedProductSummary["delivery"]["nextRelease"]>;
  now: Date;
  ret?: string;
}) {
  const days = release.releaseDate ? wholeDaysUntil(release.releaseDate, now) : null;
  return (
    <Link
      href={`/build/managed-products/${managedProductId}/releases${ret ? `?ret=${ret}` : ""}`}
      className="flex min-h-11 min-w-0 items-center gap-3 rounded-lg border border-border bg-muted px-3 py-2.5 transition-colors hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring dark:border-background"
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
  ret,
}: DeliveryCardProps) {
  const base = `/build/managed-products/${managedProductId}`;
  const retSuffix = ret ? `?ret=${ret}` : "";
  const nowNextItems = previews.roadmap.filter(
    (item) => item.horizon === "now" || item.horizon === "next",
  );
  const ticketPct = percentOf(delivery.ticketTotals.done, delivery.ticketTotals.total);
  const segments = useMemo(
    () => [
      { id: "now", label: "Now", value: delivery.roadmapByHorizon.now, fillClassName: "bg-primary" },
      { id: "next", label: "Next", value: delivery.roadmapByHorizon.next, fillClassName: statusToneClasses("info").fill },
      { id: "later", label: "Later", value: delivery.roadmapByHorizon.later, fillClassName: "bg-muted-foreground" },
      {
        id: "completed",
        label: "Completed",
        value: delivery.roadmapCompleted,
        fillClassName: statusToneClasses("success").fill,
      },
    ],
    [delivery.roadmapByHorizon.now, delivery.roadmapByHorizon.next, delivery.roadmapByHorizon.later, delivery.roadmapCompleted],
  );

  return (
    <OverviewPanel
      title="Delivery progress"
      description="Roadmap distribution and execution across linked projects."
      action={<OverviewSectionLink href={`${base}/roadmap${retSuffix}`} icon={MapPinnedIcon}>View roadmap</OverviewSectionLink>}
    >
      <HorizonBoard segments={segments} />

      <div className="flex flex-col gap-3 rounded-lg border border-border bg-muted px-3 py-3 dark:border-background">
        <div className="flex items-end justify-between gap-3">
          <div className="flex min-w-0 flex-col gap-0.5">
            <p className="text-xs text-muted-foreground">Ticket progress</p>
            <p className="text-sm font-medium text-foreground">
              {ticketProgressLabel(delivery.ticketTotals.done, delivery.ticketTotals.total)}
            </p>
          </div>
          <p className="font-mono text-2xl font-semibold tabular-nums leading-none text-foreground">
            {ticketPct === null ? "—" : `${ticketPct}%`}
          </p>
        </div>
        <OverviewMeter
          label="Ticket progress"
          percent={ticketPct ?? 0}
          fillClassName={statusToneClasses("success").fill}
        />
        <Link
          href={`${base}/projects${retSuffix}`}
          className="flex min-h-11 items-center justify-between gap-3 border-t border-border pt-2 text-sm transition-colors hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring motion-reduce:transition-none dark:border-background sm:min-h-9"
        >
          <span className="text-muted-foreground">Across linked projects</span>
          <span className="font-mono tabular-nums text-primary">
            {delivery.linkedProjects} {delivery.linkedProjects === 1 ? "project" : "projects"}
          </span>
        </Link>
      </div>

      {delivery.nextRelease ? (
        <NextRelease managedProductId={managedProductId} release={delivery.nextRelease} now={now} ret={ret} />
      ) : null}

      {nowNextItems.length > 0 ? (
        <div className="flex flex-col gap-1">
          <p className="text-xs font-medium text-muted-foreground">Now and next</p>
          <div>
            {nowNextItems.map((item) => (
              <OverviewRecordLink
                key={item.id}
                href={`${base}/roadmap?horizon=${encodeURIComponent(item.horizon)}${ret ? `&ret=${ret}` : ""}`}
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
              href={`${base}/releases${retSuffix}`}
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
