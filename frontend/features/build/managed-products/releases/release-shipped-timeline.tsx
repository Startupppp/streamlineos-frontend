"use client";

import { EmptyState } from "@/components/ui/empty-state";
import type { ManagedProductRelease } from "@/hooks/api/build/managed-product-releases";
import { formatCalendarDate } from "@/lib/date-utils";
import { statusToneClasses } from "@/lib/design-tokens";
import { cn } from "@/lib/utils";
import { useReleaseActions } from "./release-actions-context";
import { EvidenceLink, OwnerIndicator, QaStateBadge, ReleaseIdentity, ReleaseSection } from "./release-list-parts";
import { ReleaseRowActions } from "./release-row-actions";

interface ReleaseShippedTimelineProps {
  releases: readonly ManagedProductRelease[];
  count: string;
  className?: string;
}

const SHIPPED_DOT_CLASS = statusToneClasses("success").fill;

function ShippedReleaseItem({
  release,
  showRail,
}: {
  release: ManagedProductRelease;
  showRail: boolean;
}) {
  return (
    <li
      data-slot="shipped-release-card"
      className="group flex gap-2.5 rounded-lg border border-border bg-muted/20 p-3 shadow-xs transition-[background-color,border-color,box-shadow] hover:border-border hover:bg-muted/35 hover:shadow-sm motion-reduce:transition-none dark:border-background dark:bg-muted/40 dark:hover:bg-muted/55"
    >
      <div className="flex w-20 shrink-0 flex-col pt-0.5 sm:w-24">
        {release.releaseDate ? (
          <time dateTime={release.releaseDate} className="font-mono text-dense tabular-nums text-muted-foreground">
            {formatCalendarDate(release.releaseDate)}
          </time>
        ) : (
          <span className="text-dense text-muted-foreground">No date</span>
        )}
      </div>
      <div aria-hidden="true" className="flex flex-col items-center pt-1.5">
        <span className={cn("size-2.5 shrink-0 rounded-full", SHIPPED_DOT_CLASS)} />
        {showRail ? <span className="mt-1 w-px flex-1 bg-border" /> : null}
      </div>
      <div className="flex min-w-0 flex-1 flex-col gap-1.5">
        <div className="flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between sm:gap-3">
          <ReleaseIdentity release={release} />
          <ReleaseRowActions release={release} />
        </div>
        {release.description ? (
          <p className="line-clamp-3 max-w-[65ch] whitespace-pre-line text-sm text-pretty text-muted-foreground">
            {release.description}
          </p>
        ) : null}
        {(release.qaState || release.deploymentEvidenceUrl || release.ownerUserId) ? (
          <div className="flex flex-wrap items-center gap-2 text-dense text-muted-foreground">
            <QaStateBadge qaState={release.qaState} />
            <OwnerIndicator ownerUserId={release.ownerUserId} ownerUser={release.ownerUser} />
            <EvidenceLink url={release.deploymentEvidenceUrl} />
          </div>
        ) : null}
      </div>
    </li>
  );
}

export function ReleaseShippedTimeline({ releases, count, className }: ReleaseShippedTimelineProps) {
  const { canUpdate, onCreate } = useReleaseActions();
  const lastIndex = releases.length - 1;

  return (
    <ReleaseSection
      id="releases-shipped"
      title="Shipped"
      description="Released versions, newest first"
      count={count}
      className={className}
    >
      {releases.length === 0 ? (
        <EmptyState
          compact
          bare
          illustrationSize="xs"
          title="Nothing shipped yet"
          description="Mark a draft released to start this product's ship history."
          action={canUpdate ? { label: "New release", onClick: onCreate } : undefined}
        />
      ) : (
        <ol aria-label="Shipped releases" className="flex min-h-full flex-col gap-2 p-2">
          {releases.map((release, index) => (
            <ShippedReleaseItem key={release.id} release={release} showRail={index < lastIndex} />
          ))}
        </ol>
      )}
    </ReleaseSection>
  );
}
