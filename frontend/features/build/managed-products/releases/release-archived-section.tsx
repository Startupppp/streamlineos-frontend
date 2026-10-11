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

export function ReleaseArchivedSection({ releases, count }: ReleaseArchivedSectionProps) {
  return (
    <ReleaseSection id="releases-archived" title="Archived" count={count}>
      {releases.length === 0 ? (
        <EmptyState
          compact
          bare
          title="No archived releases"
          description="Archived releases are kept here and can be restored as drafts."
        />
      ) : (
        <ul aria-label="Archived releases" className="flex flex-col divide-y divide-border">
          {releases.map((release) => (
            <li
              key={release.id}
              className="flex flex-col gap-2 px-4 py-3 sm:flex-row sm:items-center sm:justify-between"
            >
              <div className="flex min-w-0 flex-col gap-1">
                <ReleaseIdentity release={release} />
                <span className="text-xs text-muted-foreground">
                  {release.releaseDate ? formatCalendarDate(release.releaseDate) : "No release date"}
                </span>
              </div>
              <ReleaseRowActions release={release} />
            </li>
          ))}
        </ul>
      )}
    </ReleaseSection>
  );
}
