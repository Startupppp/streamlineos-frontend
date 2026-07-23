"use client";

import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Skeleton } from "@/components/ui/skeleton";
import { LoadingButton } from "@/components/ui/loading-button";
import { useCan } from "@/hooks/api/access";
import { useCreateKbPage } from "@/hooks/api/kb";
import { pageHref } from "@/features/knowledge-base/lib/knowledge-routes";
import { KbPlusIcon } from "@/features/knowledge-base/lib/kb-icons";
import PageTreeItem from "./page-tree-item";
import type { KbPageTreeNode } from "@/hooks/api/kb/pages";

interface PageTreeProps {
  nodes: KbPageTreeNode[];
  isLoading: boolean;
  onCloseMobile?: () => void;
}

export default function PageTree({ nodes, isLoading, onCloseMobile }: PageTreeProps) {
  const router = useRouter();
  const createPage = useCreateKbPage();
  const canCreate = useCan("kb:pages:create");

  function handleNewPage() {
    if (!canCreate) return;
    createPage.mutate(
      {},
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

  const rootNodes = nodes
    .filter((n) => n.parentPageId === null)
    .sort((a, b) => a.sortOrder - b.sortOrder);

  if (rootNodes.length === 0) {
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
          allNodes={nodes}
          depth={0}
          onCloseMobile={onCloseMobile}
        />
      ))}
    </div>
  );
}
