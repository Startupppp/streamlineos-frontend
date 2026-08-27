"use client";

import { PageWrapper } from "@/components/ui/page-wrapper";

import { EmptyState } from "@/components/ui/empty-state";
import { CONTENT_FILL_PANEL } from "@/components/ui/content-fill-panel";
import { useKbPagesTree } from "@/hooks/api/kb";
import { filterTreeWithAncestors } from "@/features/wiki/lib/tree-utils";
import { KbLockIcon } from "@/features/wiki/lib/kb-icons";
import PageTree from "./page-tree";

export default function PrivatePage() {
  const { data: treeNodes = [], isLoading, isError } = useKbPagesTree();

  const privateNodes = isLoading
    ? []
    : filterTreeWithAncestors(treeNodes, (n) => n.visibility === "private");

  return (
    <PageWrapper title="Private pages" subtitle="Pages visible only to you">
      {isLoading && <PageTree nodes={[]} isLoading={true} />}

      {!isLoading && isError && (
        <EmptyState
          illustration={
            <KbLockIcon className="w-8 text-muted-foreground/40" />
          }
          title="Could not load pages"
          description="There was a problem fetching your pages."
          className={CONTENT_FILL_PANEL}
        />
      )}

      {!isLoading && !isError && privateNodes.length === 0 && (
        <EmptyState
          illustration={
            <KbLockIcon className="w-8 text-muted-foreground/40" />
          }
          title="No private pages"
          description="Set a page to Private from Share."
          className={CONTENT_FILL_PANEL}
        />
      )}

      {!isLoading && !isError && privateNodes.length > 0 && (
        <PageTree nodes={privateNodes} isLoading={false} />
      )}
    </PageWrapper>
  );
}
