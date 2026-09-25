"use client";

import { Skeleton } from "@/components/ui/skeleton";
import { useKbSpaceArchiveImpact } from "@/hooks/api/kb/spaces";

interface SpaceArchiveImpactProps {
  spaceId: number;
}

export function SpaceArchiveImpact({ spaceId }: SpaceArchiveImpactProps) {
  const { data, isLoading, isError } = useKbSpaceArchiveImpact(spaceId, {
    enabled: true,
  });

  if (isLoading) {
    return <Skeleton className="mt-2 block h-4 w-3/4" />;
  }

  if (isError || !data) {
    return null;
  }

  const parts = [
    `${data.pageCount} ${data.pageCount === 1 ? "page" : "pages"}`,
    `${data.publicLinkCount} public ${data.publicLinkCount === 1 ? "link" : "links"}`,
    `${data.recordLinkCount} record ${data.recordLinkCount === 1 ? "link" : "links"}`,
  ];

  if (data.askIndexed) {
    parts.push("indexed for Ask");
  }

  return (
    <span className="mt-2 block text-xs text-muted-foreground tabular-nums">
      This affects {parts.join(" · ")}.
    </span>
  );
}
