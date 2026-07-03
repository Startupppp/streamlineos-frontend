"use client";

import { useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { ChevronRight, ChevronDown, Plus, MoreHorizontal, FileText } from "lucide-react";
import { toast } from "sonner";
import { AnimatePresence, motion } from "framer-motion";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  useCreateKbPage,
  useDeleteKbPage,
  useDuplicateKbPage,
  useToggleFavoriteKbPage,
} from "@/hooks/api/kb";
import { useCan } from "@/hooks/api/access";
import type { KbPageTreeNode } from "@/hooks/api/kb/pages";

interface PageTreeItemProps {
  node: KbPageTreeNode;
  allNodes: KbPageTreeNode[];
  depth: number;
  onCloseMobile?: () => void;
}

export default function PageTreeItem({
  node,
  allNodes,
  depth,
  onCloseMobile,
}: PageTreeItemProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [expanded, setExpanded] = useState(false);
  const isActive = pathname === `/knowledge-base/pages/${node.id}`;
  const canCreate = useCan("kb:pages:create");
  const canDelete = useCan("kb:pages:delete");
  const createPage = useCreateKbPage();
  const deletePage = useDeleteKbPage();
  const duplicatePage = useDuplicateKbPage();
  const toggleFavorite = useToggleFavoriteKbPage();

  const children = allNodes
    .filter((n) => n.parentPageId === node.id)
    .sort((a, b) => a.sortOrder - b.sortOrder);

  const hasActiveDescendant = children.some(
    (c) =>
      pathname === `/knowledge-base/pages/${c.id}` ||
      allNodes.some(
        (n) =>
          n.parentPageId === c.id && pathname === `/knowledge-base/pages/${n.id}`
      )
  );
  const [autoExpandedPath, setAutoExpandedPath] = useState<string | null>(null);
  if (hasActiveDescendant && autoExpandedPath !== pathname) {
    setAutoExpandedPath(pathname);
    if (!expanded) setExpanded(true);
  }

  function handleNavigate() {
    router.push(`/knowledge-base/pages/${node.id}`);
    onCloseMobile?.();
  }

  function handleToggleExpand(e: React.MouseEvent) {
    e.stopPropagation();
    setExpanded((prev) => !prev);
  }

  function handleAddChild(e: React.MouseEvent) {
    e.stopPropagation();
    if (!canCreate) return;
    createPage.mutate(
      { parentPageId: node.id },
      {
        onSuccess: (page) => {
          setExpanded(true);
          router.push(`/knowledge-base/pages/${page.id}`);
        },
        onError: () => toast.error("Failed to create page"),
      }
    );
  }

  function handleDuplicate() {
    duplicatePage.mutate(node.id, {
      onSuccess: () => toast.success("Page duplicated"),
      onError: () => toast.error("Failed to duplicate page"),
    });
  }

  function handleAddToFavorites() {
    toggleFavorite.mutate(
      { pageId: node.id, isFavorite: false },
      {
        onError: () => toast.error("Failed to add to favorites"),
      }
    );
  }

  function handleDelete() {
    deletePage.mutate(node.id, {
      onSuccess: () => toast.success("Page moved to trash"),
      onError: () => toast.error("Failed to delete page"),
    });
  }

  function handleMoreClick(e: React.MouseEvent) {
    e.stopPropagation();
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter" || e.key === " ") {
      handleNavigate();
    }
  }

  const showChevron = node.hasChildren || children.length > 0;

  return (
    <div>
      <div
        role="button"
        tabIndex={0}
        className={`group flex items-center gap-1 py-1 rounded-md cursor-pointer text-sm transition-colors select-none ${
          isActive
            ? "bg-accent/10 text-accent font-medium"
            : "text-foreground/80 hover:bg-muted"
        }`}
        style={{ paddingLeft: 8 + depth * 16, paddingRight: 4 }}
        onClick={handleNavigate}
        onKeyDown={handleKeyDown}
      >
        <button
          className="shrink-0 h-4 w-4 flex items-center justify-center text-muted-foreground hover:text-foreground"
          onClick={handleToggleExpand}
          aria-label={expanded ? "Collapse" : "Expand"}
          tabIndex={-1}
        >
          {showChevron ? (
            expanded ? (
              <ChevronDown className="h-3 w-3" />
            ) : (
              <ChevronRight className="h-3 w-3" />
            )
          ) : (
            <span className="h-3 w-3" />
          )}
        </button>

        <span className="shrink-0 text-base leading-none">
          {node.icon ? (
            node.icon
          ) : (
            <FileText className="h-3.5 w-3.5 text-muted-foreground" />
          )}
        </span>

        <span className="flex-1 truncate min-w-0">{node.title || "Untitled"}</span>

        <span className="hidden group-hover:flex items-center gap-0.5 shrink-0">
          {canCreate && (
            <button
              className="h-5 w-5 flex items-center justify-center rounded text-muted-foreground hover:text-foreground hover:bg-accent/10"
              onClick={handleAddChild}
              tabIndex={-1}
              aria-label="Add child page"
            >
              <Plus className="h-3 w-3" />
            </button>
          )}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                className="h-5 w-5 flex items-center justify-center rounded text-muted-foreground hover:text-foreground hover:bg-accent/10"
                onClick={handleMoreClick}
                tabIndex={-1}
                aria-label="Page options"
              >
                <MoreHorizontal className="h-3 w-3" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" side="right">
              {canCreate && (
                <DropdownMenuItem onSelect={handleDuplicate}>Duplicate</DropdownMenuItem>
              )}
              <DropdownMenuItem onSelect={handleAddToFavorites}>
                Add to favorites
              </DropdownMenuItem>
              {canDelete && (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onSelect={handleDelete}
                    className="text-destructive focus:text-destructive"
                  >
                    Delete
                  </DropdownMenuItem>
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </span>
      </div>

      <AnimatePresence initial={false}>
        {expanded && children.length > 0 && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.18, ease: "easeOut" }}
            className="overflow-hidden"
          >
            {children.map((child) => (
              <PageTreeItem
                key={child.id}
                node={child}
                allNodes={allNodes}
                depth={depth + 1}
                onCloseMobile={onCloseMobile}
              />
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
