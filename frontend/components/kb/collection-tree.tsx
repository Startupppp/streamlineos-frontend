"use client";

import { useMemo } from "react";
import { Files, Folder } from "lucide-react";
import { cn } from "@/lib/utils";
import type { KbCategory } from "@/types/kb";

interface CollectionTreeProps {
  categories: KbCategory[];
  selectedId: number | null;
  onSelect: (id: number | null) => void;
}

interface TreeNode {
  category: KbCategory;
  children: TreeNode[];
}

const MAX_DEPTH = 2;

const INDENT_CLASS: Record<number, string> = {
  0: "pl-2",
  1: "pl-6",
  2: "pl-10",
};

function sortNodes(nodes: TreeNode[]): TreeNode[] {
  const sorted = [...nodes].sort(
    (a, b) =>
      a.category.sortOrder - b.category.sortOrder ||
      a.category.name.localeCompare(b.category.name),
  );
  for (const node of sorted) {
    node.children = sortNodes(node.children);
  }
  return sorted;
}

function buildTree(categories: KbCategory[]): TreeNode[] {
  const byId = new Map<number, TreeNode>();
  for (const category of categories) {
    byId.set(category.id, { category, children: [] });
  }
  const roots: TreeNode[] = [];
  for (const category of categories) {
    const node = byId.get(category.id);
    if (!node) continue;
    const parent =
      category.parentId === null ? undefined : byId.get(category.parentId);
    if (parent) {
      parent.children.push(node);
    } else {
      roots.push(node);
    }
  }
  return sortNodes(roots);
}

interface CollectionBranchProps {
  node: TreeNode;
  depth: number;
  selectedId: number | null;
  onSelect: (id: number | null) => void;
}

function CollectionBranch({ node, depth, selectedId, onSelect }: CollectionBranchProps) {
  const isSelected = selectedId === node.category.id;
  const indent = INDENT_CLASS[Math.min(depth, MAX_DEPTH)] ?? INDENT_CLASS[MAX_DEPTH];

  const handleSelect = () => onSelect(node.category.id);

  return (
    <div>
      <button
        type="button"
        onClick={handleSelect}
        className={cn(
          "flex w-full items-center gap-2 rounded-md py-1.5 pr-2 text-left text-sm transition-colors",
          indent,
          isSelected
            ? "bg-accent font-medium text-accent-foreground"
            : "text-muted-foreground hover:bg-muted hover:text-foreground",
        )}
      >
        <Folder className="h-3.5 w-3.5 shrink-0" />
        <span className="truncate">{node.category.name}</span>
      </button>
      {node.children.length > 0 && depth < MAX_DEPTH && (
        <div className="mt-0.5 space-y-0.5">
          {node.children.map((child) => (
            <CollectionBranch
              key={child.category.id}
              node={child}
              depth={depth + 1}
              selectedId={selectedId}
              onSelect={onSelect}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export function CollectionTree({ categories, selectedId, onSelect }: CollectionTreeProps) {
  const tree = useMemo(() => buildTree(categories), [categories]);
  const isAllSelected = selectedId === null;

  const handleSelectAll = () => onSelect(null);

  return (
    <nav className="space-y-0.5" aria-label="Collections">
      <button
        type="button"
        onClick={handleSelectAll}
        className={cn(
          "flex w-full items-center gap-2 rounded-md py-1.5 pl-2 pr-2 text-left text-sm transition-colors",
          isAllSelected
            ? "bg-accent font-medium text-accent-foreground"
            : "text-muted-foreground hover:bg-muted hover:text-foreground",
        )}
      >
        <Files className="h-3.5 w-3.5 shrink-0" />
        <span className="truncate">All articles</span>
      </button>
      {tree.map((node) => (
        <CollectionBranch
          key={node.category.id}
          node={node}
          depth={0}
          selectedId={selectedId}
          onSelect={onSelect}
        />
      ))}
    </nav>
  );
}
