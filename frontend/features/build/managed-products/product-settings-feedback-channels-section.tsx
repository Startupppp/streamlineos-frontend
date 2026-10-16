"use client";

import { useState, useCallback } from "react";
import Link from "next/link";
import { PlugZap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { TablePagination } from "@/components/ui/table-pagination";
import { ErrorState } from "@/components/shared/error-state";
import { useFeedbucketWidgets } from "@/hooks/api/feedbucket/use-feedbucket-widgets";
import { FeedbucketCollectDialog } from "./feedback/feedbucket-collect-dialog";
import {
  PRODUCT_WIDGET_CURSORS_PARAM,
  useBuildCursorPager,
} from "@/features/build/shared/use-build-cursor-pager";
import { getErrorMessage } from "@/lib/get-error-message";
import { useModuleEnabled } from "@/hooks/api/access";

interface ProductSettingsFeedbackChannelsSectionProps {
  managedProductId: number;
}

export function ProductSettingsFeedbackChannelsSection({
  managedProductId,
}: ProductSettingsFeedbackChannelsSectionProps) {
  const [collectOpen, setCollectOpen] = useState(false);
  const feedbucketEnabled = useModuleEnabled("feedbucket");
  const pager = useBuildCursorPager(
    String(managedProductId),
    PRODUCT_WIDGET_CURSORS_PARAM,
  );

  const { data, isLoading, isError, error, refetch } = useFeedbucketWidgets({
    managedProductId,
    cursor: pager.cursor,
  });

  const productWidgets = data?.data ?? [];
  const hasMore = data?.pagination.hasMore ?? false;

  const handleNextPage = useCallback(() => {
    pager.goNext(data?.pagination.nextCursor);
  }, [pager, data?.pagination.nextCursor]);

  const handleOpenCollect = useCallback(() => {
    setCollectOpen(true);
  }, []);

  const handleCollectOpenChange = useCallback((open: boolean) => {
    setCollectOpen(open);
  }, []);

  const handleRetry = useCallback(() => {
    void refetch();
  }, [refetch]);

  if (!feedbucketEnabled) {
    return (
      <section aria-labelledby="feedback-channels-heading" className="flex flex-col gap-4 rounded-xl border border-border bg-card p-5">
        <div className="flex size-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
          <PlugZap className="size-5" aria-hidden />
        </div>
        <div>
          <h2 id="feedback-channels-heading" className="text-sm font-semibold text-foreground">Enable feedback channels</h2>
          <p className="mt-1 text-sm text-muted-foreground">Feedbucket is disabled for this organization. Enable it to connect widgets and collect customer feedback.</p>
        </div>
        <Button asChild size="sm" className="self-start"><Link href="/settings/modules">Open module settings</Link></Button>
      </section>
    );
  }

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
      {isError ? (
        <ErrorState
          compact
          title="Could not load feedback channels"
          description={getErrorMessage(error)}
          onRetry={handleRetry}
          error={error}
        />
      ) : productWidgets.length === 0 ? (
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

      {!isError && (productWidgets.length > 0 || pager.hasPrevious) ? (
        <TablePagination
          mode="cursor"
          rowCount={productWidgets.length}
          pageNumber={pager.pageNumber}
          hasMore={hasMore}
          hasPrevious={pager.hasPrevious}
          onNext={handleNextPage}
          onPrevious={pager.goPrevious}
          hideOnSinglePage
        />
      ) : null}

      <FeedbucketCollectDialog
        managedProductId={managedProductId}
        open={collectOpen}
        onOpenChange={handleCollectOpenChange}
      />
    </section>
  );
}
