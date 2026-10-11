"use client";

import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import type { ManagedProductRelease } from "@/hooks/api/build/managed-product-releases";
import { formatCalendarDate } from "@/lib/date-utils";
import { statusToneClasses } from "@/lib/design-tokens";
import { cn } from "@/lib/utils";
import { releaseCountdown } from "./product-releases-model";
import { ReleaseIdentity, ReleaseSection } from "./release-list-parts";
import { ReleaseRowActions } from "./release-row-actions";

interface ReleaseUpcomingSectionProps {
  releases: readonly ManagedProductRelease[];
  count: string;
  now: Date;
  className?: string;
}

function UpcomingSchedule({ releaseDate, now }: { releaseDate: string | null; now: Date }) {
  if (!releaseDate) return <span>No date set</span>;
  const countdown = releaseCountdown(releaseDate, now);
  const tone = statusToneClasses(countdown.tone);
  return (
    <>
      <time dateTime={releaseDate}>{formatCalendarDate(releaseDate)}</time>
      <Badge variant="outline" className={cn("h-5 py-0 text-micro", tone.surface, tone.ink, tone.rule)}>
        {countdown.label}
      </Badge>
    </>
  );
}

export function ReleaseUpcomingSection({ releases, count, now, className }: ReleaseUpcomingSectionProps) {
  return (
    <ReleaseSection id="releases-upcoming" title="Upcoming" count={count} className={className}>
      {releases.length === 0 ? (
        <EmptyState
          compact
          bare
          title="Nothing planned"
          description="Draft releases appear here, soonest first."
        />
      ) : (
        <ul aria-label="Upcoming releases" className="flex flex-col divide-y divide-border">
          {releases.map((release) => (
            <li
              key={release.id}
              className="flex flex-col gap-2 px-4 py-3 sm:flex-row sm:items-center sm:justify-between"
            >
              <div className="flex min-w-0 flex-col gap-1">
                <ReleaseIdentity release={release} />
                <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                  <UpcomingSchedule releaseDate={release.releaseDate} now={now} />
                </div>
              </div>
              <ReleaseRowActions release={release} />
            </li>
          ))}
        </ul>
      )}
    </ReleaseSection>
  );
}
