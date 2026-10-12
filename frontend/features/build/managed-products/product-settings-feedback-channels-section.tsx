"use client";

import { useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { TablePagination } from "@/components/ui/table-pagination";
import { ErrorState } from "@/components/shared/error-state";
import { useFeedbucketWidgets } from "@/hooks/api/feedbucket/use-feedbucket-widgets";
import { FeedbucketCollectDialog } from "./feedback/feedbucket-collect-dialog";
import { getErrorMessage } from "@/lib/get-error-message";

interface ProductSettingsFeedbackChannelsSectionProps {
  managedProductId: number;
}

export function ProductSettingsFeedbackChannelsSection({
  managedProductId,
}: ProductSettingsFeedbackChannelsSectionProps) {
  const [collectOpen, setCollectOpen] = useState(false);
  const [cursor, setCursor] = useState<string | null>(null);
  const [pageNumber, setPageNumber] = useState(1);

  const { data, isLoading, isError, error, refetch } = useFeedbucketWidgets({
    managedProductId,
    cursor: cursor ?? undefined,
  });

  const productWidgets = data?.data ?? [];
  const hasMore = data?.pagination.hasMore ?? false;

  const handleNextPage = useCallback(() => {
    if (data?.pagination.nextCursor) {
      setCursor(data.pagination.nextCursor);
      setPageNumber((n) => n + 1);
    }
  }, [data?.pagination.nextCursor]);

  const handlePreviousPage = useCallback(() => {
    setCursor(null);
    setPageNumber(1);
  }, []);

  const handleOpenCollect = useCallback(() => {
    setCollectOpen(true);
  }, []);

  const handleCollectOpenChange = useCallback((open: boolean) => {
    setCollectOpen(open);
  }, []);

  const handleRetry = useCallback(() => {
    void refetch();
  }, [refetch]);

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

      {productWidgets.length > 0 || pageNumber > 1 ? (
        <TablePagination
          mode="cursor"
          rowCount={productWidgets.length}
          pageNumber={pageNumber}
          hasMore={hasMore}
          hasPrevious={pageNumber > 1}
          onNext={handleNextPage}
          onPrevious={handlePreviousPage}
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
