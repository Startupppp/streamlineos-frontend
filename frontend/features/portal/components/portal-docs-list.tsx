"use client";

import { useCallback } from "react";
import Link from "next/link";
import { FileText } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorState } from "@/components/shared/error-state";
import { InfiniteScrollSentinel } from "@/components/ui/infinite-scroll-sentinel";
import { PortalHeader } from "@/features/portal/components/portal-header";
import { usePortalGuard } from "@/hooks/api/portal/use-portal-guard";
import { usePortalDocsList } from "@/hooks/api/portal/use-portal-docs";
import type { PortalDocListItem } from "@/hooks/api/portal/use-portal-docs";

function DocCardSkeleton() {
  return (
    <div className="rounded-xl border border-border bg-card p-5 space-y-2">
      <Skeleton className="h-4 w-16 rounded" />
      <Skeleton className="h-5 w-3/4" />
    </div>
  );
}

function DocCard({ doc }: { doc: PortalDocListItem }) {
  return (
    <Link
      href={`/shared-docs/${doc.id}`}
      className="block rounded-xl border border-border bg-card p-5 hover:border-primary/40 hover:shadow-md transition-all"
    >
      <div className="flex items-center gap-2 mb-1.5">
        <FileText className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
        <span className="text-dense uppercase tracking-wider font-bold text-muted-foreground">
          {doc.kind}
        </span>
      </div>
      <p className="text-sm font-medium text-foreground truncate">{doc.title}</p>
    </Link>
  );
}

function PortalDocsList() {
  const { isReady } = usePortalGuard();
  const {
    data,
    isLoading,
    isError,
    refetch,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = usePortalDocsList();

  const handleLoadMore = useCallback(() => {
    void fetchNextPage();
  }, [fetchNextPage]);

  const handleRetry = useCallback(() => {
    void refetch();
  }, [refetch]);

  const docs = data?.pages.flatMap((p) => p.data) ?? [];

  if (!isReady || isLoading) {
    return (
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <DocCardSkeleton key={i} />
        ))}
      </div>
    );
  }

  if (isError) {
    return (
      <ErrorState
        title="Could not load documents"
        description="There was a problem fetching your shared documents. Please try again."
        onRetry={handleRetry}
        className="min-h-[280px]"
      />
    );
  }

  if (docs.length === 0) {
    return (
      <EmptyState
        illustrationPreset="default"
        title="No shared documents"
        description="Documents shared with you will appear here."
        className="min-h-[280px]"
      />
    );
  }

  return (
    <>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {docs.map((doc) => (
          <DocCard key={doc.id} doc={doc} />
        ))}
      </div>
      <div className="mt-4">
        <InfiniteScrollSentinel
          hasNextPage={hasNextPage}
          isFetchingNextPage={isFetchingNextPage}
          onLoadMore={handleLoadMore}
          label="Load more documents"
        />
      </div>
    </>
  );
}

export function PortalDocsListPage() {
  return (
    <div className="flex flex-col min-h-dvh bg-background">
      <PortalHeader showProjectsLink />
      <main className="flex-1 px-4 sm:px-6 py-8 max-w-5xl mx-auto w-full">
        <div className="mb-6">
          <h1 className="text-xl font-semibold text-foreground">Shared documents</h1>
          <p className="mt-0.5 text-sm text-muted-foreground">
            Documents your team has shared with you.
          </p>
        </div>
        <PortalDocsList />
      </main>
    </div>
  );
}
