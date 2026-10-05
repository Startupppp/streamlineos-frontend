"use client";

import { Skeleton } from "@/components/ui/skeleton";
import { StatCardGridSkeleton } from "@/components/ui/stat-card";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { PmPageShell } from "@/components/pm-chrome";

export function MilestonesPageSkeleton() {
  return (
    <PageWrapper
      title="Milestones"
      actions={<Skeleton className="h-8 w-36 rounded-md" />}
    >
      <PmPageShell>
        <div className="space-y-4">
          <StatCardGridSkeleton cols={4} />
          <div className="space-y-2.5">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-20 rounded-xl" />
            ))}
          </div>
        </div>
      </PmPageShell>
    </PageWrapper>
  );
}
