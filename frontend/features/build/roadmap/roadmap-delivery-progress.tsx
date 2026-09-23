"use client";

import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { useRoadmapItemSignals } from "@/hooks/api/build/roadmap";
import { ROADMAP_DELIVERY_SOURCE_LABEL } from "./roadmap-constants";

interface RoadmapDeliveryProgressProps {
  roadmapItemId: number;
}

export function RoadmapDeliveryProgress({ roadmapItemId }: RoadmapDeliveryProgressProps) {
  const { data, isLoading, isError } = useRoadmapItemSignals(roadmapItemId);

  if (isLoading)
    return (
      <div className="space-y-2 rounded-lg border border-border bg-muted/30 px-3 py-2.5">
        <Skeleton className="h-3 w-24" />
        <Skeleton className="h-2 w-full" />
      </div>
    );

  if (isError || !data) return null;

  const { delivery, demand } = data;
  const sourceLabel = ROADMAP_DELIVERY_SOURCE_LABEL[delivery.source];

  return (
    <div className="space-y-2 rounded-lg border border-border bg-muted/30 px-3 py-2.5">
      <div className="flex items-center justify-between gap-2">
        <p className="text-sm font-medium text-foreground">Delivery progress</p>
        <span className="text-xs text-muted-foreground">{sourceLabel}</span>
      </div>
      {delivery.progressPercent === null ? (
        <p className="text-xs text-muted-foreground">
          No delivery work is linked yet, so progress cannot be calculated.
        </p>
      ) : (
        <div className="space-y-1.5">
          <Progress value={delivery.progressPercent} />
          <p className="text-xs tabular-nums text-muted-foreground">
            {delivery.completedTicketCount} of {delivery.countedTicketCount} tickets done
            {" · "}
            {delivery.progressPercent}%
          </p>
        </div>
      )}
      <p className="text-xs tabular-nums text-muted-foreground">
        {demand.linkedFeedbackCount} linked feedback ({demand.openLinkedFeedbackCount} open)
        {" · "}
        {demand.votes} votes
      </p>
    </div>
  );
}
