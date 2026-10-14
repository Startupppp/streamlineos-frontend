"use client";

import { CalendarClock, Flag, UserRound } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import type { ManagedProductSummary } from "@/hooks/api/build/managed-product-summary";
import { statusToneClasses } from "@/lib/design-tokens";
import { formatShortDate } from "@/lib/date-utils";
import { getUserDisplayName, getUserInitials } from "@/lib/person-display";
import { cn } from "@/lib/utils";
import {
  HEALTH_PRESENTATION,
  LIFECYCLE_STAGES,
  countdownLabel,
  wholeDaysUntil,
} from "./overview-signals";

interface HeroProps {
  product: ManagedProductSummary["product"];
  now: Date;
}

function LifecycleTrack({ lifecycle }: { lifecycle: ManagedProductSummary["product"]["lifecycle"] }) {
  const currentIndex = LIFECYCLE_STAGES.findIndex((stage) => stage.id === lifecycle);
  const lastIndex = LIFECYCLE_STAGES.length - 1;
  return (
    <ol aria-label="Lifecycle stage" className="grid grid-cols-5 gap-1">
      {LIFECYCLE_STAGES.map((stage, index) => {
        const isCurrent = index === currentIndex;
        const isPast = index < currentIndex;
        return (
          <li
            key={stage.id}
            aria-current={isCurrent ? "step" : undefined}
            className="relative flex min-w-0 flex-col items-center gap-2 text-center"
          >
            <span className="relative flex h-3 w-full items-center justify-center">
              {index < lastIndex ? (
                <span
                  aria-hidden
                  className={cn(
                    "absolute top-1/2 left-1/2 h-px w-full -translate-y-1/2",
                    index < currentIndex ? "bg-primary" : "bg-border",
                  )}
                />
              ) : null}
              <span
                aria-hidden
                className={cn(
                  "relative z-10 rounded-full",
                  isCurrent
                    ? "size-3 bg-primary ring-4 ring-primary/20"
                    : isPast
                      ? "size-2.5 bg-primary"
                      : "size-2.5 border-2 border-border bg-background",
                )}
              />
            </span>
            <span
              className={cn(
                "max-w-full text-balance text-xs leading-tight",
                isCurrent ? "font-semibold text-foreground" : isPast ? "font-medium text-foreground" : "text-muted-foreground",
              )}
            >
              {stage.label}
            </span>
          </li>
        );
      })}
    </ol>
  );
}

function HealthPill({ health }: { health: ManagedProductSummary["product"]["health"] }) {
  const presentation = HEALTH_PRESENTATION[health];
  const tone = statusToneClasses(presentation.tone);
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium",
        tone.surface,
        tone.ink,
        tone.rule,
      )}
    >
      <span aria-hidden className={cn("size-1.5 rounded-full", tone.fill)} />
      {presentation.label}
    </span>
  );
}

function LaunchFact({ targetLaunchDate, now }: { targetLaunchDate: string | null; now: Date }) {
  if (!targetLaunchDate) {
    return <span className="text-sm text-muted-foreground">Not scheduled</span>;
  }
  const days = wholeDaysUntil(targetLaunchDate, now);
  return (
    <span className="flex flex-col items-end gap-0.5 sm:items-start">
      <span className="text-sm font-medium text-foreground">{formatShortDate(targetLaunchDate)}</span>
      {days !== null ? (
        <span className={cn("text-xs", days < 0 ? statusToneClasses("danger").ink : "text-muted-foreground")}>
          {countdownLabel(days)}
        </span>
      ) : null}
    </span>
  );
}

function OwnerFact({ owner }: { owner: ManagedProductSummary["product"]["owner"] }) {
  if (!owner) {
    return (
      <span className="flex items-center gap-2 text-sm text-muted-foreground">
        <span
          aria-hidden
          className="flex size-7 items-center justify-center rounded-full bg-muted text-muted-foreground"
        >
          <UserRound className="size-3.5" />
        </span>
        Unassigned
      </span>
    );
  }
  const name = getUserDisplayName(owner);
  return (
    <span className="flex min-w-0 items-center gap-2">
      <Avatar className="size-7">
        {owner.image ? <AvatarImage src={owner.image} alt="" /> : null}
        <AvatarFallback className="text-micro">{getUserInitials(owner)}</AvatarFallback>
      </Avatar>
      <span className="min-w-0 truncate text-sm font-medium text-foreground">{name}</span>
    </span>
  );
}

export function ManagedProductOverviewHero({ product, now }: HeroProps) {
  const labels = [...product.segments, ...product.tags];
  const lead = product.vision ?? product.description;
  return (
    <section
      aria-label="Product identity"
      className="flex min-w-0 flex-col overflow-hidden rounded-xl border border-border bg-card"
    >
      <div className="flex min-w-0 flex-col gap-4 p-3.5 sm:p-4">
      <div className="flex min-w-0 flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex min-w-0 max-w-3xl flex-col gap-1.5">
          <p
            className={cn(
              "text-balance leading-snug",
              lead ? "text-base font-medium text-foreground sm:text-lg" : "text-sm text-muted-foreground",
            )}
          >
            {lead ?? "No description yet. Explain what this product is for in product settings."}
          </p>
          {product.vision && product.description ? (
            <p className="max-w-prose text-pretty text-sm text-muted-foreground">{product.description}</p>
          ) : null}
        </div>
        <div className="flex shrink-0 flex-wrap items-center gap-2">
          <HealthPill health={product.health} />
          {product.status === "archived" ? (
            <Badge variant="outline" className="text-xs">
              Archived
            </Badge>
          ) : null}
        </div>
      </div>
      <dl className="grid grid-cols-1 overflow-hidden rounded-lg border border-border bg-muted dark:border-background sm:grid-cols-3 sm:divide-x sm:divide-border">
        <div className="flex min-w-0 items-center justify-between gap-3 border-b border-border px-3 py-2.5 dark:border-background sm:flex-col sm:items-start sm:justify-start sm:border-b-0">
          <dt className="text-xs text-muted-foreground">Owner</dt>
          <dd className="min-w-0">
            <OwnerFact owner={product.owner} />
          </dd>
        </div>
        <div className="flex items-center justify-between gap-3 border-b border-border px-3 py-2.5 dark:border-background sm:flex-col sm:items-start sm:justify-start sm:border-b-0">
          <dt className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <CalendarClock aria-hidden className="size-3.5" />
            Target launch
          </dt>
          <dd>
            <LaunchFact targetLaunchDate={product.targetLaunchDate} now={now} />
          </dd>
        </div>
        <div className="flex items-center justify-between gap-3 px-3 py-2.5 sm:flex-col sm:items-start sm:justify-start">
          <dt className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Flag aria-hidden className="size-3.5" />
            Current phase
          </dt>
          <dd className={cn("min-w-0 break-words text-right text-sm sm:text-left", product.currentPhase ? "font-medium text-foreground" : "text-muted-foreground")}>
            {product.currentPhase ?? "Not set"}
          </dd>
        </div>
      </dl>
      {labels.length > 0 ? (
        <ul aria-label="Segments and tags" className="flex flex-wrap gap-1.5">
          {product.segments.map((segment) => (
            <li key={`segment-${segment}`}>
              <Badge variant="secondary" className="text-xs">
                {segment}
              </Badge>
            </li>
          ))}
          {product.tags.map((tag) => (
            <li key={`tag-${tag}`}>
              <Badge variant="outline" className="text-xs">
                #{tag}
              </Badge>
            </li>
          ))}
        </ul>
      ) : null}
      </div>
      <div className="flex flex-col gap-3 border-t border-border px-3.5 py-3 sm:px-4">
        <p className="text-xs text-muted-foreground">Lifecycle</p>
        <LifecycleTrack lifecycle={product.lifecycle} />
      </div>
    </section>
  );
}
