"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  KbCopyIcon,
  KbFileDownIcon,
  KbHistoryIcon,
  KbInfoIcon,
  KbLink2Icon,
  KbLockIcon,
  KbMessageSquareIcon,
  KbMoreHorizontalIcon,
  KbMoveRightIcon,
  KbSaveIcon,
  KbStarIcon,
  KbTrash2Icon,
  KbUnlockIcon,
} from "@/features/wiki/lib/kb-icons";
import { Button } from "@/components/ui/button";
import {
  ResponsivePopover,
  ResponsivePopoverTrigger,
  ResponsivePopoverContent,
} from "@/components/ui/responsive-popover";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { TruncatedText } from "@/components/ui/truncated-text";
import {
  useToggleFavoriteKbPage,
  useDuplicateKbPage,
  useLockKbPage,
  useKbPageBacklinks,
} from "@/hooks/api/kb";
import { useCan } from "@/hooks/api/access";
import type { KbPageDetail } from "@/hooks/api/kb/pages";
import { KbPageAiActions } from "./kb-page-ai-actions";
import PageSharePopover from "./page-share-popover";
import { exportPageToHtml } from "@/features/wiki/lib/export-page";
import { pageHref } from "@/features/wiki/lib/knowledge-routes";

interface PageDocumentToolbarProps {
  page: KbPageDetail;
  pageId: number;
  onApplyImprovement?: (text: string) => void;
  onOpenMetaSheet: () => void;
  onOpenComments: () => void;
  onOpenHistory: () => void;
  onOpenMove: () => void;
  onOpenSaveAsTemplate: () => void;
  onDelete: () => void;
  onNavigate: (pageId: number) => void;
}

function HeaderToolbarTooltip({
  label,
  children,
}: {
  label: string;
  children: React.ReactElement;
}) {
  return (
    <Tooltip delayDuration={0}>
      <TooltipTrigger asChild>{children}</TooltipTrigger>
      <TooltipContent side="bottom" sideOffset={8} className="text-xs font-medium">
        {label}
      </TooltipContent>
    </Tooltip>
  );
}

export function PageDocumentToolbar({
  page,
  pageId,
  onApplyImprovement,
  onOpenMetaSheet,
  onOpenComments,
  onOpenHistory,
  onOpenMove,
  onOpenSaveAsTemplate,
  onDelete,
  onNavigate,
}: PageDocumentToolbarProps) {
  const router = useRouter();
  const canCreate = useCan("kb:pages:create");
  const canManage = useCan("kb:pages:manage");
  const canUpdate = useCan("kb:pages:update");
  const canDelete = useCan("kb:pages:delete");
  const canTemplates = useCan("kb:templates:manage");

  const toggleFavorite = useToggleFavoriteKbPage();
  const duplicatePage = useDuplicateKbPage();
  const lockPage = useLockKbPage();
  const { data: backlinks = [] } = useKbPageBacklinks(pageId);

  const [backlinksOpen, setBacklinksOpen] = useState(false);

  function handleToggleFavorite() {
    toggleFavorite.mutate(
      { pageId, isFavorite: page.isFavorite },
      { onError: () => toast.error("Failed to update favorites") }
    );
  }

  function handleDuplicate() {
    duplicatePage.mutate(pageId, {
      onSuccess: (dup) => {
        toast.success("Page duplicated");
        router.push(pageHref(dup.id));
      },
      onError: () => toast.error("Failed to duplicate page"),
    });
  }

  function handleToggleLock() {
    lockPage.mutate(
      { pageId, isLocked: !page.isLocked },
      {
        onSuccess: () =>
          toast.success(page.isLocked ? "Page unlocked" : "Page locked"),
        onError: () => toast.error("Failed to update lock"),
      }
    );
  }

  function handleExportHtml() {
    exportPageToHtml(page.title, page.content);
  }

  function handleBacklinkClick(e: React.MouseEvent<HTMLButtonElement>) {
    const id = e.currentTarget.dataset.pageId;
    if (!id) return;
    onNavigate(Number(id));
    setBacklinksOpen(false);
  }

  return (
    <TooltipProvider delayDuration={0}>
      <div className="flex items-center gap-1 shrink-0">
        <KbPageAiActions
          pageId={pageId}
          onApplyImprovement={onApplyImprovement}
        />

        <HeaderToolbarTooltip label="Page info">
          <Button
            variant="ghost"
            size="icon"
            className="w-8"
            onClick={onOpenMetaSheet}
            aria-label="Page settings"
          >
            <KbInfoIcon className="h-4 w-4" />
          </Button>
        </HeaderToolbarTooltip>

        <HeaderToolbarTooltip
          label={page.isFavorite ? "Remove from favorites" : "Add to favorites"}
        >
          <Button
            variant="ghost"
            size="icon"
            className={`h-8 w-8 ${page.isFavorite ? "text-status-warning-ink" : ""}`}
            onClick={handleToggleFavorite}
            aria-label={
              page.isFavorite ? "Remove from favorites" : "Add to favorites"
            }
          >
            <KbStarIcon
              className={`h-4 w-4 ${page.isFavorite ? "fill-amber-500" : ""}`}
            />
          </Button>
        </HeaderToolbarTooltip>

        <HeaderToolbarTooltip label="Comments">
          <Button
            variant="ghost"
            size="icon"
            className="w-8"
            onClick={onOpenComments}
            aria-label="Open comments"
          >
            <KbMessageSquareIcon className="h-4 w-4" />
          </Button>
        </HeaderToolbarTooltip>

        <HeaderToolbarTooltip label="Version history">
          <Button
            variant="ghost"
            size="icon"
            className="w-8"
            onClick={onOpenHistory}
            aria-label="View page history"
          >
            <KbHistoryIcon className="h-4 w-4" />
          </Button>
        </HeaderToolbarTooltip>

        {canUpdate && <PageSharePopover page={page} />}

        <ResponsivePopover open={backlinksOpen} onOpenChange={setBacklinksOpen}>
          <HeaderToolbarTooltip label="Backlinks">
            <ResponsivePopoverTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="w-8"
                aria-label="View backlinks"
              >
                <KbLink2Icon className="h-4 w-4" />
              </Button>
            </ResponsivePopoverTrigger>
          </HeaderToolbarTooltip>
          <ResponsivePopoverContent
            align="end"
            title="Backlinks"
            className="w-64 p-3"
          >
            <p className="text-xs font-semibold text-foreground mb-2">
              Backlinks ({backlinks.length})
            </p>
            {backlinks.length === 0 ? (
              <p className="text-xs text-muted-foreground">
                No pages link here yet.
              </p>
            ) : (
              <div className="space-y-1">
                {backlinks.map((bl) => (
                  <button
                    key={bl.id}
                    data-page-id={String(bl.id)}
                    className="flex items-center gap-2 w-full text-left text-sm p-1 rounded hover:bg-muted transition-colors"
                    onClick={handleBacklinkClick}
                  >
                    <span className="shrink-0">{bl.icon ?? "📄"}</span>
                    <TruncatedText text={bl.title || "Untitled"} />
                  </button>
                ))}
              </div>
            )}
          </ResponsivePopoverContent>
        </ResponsivePopover>

        <DropdownMenu>
          <HeaderToolbarTooltip label="More actions">
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="w-8"
                aria-label="More options"
              >
                <KbMoreHorizontalIcon className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
          </HeaderToolbarTooltip>
          <DropdownMenuContent align="end" className="w-48">
            {canCreate && (
              <DropdownMenuItem onSelect={handleDuplicate}>
                <KbCopyIcon className="h-4 w-4 mr-2" />
                Duplicate
              </DropdownMenuItem>
            )}
            <DropdownMenuItem onSelect={onOpenMove}>
              <KbMoveRightIcon className="h-4 w-4 mr-2" />
              Move
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            {canManage && (
              <DropdownMenuItem onSelect={handleToggleLock}>
                {page.isLocked ? (
                  <KbUnlockIcon className="h-4 w-4 mr-2" />
                ) : (
                  <KbLockIcon className="h-4 w-4 mr-2" />
                )}
                {page.isLocked ? "Unlock page" : "Lock page"}
              </DropdownMenuItem>
            )}
            {canTemplates && (
              <DropdownMenuItem onSelect={onOpenSaveAsTemplate}>
                <KbSaveIcon className="h-4 w-4 mr-2" />
                Save as template
              </DropdownMenuItem>
            )}
            <DropdownMenuItem onSelect={handleExportHtml}>
              <KbFileDownIcon className="h-4 w-4 mr-2" />
              Export HTML
            </DropdownMenuItem>
            {canDelete && (
              <>
                <DropdownMenuSeparator />
                <DropdownMenuItem variant="destructive" onSelect={onDelete}>
                  <KbTrash2Icon className="h-4 w-4 mr-2" />
                  Delete
                </DropdownMenuItem>
              </>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </TooltipProvider>
  );
}
