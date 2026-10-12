"use client";

import { useState, useMemo, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useFeedbucketWidgets } from "@/hooks/api/feedbucket/use-feedbucket-widgets";
import { FeedbucketCollectDialog } from "./feedback/feedbucket-collect-dialog";

interface ProductSettingsFeedbackChannelsSectionProps {
  managedProductId: number;
}

export function ProductSettingsFeedbackChannelsSection({
  managedProductId,
}: ProductSettingsFeedbackChannelsSectionProps) {
  const [collectOpen, setCollectOpen] = useState(false);
  const { data: widgets, isLoading } = useFeedbucketWidgets();

  const productWidgets = useMemo(
    () =>
      (widgets ?? []).filter(
        (w) => w.managedProductId === managedProductId && !w.deletedAt,
      ),
    [widgets, managedProductId],
  );

  const handleOpenCollect = useCallback(() => {
    setCollectOpen(true);
  }, []);

  const handleCollectOpenChange = useCallback((open: boolean) => {
    setCollectOpen(open);
  }, []);

  if (isLoading) {
    return (
      <section
        aria-labelledby="feedback-channels-heading"
        className="flex flex-col gap-3"
      >
        <h2
          id="feedback-channels-heading"
          className="text-sm font-semibold text-foreground"
        >
          Feedback channels
        </h2>
        <Skeleton className="h-10 w-full" />
      </section>
    );
  }

  return (
    <section
      aria-labelledby="feedback-channels-heading"
      className="flex flex-col gap-3"
    >
      <div className="flex items-center justify-between">
        <h2
          id="feedback-channels-heading"
          className="text-sm font-semibold text-foreground"
        >
          Feedback channels
        </h2>
        <Button
          type="button"
          size="sm"
          variant="outline"
          onClick={handleOpenCollect}
        >
          Configure Feedbucket
        </Button>
      </div>
      {productWidgets.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          No Feedbucket widgets are linked to this product yet.
        </p>
      ) : (
        <ul className="flex flex-col gap-2">
          {productWidgets.map((widget) => (
            <li
              key={widget.id}
              className="flex items-center justify-between rounded-md border border-border px-3 py-2 text-sm"
            >
              <span className="font-medium text-foreground">{widget.name}</span>
              <Badge variant={widget.isActive ? "default" : "secondary"}>
                {widget.isActive ? "Active" : "Inactive"}
              </Badge>
            </li>
          ))}
        </ul>
      )}
      <FeedbucketCollectDialog
        managedProductId={managedProductId}
        open={collectOpen}
        onOpenChange={handleCollectOpenChange}
      />
    </section>
  );
}
