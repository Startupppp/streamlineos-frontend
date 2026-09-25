"use client";

import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Skeleton } from "@/components/ui/skeleton";
import { LoadingButton } from "@/components/ui/loading-button";
import { Button } from "@/components/ui/button";
import { InfiniteScrollSentinel } from "@/components/ui/infinite-scroll-sentinel";
import { useCan } from "@/hooks/api/access";
import { useCreateKbPage, useKbPageTreeInfinite } from "@/hooks/api/kb";
import { pageHref } from "@/lib/knowledge-routes";
import { KbPlusIcon } from "@/features/wiki/lib/kb-icons";
import PageTreeItem from "./page-tree-item";
import type { KbPageTreeNode } from "@/hooks/api/kb/page-types";
import { getErrorMessage } from "@/lib/get-error-message";

interface PageTreeProps {
  onCloseMobile?: () => void;
  spaceId?: number;
  projectId?: number;
}

export default function PageTree({
  onCloseMobile,
  spaceId,
  projectId,
}: PageTreeProps) {
  const router = useRouter();
  const createPage = useCreateKbPage();
  const canCreate = useCan("kb:pages:create");

  const {
    data,
    isLoading,
    isError,
    error,
    refetch,
    hasNextPage,
    isFetchingNextPage,
    fetchNextPage,
  } = useKbPageTreeInfinite({ spaceId, projectId });

  const rootNodes: KbPageTreeNode[] = data?.pages.flatMap((p) => p.data) ?? [];

  function handleNewPage() {
    if (!canCreate) return;
    createPage.mutate(
      { spaceId, projectId },
      {
        onSuccess: (page) => {
          router.push(pageHref(page.id));
          onCloseMobile?.();
        },
        onError: () => {
          toast.error("Failed to create page");
        },
      }
    );
  }

  function handleRetry() {
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

  if (isError) {
    return (
      <div className="flex flex-col items-center gap-2 px-2 py-4 text-center">
        <p className="text-xs text-muted-foreground">
          {getErrorMessage(error)}
        </p>
        <Button
          type="button"
          size="sm"
          variant="outline"
          className="h-7 text-xs"
          onClick={handleRetry}
        >
          Try again
        </Button>
      </div>
    );
  }

  if (rootNodes.length === 0 && !hasNextPage) {
    return (
      <div className="pr-2 pl-0 py-4 flex flex-col items-center gap-2">
        <p className="text-xs text-muted-foreground text-center">No pages yet</p>
        {canCreate && (
          <LoadingButton
            size="sm"
            variant="outline"
            className="h-7 text-xs"
            onClick={handleNewPage}
            isPending={createPage.isPending}
            loadingText="Creating…"
          >
            <KbPlusIcon className="h-3.5 w-3.5" />
            New page
          </LoadingButton>
        )}
      </div>
    );
  }

  return (
    <div className="min-w-0 overflow-hidden space-y-0.5">
      {rootNodes.map((node) => (
        <PageTreeItem
          key={node.id}
          node={node}
          depth={0}
          onCloseMobile={onCloseMobile}
          spaceId={spaceId}
        />
      ))}
      <InfiniteScrollSentinel
        hasNextPage={hasNextPage}
        isFetchingNextPage={isFetchingNextPage}
        onLoadMore={fetchNextPage}
        label="Load more pages"
      />
    </div>
  );
}
