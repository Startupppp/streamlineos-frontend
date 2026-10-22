"use client";

import { useMemo } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { ErrorState } from "@/components/shared/error-state";
import { InfiniteScrollSentinel } from "@/components/ui/infinite-scroll-sentinel";
import { useKbPageTreeInfinite } from "@/hooks/api/kb/pages";
import { KbPlusIcon } from "@/features/wiki/lib/kb-icons";
import { KB_DOC_BASE } from "@/lib/knowledge-routes";
import { KbNewMenu } from "./kb-new-menu";
import PageTreeItem from "./page-tree-item";
import type { KbPageTreeNode } from "@/hooks/api/kb/page-types";
import { getErrorMessage } from "@/lib/get-error-message";
import { isApiError } from "@/lib/api-envelope";

interface PageTreeProps {
  onCloseMobile?: () => void;
  spaceId?: number;
  projectId?: number;
  baseHref?: string;
}

export default function PageTree({
  onCloseMobile,
  spaceId,
  projectId,
  baseHref,
}: PageTreeProps) {
  const treeScope = useMemo(
    () => ({ spaceId, projectId }),
    [spaceId, projectId],
  );

  const {
    data,
    isLoading,
    isError,
    isFetchNextPageError,
    error,
    refetch,
    hasNextPage,
    isFetchingNextPage,
    fetchNextPage,
  } = useKbPageTreeInfinite({ spaceId, projectId });

  const rootNodes: KbPageTreeNode[] = data?.pages.flatMap((p) => p.data) ?? [];
  const accessLost = isApiError(error) && (error.status === 401 || error.status === 403 || error.status === 404);

  function handleRetry() {
    if (isFetchNextPageError) {
      void fetchNextPage();
      return;
    }
    void refetch();
  }

  if (isLoading) {
    return (
      <div className="space-y-1 pr-2 pl-0">
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton
            key={i}
            className="h-7 rounded-md"
            style={{ width: `${55 + (i % 3) * 15}%` }}
          />
        ))}
      </div>
    );
  }

  if (isError && (rootNodes.length === 0 || accessLost)) {
    return (
      <ErrorState
        compact
        title="Couldn't load files"
        description={getErrorMessage(error)}
        error={error}
        onRetry={handleRetry}
      />
    );
  }

  if (rootNodes.length === 0 && !hasNextPage) {
    return (
      <div className="pr-2 pl-0 py-4 flex flex-col items-center gap-2">
        <p className="text-xs text-muted-foreground text-center">No files yet</p>
        <KbNewMenu
          scope={treeScope}
          allowFolder={false}
          onCreated={onCloseMobile}
          baseHref={baseHref ?? KB_DOC_BASE}
          trigger={
            <Button size="sm" variant="outline" className="h-7 text-xs">
              <KbPlusIcon className="h-3.5 w-3.5" />
              New
            </Button>
          }
        />
      </div>
    );
  }

  return (
    <div role="tree" aria-label="Folder tree" className="min-w-0 overflow-hidden space-y-0.5">
      {rootNodes.map((node, index) => (
        <PageTreeItem
          key={node.id}
          node={node}
          depth={0}
          ariaSetSize={rootNodes.length}
          ariaPosInSet={index + 1}
          onCloseMobile={onCloseMobile}
          spaceId={spaceId}
          projectId={projectId}
          baseHref={baseHref}
        />
      ))}
      {isError ? (
        <ErrorState
          compact
          title={isFetchNextPageError ? "Couldn't load more files" : "Couldn't refresh files"}
          description={getErrorMessage(error)}
          error={error}
          onRetry={handleRetry}
        />
      ) : (
        <InfiniteScrollSentinel
          hasNextPage={hasNextPage}
          isFetchingNextPage={isFetchingNextPage}
          onLoadMore={fetchNextPage}
          label="Load more files"
        />
      )}
    </div>
  );
}
