"use client";

import { Skeleton } from "@/components/ui/skeleton";
import PageTreeItem from "./page-tree-item";
import type { KbPageTreeNode } from "@/hooks/api/kb/pages";

interface PageTreeProps {
  nodes: KbPageTreeNode[];
  isLoading: boolean;
  onCloseMobile?: () => void;
}

export default function PageTree({ nodes, isLoading, onCloseMobile }: PageTreeProps) {
  if (isLoading) {
    return (
      <div className="space-y-1 px-2">
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
      <p className="px-2 py-4 text-xs text-muted-foreground text-center">No pages yet</p>
    );
  }

  return (
    <div className="space-y-0.5">
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
