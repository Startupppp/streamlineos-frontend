"use client";

import { useState, useCallback } from "react";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { EmptyState } from "@/components/ui/empty-state";
import { EmptyExpensesIllustration } from "@/components/illustrations";
import { ErrorState } from "@/components/shared";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { getErrorMessage } from "@/lib/get-error-message";
import { useReceiptInbox } from "@/hooks/api/accounting/expenses";
import { ReceiptCard } from "@/features/accounting/expenses/receipt-card";

function ReceiptCardSkeleton() {
  return (
    <div className="rounded-lg border border-border bg-card px-4 py-3 space-y-2">
      <div className="flex justify-between">
        <Skeleton className="h-4 w-32" />
        <Skeleton className="h-4 w-16" />
      </div>
      <Skeleton className="h-3 w-48" />
      <div className="flex justify-between">
        <Skeleton className="h-6 w-40" />
        <Skeleton className="h-6 w-24" />
      </div>
    </div>
  );
}

export default function ReceiptInboxPage() {
  const [page, setPage] = useState(1);

  const query = useReceiptInbox({ page, pageSize: 20 });

  function handleRetry(): void {
    void query.refetch();
  }

  const handlePrev = useCallback(() => setPage((p) => Math.max(1, p - 1)), []);
  const handleNext = useCallback(() => setPage((p) => p + 1), []);

  const items = query.data?.data ?? [];
  const total = query.data?.total ?? 0;
  const totalPages = query.data?.totalPages ?? 1;

  return (
    <PageWrapper
      eyebrow="Accounting · Expenses"
      title="Receipt Inbox"
      subtitle="Submitted expenses with policy flags needing review."
      backHref="/accounting/expenses"
    >
      {query.isLoading && (
        <div className="grid gap-3 sm:grid-cols-2">
          {Array.from({ length: 6 }).map((_, i) => (
            <ReceiptCardSkeleton key={i} />
          ))}
        </div>
      )}

      {query.error && (
        <ErrorState
          title="Failed to load receipt inbox"
          description={getErrorMessage(query.error)}
          onRetry={handleRetry}
        />
      )}

      {!query.isLoading && !query.error && items.length === 0 && (
        <EmptyState
          illustration={<EmptyExpensesIllustration />}
          title="Receipt inbox is clear"
          description="No submitted expenses with policy flags at the moment."
        />
      )}

      {items.length > 0 && (
        <>
          <div className="grid gap-3 sm:grid-cols-2">
            {items.map((item) => (
              <ReceiptCard key={item.id} item={item} />
            ))}
          </div>
          {totalPages > 1 && (
            <div className="flex items-center justify-between mt-4">
              <p className="text-xs text-muted-foreground">
                Page {page} of {totalPages} · {total} items
              </p>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="h-7 text-xs"
                  onClick={handlePrev}
                  disabled={page === 1}
                >
                  Previous
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-7 text-xs"
                  onClick={handleNext}
                  disabled={page >= totalPages}
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </>
      )}
    </PageWrapper>
  );
}
