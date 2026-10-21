"use client";

import { Fragment, memo, useCallback, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import { toast } from "sonner";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import {
  SidebarAnimatedNavIcon,
  useAnimatedNavIconHover,
} from "@/components/layout/sidebar/sidebar-animated-nav";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { InfiniteScrollSentinel } from "@/components/ui/infinite-scroll-sentinel";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ErrorReference } from "@/components/shared/error-reference";
import {
  useDeleteKbPage,
  useDuplicateKbPage,
  useKbPageChildrenLevel,
  useToggleFavoriteKbPage,
  useUpdateKbPage,
} from "@/hooks/api/kb";
import { useCan } from "@/hooks/api/access";
import type { KbPageTreeNode } from "@/hooks/api/kb/page-types";
import { KB_DOC_BASE, KNOWLEDGE_BASE, pageHref } from "@/lib/knowledge-routes";
import {
  resolveKbPageActions,
  groupKbPageActions,
  toKbPageActionId,
  type KbPageActionCapabilities,
  type KbPageActionSubject,
} from "@/features/wiki/lib/page-action-descriptors";
import {
  KbChevronRightIcon,
  KbChevronDownIcon,
  KbFileTextIcon,
  KbMoreHorizontalIcon,
  KbPlusIcon,
  KbSpreadsheetIcon,
} from "@/features/wiki/lib/kb-icons";
import { KbNewMenu } from "./kb-new-menu";
import { cn } from "@/lib/utils";
import { getErrorMessage } from "@/lib/get-error-message";
import { isApiError } from "@/lib/api-envelope";
import { TruncatedText } from "@/components/ui/truncated-text";

interface PageTreeItemProps {
  node: KbPageTreeNode;
  depth: number;
  ariaSetSize?: number;
  ariaPosInSet?: number;
  onCloseMobile?: () => void;
  spaceId?: number;
  projectId?: number;
  baseHref?: string;
}

export function resolvePageTreeExpanded(
  manuallyExpanded: boolean,
  hasActiveDescendant: boolean,
): boolean {
  return manuallyExpanded || hasActiveDescendant;
}

const TREE_ITEM_ACTION_IDS = new Set(["favorite", "duplicate", "delete"]);

const TREE_ITEM_SUBJECT: KbPageActionSubject = {
  isFavorite: false,
  isLocked: false,
  hasCover: false,
  isArchived: false,
};

const PageTreeItem = memo(function PageTreeItemInner({
  node,
  depth,
  ariaSetSize,
  ariaPosInSet,
  onCloseMobile,
  spaceId,
  projectId,
  baseHref,
}: PageTreeItemProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [expanded, setExpanded] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [renaming, setRenaming] = useState(false);
  const [renameValue, setRenameValue] = useState("");
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const renameInputRef = useRef<HTMLInputElement>(null);
  const nodeHref = baseHref ? `${baseHref}/${node.id}` : pageHref(node.id);
  const isActive = pathname === nodeHref || pathname.startsWith(`${nodeHref}/`);
  const canCreate = useCan("kb:pages:create");
  const canDelete = useCan("kb:pages:delete");

  const treeCapabilities: KbPageActionCapabilities = {
    canCreate,
    canUpdate: false,
    canManage: false,
    canDelete,
    canExport: false,
    canManageTemplates: false,
    isEditable: false,
  };
  const treeActions = resolveKbPageActions(
    TREE_ITEM_SUBJECT,
    treeCapabilities,
  ).filter((a) => TREE_ITEM_ACTION_IDS.has(a.id));
  const treeActionGroups = groupKbPageActions(treeActions);
  const childScope = useMemo(
    () => ({
      parentPageId: node.id,
      ...(node.spaceId !== null ? { spaceId: node.spaceId } : {}),
      ...(node.projectId !== null ? { projectId: node.projectId } : {}),
    }),
    [node.id, node.spaceId, node.projectId],
  );
  const handleChildCreated = useCallback(() => {
    setExpanded(true);
  }, []);
  const deletePage = useDeleteKbPage();
  const duplicatePage = useDuplicateKbPage();
  const toggleFavorite = useToggleFavoriteKbPage();
  const updatePage = useUpdateKbPage();
  const { iconRef, animatedNavHoverHandlers } = useAnimatedNavIconHover();
  const shouldReduceMotion = useReducedMotion();
  const hasActiveDescendant = pathname.startsWith(`${nodeHref}/`);
  const isExpanded = resolvePageTreeExpanded(expanded, hasActiveDescendant);

  const {
    data: childrenData,
    isError: childrenError,
    error: childrenReadError,
    refetch: refetchChildren,
    isLoading: childrenLoading,
    hasNextPage: childrenHasNextPage,
    fetchNextPage: fetchChildrenNextPage,
    isFetchingNextPage: childrenFetchingNext,
    isFetchNextPageError: childrenFetchNextPageError,
  } = useKbPageChildrenLevel(node.id, isExpanded, spaceId, projectId);

  const children: KbPageTreeNode[] =
    childrenData?.pages.flatMap((p) => p.data) ?? [];
  const childrenAccessLost =
    childrenError &&
    isApiError(childrenReadError) &&
    (childrenReadError.status === 401 ||
      childrenReadError.status === 403 ||
      childrenReadError.status === 404);
  const visibleChildren = childrenAccessLost ? [] : children;

  const showChevron = node.hasChildren || visibleChildren.length > 0;

  function handleRetryChildren() {
    if (childrenFetchNextPageError && !childrenAccessLost) {
      void fetchChildrenNextPage();
      return;
    }
    void refetchChildren();
  }

  function handleToggleExpand(e: React.MouseEvent) {
    e.stopPropagation();
    setExpanded((prev) => !prev);
  }

  function handleMenuSelect(event: Event) {
    const target = event.currentTarget;
    if (!(target instanceof HTMLElement)) return;
    const actionId = toKbPageActionId(target.dataset.actionId);
    if (!actionId) return;
    if (actionId === "duplicate") {
      duplicatePage.mutate(node.id, {
        onSuccess: () => toast.success("Page duplicated"),
        onError: () => toast.error("Failed to duplicate page"),
      });
    } else if (actionId === "favorite") {
      toggleFavorite.mutate(
        { pageId: node.id, isFavorite: false },
        { onError: () => toast.error("Failed to add to favorites") },
      );
    } else if (actionId === "delete") {
      setMenuOpen(false);
      setDeleteDialogOpen(true);
    }
  }

  function handleConfirmDelete() {
    deletePage.mutate(node.id, {
      onSuccess: () => {
        toast.success("Page moved to trash");
        if (isActive) router.push(baseHref ?? KNOWLEDGE_BASE);
      },
      onError: () => toast.error("Failed to delete page"),
    });
  }

  function handleDeleteDialogOpenChange(open: boolean) {
    setDeleteDialogOpen(open);
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
      {
        pageId: node.id,
        title: trimmed,
        expectedContentRevision: node.contentRevision,
      },
      {
        onSuccess: () => setRenaming(false),
        onError: () => {
          toast.error("Failed to rename page");
          setRenaming(false);
        },
      },
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

  return (
    <>
      <div className="min-w-0 overflow-hidden">
        <div
          role="treeitem"
          aria-level={depth + 1}
          aria-expanded={showChevron ? isExpanded : undefined}
          aria-selected={isActive}
          aria-setsize={ariaSetSize}
          aria-posinset={ariaPosInSet}
          className={cn(
            "group relative flex min-w-0 items-center gap-1 overflow-hidden py-1 rounded-md text-sm transition-colors select-none",
            isActive
              ? "bg-muted text-foreground font-medium"
              : "text-foreground/80 hover:bg-muted",
          )}
          style={{ paddingLeft: depth * 16, paddingRight: 4 }}
          {...animatedNavHoverHandlers}
        >
          <span
            aria-hidden
            className={cn(
              "absolute left-0 top-1/2 -translate-y-1/2 h-4 w-[3px] rounded-r-full transition-opacity",
              isActive
                ? "bg-primary opacity-100"
                : "bg-muted-foreground/50 opacity-0 group-hover:opacity-100",
            )}
          />
          {showChevron ? (
            <button
              type="button"
              className="shrink-0 h-8 w-8 lg:h-5 lg:w-5 flex items-center justify-center text-muted-foreground hover:text-foreground"
              onClick={handleToggleExpand}
              aria-label={isExpanded ? "Collapse" : "Expand"}
              aria-expanded={isExpanded}
            >
              {isExpanded ? (
                <KbChevronDownIcon className="h-3 w-3" />
              ) : (
                <KbChevronRightIcon className="h-3 w-3" />
              )}
            </button>
          ) : (
            <span className="shrink-0 h-4 w-4" aria-hidden="true" />
          )}

          {renaming ? (
            <>
              <span className="shrink-0 text-base leading-none">
                {node.icon ? (
                  node.icon
                ) : (
                  <SidebarAnimatedNavIcon
                    icon={
                      node.kind === "spreadsheet"
                        ? KbSpreadsheetIcon
                        : KbFileTextIcon
                    }
                    iconRef={iconRef}
                    className="h-3.5 w-3.5 text-muted-foreground"
                  />
                )}
              </span>
              <Input
                ref={renameInputRef}
                value={renameValue}
                onChange={handleRenameInputChange}
                onKeyDown={handleRenameKeyDown}
                onBlur={handleRenameCommit}
                className="flex-1 h-6 text-sm py-0 px-1 min-w-0"
              />
            </>
          ) : (
            <Link
              href={nodeHref}
              aria-current={isActive ? "page" : undefined}
              className="flex min-w-0 flex-1 items-center gap-1 cursor-pointer text-left"
              onClick={onCloseMobile}
            >
              <span className="shrink-0 text-base leading-none">
                {node.icon ? (
                  node.icon
                ) : (
                  <SidebarAnimatedNavIcon
                    icon={
                      node.kind === "spreadsheet"
                        ? KbSpreadsheetIcon
                        : KbFileTextIcon
                    }
                    iconRef={iconRef}
                    className="h-3.5 w-3.5 text-muted-foreground"
                  />
                )}
              </span>
              <TruncatedText
                text={node.title || "Untitled"}
                className="flex-1"
              />
            </Link>
          )}

          {!renaming && (
            <span
              className={`${menuOpen ? "flex" : "flex lg:hidden lg:group-hover:flex lg:group-focus-within:flex"} items-center gap-0.5 shrink-0`}
            >
              <KbNewMenu
                scope={childScope}
                allowFolder={false}
                onCreated={handleChildCreated}
                baseHref={baseHref ?? KB_DOC_BASE}
                trigger={
                  <button
                    type="button"
                    className="h-8 w-8 lg:h-6 lg:w-6 flex items-center justify-center rounded text-muted-foreground hover:text-foreground hover:bg-muted"
                    aria-label="Add child page"
                  >
                    <KbPlusIcon className="h-3 w-3" />
                  </button>
                }
              />
              <DropdownMenu open={menuOpen} onOpenChange={setMenuOpen}>
                <DropdownMenuTrigger asChild>
                  <button
                    type="button"
                    className="h-8 w-8 lg:h-6 lg:w-6 flex items-center justify-center rounded text-muted-foreground hover:text-foreground hover:bg-muted"
                    aria-label="Page options"
                  >
                    <KbMoreHorizontalIcon className="h-3 w-3" />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" side="right">
                  <DropdownMenuItem onSelect={handleStartRename}>
                    Rename
                  </DropdownMenuItem>
                  {treeActionGroups.map((group) => (
                    <Fragment key={group[0]?.group}>
                      {group[0]?.group === "danger" ? (
                        <DropdownMenuSeparator />
                      ) : null}
                      {group.map((action) => (
                        <DropdownMenuItem
                          key={action.id}
                          data-action-id={action.id}
                          variant={
                            action.destructive ? "destructive" : "default"
                          }
                          onSelect={handleMenuSelect}
                        >
                          <action.icon className="h-3.5 w-3.5" />
                          {action.label}
                        </DropdownMenuItem>
                      ))}
                    </Fragment>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            </span>
          )}
        </div>

        <AnimatePresence initial={false}>
          {isExpanded &&
            (visibleChildren.length > 0 ||
              childrenHasNextPage ||
              childrenLoading ||
              childrenError) && (
              <motion.div
                role="group"
                className="min-w-0 overflow-hidden"
                initial={{ opacity: 0, y: shouldReduceMotion ? 0 : -4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: shouldReduceMotion ? 0 : -4 }}
                transition={{
                  duration: shouldReduceMotion ? 0 : 0.15,
                  ease: "easeOut",
                }}
              >
                {childrenLoading && visibleChildren.length === 0 && (
                  <p
                    role="status"
                    className="px-2 py-2 text-xs text-muted-foreground"
                    style={{ paddingLeft: (depth + 1) * 16 }}
                  >
                    Loading child pages…
                  </p>
                )}
                {childrenError && (
                  <div
                    role="alert"
                    className="space-y-2 px-2 py-2 text-xs"
                    style={{ paddingLeft: (depth + 1) * 16 }}
                  >
                    <p className="text-muted-foreground">
                      {getErrorMessage(childrenReadError)}
                    </p>
                    <ErrorReference
                      error={childrenReadError}
                      className="justify-start"
                    />
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={handleRetryChildren}
                    >
                      Retry child pages
                    </Button>
                  </div>
                )}
                {visibleChildren.map((child, index) => (
                  <PageTreeItem
                    key={child.id}
                    node={child}
                    depth={depth + 1}
                    ariaSetSize={visibleChildren.length}
                    ariaPosInSet={index + 1}
                    onCloseMobile={onCloseMobile}
                    spaceId={spaceId}
                    projectId={projectId}
                    baseHref={baseHref}
                  />
                ))}
                <InfiniteScrollSentinel
                  hasNextPage={Boolean(childrenHasNextPage) && !childrenError}
                  isFetchingNextPage={childrenFetchingNext}
                  onLoadMore={fetchChildrenNextPage}
                  label="Load more child pages"
                />
              </motion.div>
            )}
        </AnimatePresence>
      </div>

      <ConfirmDialog
        open={deleteDialogOpen}
        onOpenChange={handleDeleteDialogOpenChange}
        title="Move page to trash?"
        description={`“${node.title || "Untitled"}” will be moved to the Recycle Bin. You can restore it from the Recycle Bin.`}
        destructive
        confirmLabel="Move to trash"
        isPending={deletePage.isPending}
        onConfirm={handleConfirmDelete}
      />
    </>
  );
});

export default PageTreeItem;
