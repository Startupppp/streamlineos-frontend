"use client";

import { Lock } from "lucide-react";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { EmptyState } from "@/components/ui/empty-state";
import { useKbPagesTree } from "@/hooks/api/kb";
import { filterTreeWithAncestors } from "@/features/knowledge-base/lib/tree-utils";
import PageTree from "./page-tree";

export default function PrivatePage() {
  const { data: treeNodes = [], isLoading, isError } = useKbPagesTree();

  const privateNodes = isLoading
    ? []
    : filterTreeWithAncestors(treeNodes, (n) => n.visibility === "private");

  const subtitle =
    !isLoading && !isError && privateNodes.length > 0
      ? `${privateNodes.length} page${privateNodes.length === 1 ? "" : "s"}`
      : undefined;

  return (
    <PageWrapper title="Private pages" subtitle={subtitle}>
      {isLoading && <PageTree nodes={[]} isLoading={true} />}

      {!isLoading && isError && (
        <EmptyState
          illustration={<Lock className="h-8 w-8 text-muted-foreground/40" />}
          title="Could not load pages"
          description="There was a problem fetching your pages."
        />
      )}

      {!isLoading && !isError && privateNodes.length === 0 && (
        <EmptyState
          illustration={<Lock className="h-8 w-8 text-muted-foreground/40" />}
          title="No private pages"
          description="Set a page to Private from Share."
        />
      )}

      {!isLoading && !isError && privateNodes.length > 0 && (
        <PageTree nodes={privateNodes} isLoading={false} />
      )}
    </PageWrapper>
  );
}
