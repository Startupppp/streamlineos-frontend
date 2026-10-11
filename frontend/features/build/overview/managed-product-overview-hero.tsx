"use client";

import { CalendarClock, Flag } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import type { ManagedProductSummary } from "@/hooks/api/build/managed-product-summary";
import { statusToneClasses } from "@/lib/design-tokens";
import { formatShortDate } from "@/lib/date-utils";
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
  return (
    <ol aria-label="Lifecycle stage" className="grid grid-cols-5 gap-1.5">
      {LIFECYCLE_STAGES.map((stage, index) => {
        const isCurrent = index === currentIndex;
        const isPast = index < currentIndex;
        return (
          <li
            key={stage.id}
            aria-current={isCurrent ? "step" : undefined}
            className="flex min-w-0 flex-col gap-1.5"
          >
            <span
              aria-hidden
              className={cn(
                "h-1.5 rounded-full",
                isCurrent ? "bg-primary" : isPast ? "bg-primary/35" : "bg-muted",
              )}
            />
            <span
              className={cn(
                "truncate text-xs",
                isCurrent ? "font-semibold text-foreground" : "text-muted-foreground",
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

export function ManagedProductOverviewHero({ product, now }: HeroProps) {
  const labels = [...product.segments, ...product.tags];
  return (
    <section
      aria-label="Product identity"
      className="flex min-w-0 flex-col gap-5 rounded-xl border border-border bg-card p-4 sm:p-5"
    >
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="flex min-w-0 max-w-prose flex-col gap-2">
          <div className="flex flex-wrap items-center gap-2">
            <HealthPill health={product.health} />
            {product.status === "archived" ? (
              <Badge variant="outline" className="text-xs">
                Archived
              </Badge>
            ) : null}
          </div>
          <p className={cn("text-pretty text-sm", product.description ? "text-foreground" : "text-muted-foreground")}>
            {product.description ?? "No description yet. Explain what this product is for in product settings."}
          </p>
        </div>
        <dl className="grid shrink-0 grid-cols-1 gap-3 sm:grid-cols-2 lg:w-80">
          <div className="flex items-start justify-between gap-3 sm:flex-col sm:justify-start sm:gap-1">
            <dt className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <CalendarClock aria-hidden className="size-3.5" />
              Target launch
            </dt>
            <dd>
              <LaunchFact targetLaunchDate={product.targetLaunchDate} now={now} />
            </dd>
          </div>
          <div className="flex items-start justify-between gap-3 sm:flex-col sm:justify-start sm:gap-1">
            <dt className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <Flag aria-hidden className="size-3.5" />
              Current phase
            </dt>
            <dd className={cn("text-sm", product.currentPhase ? "font-medium text-foreground" : "text-muted-foreground")}>
              {product.currentPhase ?? "Not set"}
            </dd>
          </div>
        </dl>
      </div>
      <LifecycleTrack lifecycle={product.lifecycle} />
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
    </section>
  );
}
