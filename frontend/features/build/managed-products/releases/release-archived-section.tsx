"use client";

import { EmptyState } from "@/components/ui/empty-state";
import type { ManagedProductRelease } from "@/hooks/api/build/managed-product-releases";
import { formatCalendarDate } from "@/lib/date-utils";
import { ReleaseIdentity, ReleaseSection } from "./release-list-parts";
import { ReleaseRowActions } from "./release-row-actions";

interface ReleaseArchivedSectionProps {
  releases: readonly ManagedProductRelease[];
  count: string;
}

function ArchivedReleaseRow({ release }: { release: ManagedProductRelease }) {
  return (
    <li className="flex flex-col gap-2 px-4 py-3 hover:bg-muted/50 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex min-w-0 flex-col gap-1">
        <ReleaseIdentity release={release} />
        <span className="text-dense text-muted-foreground">
          {release.releaseDate ? (
            <time dateTime={release.releaseDate} className="font-mono tabular-nums">
              {formatCalendarDate(release.releaseDate)}
            </time>
          ) : (
            "No release date"
          )}
        </span>
      </div>
      <ReleaseRowActions release={release} />
    </li>
  );
}

export function ReleaseArchivedSection({ releases, count }: ReleaseArchivedSectionProps) {
  return (
    <ReleaseSection
      id="releases-archived"
      title="Archived"
      description="Hidden from Upcoming and Shipped. Restore to edit again."
      count={count}
    >
      {releases.length === 0 ? (
        <EmptyState
          compact
          bare
          illustrationSize="xs"
          title="No archived releases"
          description="Archive a release to move it out of the active lists. You can restore it as a draft later."
        />
      ) : (
        <ul aria-label="Archived releases" className="flex flex-col divide-y divide-border">
          {releases.map((release) => (
            <ArchivedReleaseRow key={release.id} release={release} />
          ))}
        </ul>
      )}
    </ReleaseSection>
  );
}
