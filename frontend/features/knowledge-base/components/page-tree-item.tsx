"use client";

import { memo, useRef, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { toast } from "sonner";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import {
  SidebarAnimatedNavIcon,
  useAnimatedNavIconHover,
} from "@/components/layout/sidebar/sidebar-animated-nav";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import {
  useCreateKbPage,
  useDeleteKbPage,
  useDuplicateKbPage,
  useToggleFavoriteKbPage,
  useUpdateKbPage,
} from "@/hooks/api/kb";
import { useCan } from "@/hooks/api/access";
import type { KbPageTreeNode } from "@/hooks/api/kb/pages";
import { KNOWLEDGE_BASE, pageHref } from "@/features/knowledge-base/lib/knowledge-routes";
import {
  KbChevronRightIcon,
  KbChevronDownIcon,
  KbPlusIcon,
  KbMoreHorizontalIcon,
  KbFileTextIcon,
} from "@/features/knowledge-base/lib/kb-icons";
import { cn } from "@/lib/utils";

interface PageTreeItemProps {
  node: KbPageTreeNode;
  allNodes: KbPageTreeNode[];
  depth: number;
  onCloseMobile?: () => void;
}

const PageTreeItem = memo(function PageTreeItemInner({
  node,
  allNodes,
  depth,
  onCloseMobile,
}: PageTreeItemProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [expanded, setExpanded] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [renaming, setRenaming] = useState(false);
  const [renameValue, setRenameValue] = useState("");
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const renameInputRef = useRef<HTMLInputElement>(null);
  const isActive = pathname === pageHref(node.id);
  const canCreate = useCan("kb:pages:create");
  const canDelete = useCan("kb:pages:delete");
  const createPage = useCreateKbPage();
  const deletePage = useDeleteKbPage();
  const duplicatePage = useDuplicateKbPage();
  const toggleFavorite = useToggleFavoriteKbPage();
  const updatePage = useUpdateKbPage();
  const { iconRef, animatedNavHoverHandlers } = useAnimatedNavIconHover();

  const shouldReduceMotion = useReducedMotion();

  const children = allNodes
    .filter((n) => n.parentPageId === node.id)
    .sort((a, b) => a.sortOrder - b.sortOrder);

  const hasActiveDescendant = children.some(
    (c) =>
      pathname === pageHref(c.id) ||
      allNodes.some(
        (n) =>
          n.parentPageId === c.id && pathname === pageHref(n.id)
      )
  );
  const [autoExpandedPath, setAutoExpandedPath] = useState<string | null>(null);
  if (hasActiveDescendant && autoExpandedPath !== pathname) {
    setAutoExpandedPath(pathname);
    if (!expanded) setExpanded(true);
  }

  function handleNavigate() {
    if (renaming) return;
    router.push(pageHref(node.id));
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
          router.push(pageHref(page.id));
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

  function handleDeleteClick() {
    setMenuOpen(false);
    setDeleteDialogOpen(true);
  }

  function handleConfirmDelete() {
    deletePage.mutate(node.id, {
      onSuccess: () => {
        toast.success("Page moved to trash");
        if (isActive) router.push(KNOWLEDGE_BASE);
      },
      onError: () => toast.error("Failed to delete page"),
    });
  }

  function handleDeleteDialogOpenChange(open: boolean) {
    setDeleteDialogOpen(open);
  }

  function handleMoreClick(e: React.MouseEvent) {
    e.stopPropagation();
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (renaming) return;
    if (e.key === "Enter" || e.key === " ") {
      handleNavigate();
    }
  }

  function handleStartRename() {
    setRenameValue(node.title || "");
    setRenaming(true);
    setMenuOpen(false);
    setTimeout(() => renameInputRef.current?.focus(), 0);
  }

  function handleRenameCommit() {
    const trimmed = renameValue.trim();
    if (!trimmed) {
      setRenaming(false);
      return;
    }
    updatePage.mutate(
      { pageId: node.id, title: trimmed },
      {
        onSuccess: () => setRenaming(false),
        onError: () => {
          toast.error("Failed to rename page");
          setRenaming(false);
        },
      }
    );
  }

  function handleRenameCancel() {
    setRenaming(false);
  }

  function handleRenameKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter") {
      e.preventDefault();
      handleRenameCommit();
    } else if (e.key === "Escape") {
      e.preventDefault();
      handleRenameCancel();
    }
  }

  function handleRenameInputChange(e: React.ChangeEvent<HTMLInputElement>) {
    setRenameValue(e.target.value);
  }

  function handleRenameInputClick(e: React.MouseEvent) {
    e.stopPropagation();
  }

  const showChevron = node.hasChildren || children.length > 0;

  return (
    <>
      <div className="min-w-0 overflow-hidden">
        <div
          role="button"
          tabIndex={0}
          aria-current={isActive ? "page" : undefined}
          className={cn(
            "group relative flex min-w-0 items-center gap-1 overflow-hidden py-1 rounded-md cursor-pointer text-sm transition-colors select-none",
            isActive
              ? "bg-muted text-foreground font-medium"
              : "text-foreground/80 hover:bg-muted",
          )}
          style={{ paddingLeft: depth * 16, paddingRight: 4 }}
          onClick={handleNavigate}
          onKeyDown={handleKeyDown}
          {...animatedNavHoverHandlers}
        >
          <span
            aria-hidden
            className={cn(
              "absolute left-0 top-1/2 -translate-y-1/2 h-4 w-[3px] rounded-r-full transition-opacity",
              isActive
                ? "bg-blue-600 opacity-100 dark:bg-blue-500"
                : "bg-slate-400 opacity-0 group-hover:opacity-100 dark:bg-slate-500",
            )}
          />
          <button
            className="shrink-0 h-4 w-4 flex items-center justify-center text-muted-foreground hover:text-foreground"
            onClick={handleToggleExpand}
            aria-label={expanded ? "Collapse" : "Expand"}
            tabIndex={-1}
          >
            {showChevron ? (
              expanded ? (
                <KbChevronDownIcon className="h-3 w-3" />
              ) : (
                <KbChevronRightIcon className="h-3 w-3" />
              )
            ) : (
              <span className="h-3 w-3" />
            )}
          </button>

          <span className="shrink-0 text-base leading-none">
            {node.icon ? (
              node.icon
            ) : (
              <SidebarAnimatedNavIcon
                icon={KbFileTextIcon}
                iconRef={iconRef}
                className="h-3.5 w-3.5 text-muted-foreground"
              />
            )}
          </span>

          {renaming ? (
            <Input
              ref={renameInputRef}
              value={renameValue}
              onChange={handleRenameInputChange}
              onKeyDown={handleRenameKeyDown}
              onBlur={handleRenameCommit}
              onClick={handleRenameInputClick}
              className="flex-1 h-6 text-sm py-0 px-1 min-w-0"
            />
          ) : (
            <span className="min-w-0 flex-1 line-clamp-1 break-all overflow-hidden">
              {node.title || "Untitled"}
            </span>
          )}

          {!renaming && (
            <span
              className={`${menuOpen ? "flex" : "hidden group-hover:flex"} items-center gap-0.5 shrink-0`}
            >
              {canCreate && (
                <button
                  className="h-5 w-5 flex items-center justify-center rounded text-muted-foreground hover:text-foreground hover:bg-muted"
                  onClick={handleAddChild}
                  tabIndex={-1}
                  aria-label="Add child page"
                >
                  <KbPlusIcon className="h-3 w-3" />
                </button>
              )}
              <DropdownMenu open={menuOpen} onOpenChange={setMenuOpen}>
                <DropdownMenuTrigger asChild>
                  <button
                    className="h-5 w-5 flex items-center justify-center rounded text-muted-foreground hover:text-foreground hover:bg-muted"
                    onClick={handleMoreClick}
                    tabIndex={-1}
                    aria-label="Page options"
                  >
                    <KbMoreHorizontalIcon className="h-3 w-3" />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" side="right">
                  <DropdownMenuItem onSelect={handleStartRename}>Rename</DropdownMenuItem>
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
                        onSelect={handleDeleteClick}
                        className="text-destructive focus:text-destructive"
                      >
                        Delete
                      </DropdownMenuItem>
                    </>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            </span>
          )}
        </div>

        <AnimatePresence initial={false}>
          {expanded && children.length > 0 && (
            <motion.div
              className="min-w-0 overflow-hidden"
              initial={{ opacity: 0, y: shouldReduceMotion ? 0 : -4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: shouldReduceMotion ? 0 : -4 }}
              transition={{ duration: shouldReduceMotion ? 0 : 0.15, ease: "easeOut" }}
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

      <AlertDialog open={deleteDialogOpen} onOpenChange={handleDeleteDialogOpenChange}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Move page to trash?</AlertDialogTitle>
            <AlertDialogDescription>
              &ldquo;{node.title || "Untitled"}&rdquo; will be moved to the Recycle Bin. You can restore it from the Recycle Bin.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmDelete}
              disabled={deletePage.isPending}
            >
              Move to trash
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
});

export default PageTreeItem;
