"use client";

import { EmptyState } from "@/components/ui/empty-state";
import type { ManagedProductRelease } from "@/hooks/api/build/managed-product-releases";
import { formatCalendarDate } from "@/lib/date-utils";
import { statusToneClasses } from "@/lib/design-tokens";
import { cn } from "@/lib/utils";
import { ReleaseIdentity, ReleaseSection } from "./release-list-parts";
import { ReleaseRowActions } from "./release-row-actions";

interface ReleaseShippedTimelineProps {
  releases: readonly ManagedProductRelease[];
  count: string;
  className?: string;
}

const SHIPPED_DOT_CLASS = statusToneClasses("success").fill;

export function ReleaseShippedTimeline({ releases, count, className }: ReleaseShippedTimelineProps) {
  return (
    <ReleaseSection id="releases-shipped" title="Shipped" count={count} className={className}>
      {releases.length === 0 ? (
        <EmptyState
          compact
          bare
          title="Nothing shipped yet"
          description="Releases marked as released build a timeline here, newest first."
        />
      ) : (
        <ol aria-label="Shipped releases" className="flex flex-col px-4 pt-4">
          {releases.map((release, index) => (
            <li key={release.id} className="flex gap-3">
              <div aria-hidden="true" className="flex flex-col items-center pt-1.5">
                <span className={cn("size-2.5 shrink-0 rounded-full", SHIPPED_DOT_CLASS)} />
                {index < releases.length - 1 ? <span className="mt-1 w-px flex-1 bg-border" /> : null}
              </div>
              <div className="flex min-w-0 flex-1 flex-col gap-1 pb-5">
                <div className="flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between sm:gap-3">
                  <div className="flex min-w-0 flex-col gap-1">
                    <ReleaseIdentity release={release} />
                    {release.releaseDate ? (
                      <time dateTime={release.releaseDate} className="text-xs text-muted-foreground">
                        {formatCalendarDate(release.releaseDate)}
                      </time>
                    ) : (
                      <span className="text-xs text-muted-foreground">No release date</span>
                    )}
                  </div>
                  <ReleaseRowActions release={release} />
                </div>
                {release.description ? (
                  <p className="line-clamp-3 whitespace-pre-line text-sm text-muted-foreground">
                    {release.description}
                  </p>
                ) : null}
              </div>
            </li>
          ))}
        </ol>
      )}
    </ReleaseSection>
  );
}
