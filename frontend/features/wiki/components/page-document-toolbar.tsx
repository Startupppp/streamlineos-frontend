"use client";

import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { getErrorMessage } from "@/lib/get-error-message";
import {
  KbCopyIcon,
  KbFileDownIcon,
  KbHistoryIcon,
  KbImageIcon,
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
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Check } from "lucide-react";
import { TruncatedText } from "@/components/ui/truncated-text";
import {
  useToggleFavoriteKbPage,
  useDuplicateKbPage,
  useLockKbPage,
  useKbPageBacklinks,
} from "@/hooks/api/kb";
import { useCan } from "@/hooks/api/access";
import type { KbPageDetail } from "@/hooks/api/kb/page-types";
import { KbPageAiActions } from "./kb-page-ai-actions";
import PageSharePopover from "./page-share-popover";
import { exportPageToHtml } from "@/features/wiki/lib/export-page";
import { pageHref } from "@/lib/knowledge-routes";

interface PageDocumentToolbarProps {
  page: KbPageDetail;
  pageId: number;
  isEditable: boolean;
  onApplyImprovement?: (text: string) => void;
  onInsertSummary?: (text: string) => void;
  onOpenMetaSheet: () => void;
  onOpenComments: () => void;
  onOpenHistory: () => void;
  onOpenMove: () => void;
  onOpenSaveAsTemplate: () => void;
  onOpenCover: () => void;
  onDelete: () => void;
  onNavigate: (pageId: number) => void;
}

export function PageDocumentToolbar({
  page,
  pageId,
  isEditable,
  onApplyImprovement,
  onInsertSummary,
  onOpenMetaSheet,
  onOpenComments,
  onOpenHistory,
  onOpenMove,
  onOpenSaveAsTemplate,
  onOpenCover,
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

  function handleToggleFavorite() {
    toggleFavorite.mutate(
      { pageId, isFavorite: page.isFavorite },
      { onError: () => toast.error("Failed to update favorites") },
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
      },
    );
  }

  function handleExportHtml() {
    void exportPageToHtml(page.title, page.content).catch((error: unknown) =>
      toast.error(getErrorMessage(error)),
    );
  }

  function handleBacklinkSelect(event: Event) {
    const target = event.currentTarget;
    if (!(target instanceof HTMLElement)) return;
    const id = target.dataset.pageId;
    if (!id) return;
    onNavigate(Number(id));
  }

  function handleFavoriteCheckedChange() {
    handleToggleFavorite();
  }

  function handleLockCheckedChange() {
    handleToggleLock();
  }

  return (
    <div className="flex items-center gap-1.5 shrink-0">
      <KbPageAiActions
        pageId={pageId}
        onApplyImprovement={onApplyImprovement}
        onInsertSummary={onInsertSummary}
      />
      {canUpdate && <PageSharePopover page={page} />}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-9 w-9 px-0"
            aria-label="More options"
          >
            <KbMoreHorizontalIcon className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56">
          <DropdownMenuItem onSelect={onOpenComments}>
            <KbMessageSquareIcon className="mr-2 h-4 w-4" />
            Comments
          </DropdownMenuItem>
          <DropdownMenuItem onSelect={onOpenHistory}>
            <KbHistoryIcon className="mr-2 h-4 w-4" />
            Version history
          </DropdownMenuItem>
          <DropdownMenuItem onSelect={onOpenMetaSheet}>
            <KbInfoIcon className="mr-2 h-4 w-4" />
            Page info
          </DropdownMenuItem>
          <DropdownMenuCheckboxItem
            checked={page.isFavorite}
            onCheckedChange={handleFavoriteCheckedChange}
            aria-label={page.isFavorite ? "Favorited" : "Add to favorites"}
          >
            <KbStarIcon className="mr-2 h-4 w-4" />
            {page.isFavorite ? "Favorited" : "Add to favorites"}
          </DropdownMenuCheckboxItem>
          <DropdownMenuSeparator />
          {isEditable && (
            <DropdownMenuItem onSelect={onOpenCover}>
              <KbImageIcon className="mr-2 h-4 w-4" />
              {page.coverImage ? "Change cover" : "Add cover"}
              {page.coverImage ? (
                <Check className="ml-auto h-4 w-4 text-foreground" />
              ) : null}
            </DropdownMenuItem>
          )}
          {canCreate && (
            <DropdownMenuItem onSelect={handleDuplicate}>
              <KbCopyIcon className="mr-2 h-4 w-4" />
              Duplicate
            </DropdownMenuItem>
          )}
          <DropdownMenuItem onSelect={onOpenMove}>
            <KbMoveRightIcon className="mr-2 h-4 w-4" />
            Move
          </DropdownMenuItem>
          {canManage && (
            <DropdownMenuCheckboxItem
              checked={page.isLocked}
              onCheckedChange={handleLockCheckedChange}
              aria-label={page.isLocked ? "Locked" : "Lock page"}
            >
              {page.isLocked ? (
                <KbUnlockIcon className="mr-2 h-4 w-4" />
              ) : (
                <KbLockIcon className="mr-2 h-4 w-4" />
              )}
              {page.isLocked ? "Locked" : "Lock page"}
            </DropdownMenuCheckboxItem>
          )}
          {canTemplates && (
            <DropdownMenuItem onSelect={onOpenSaveAsTemplate}>
              <KbSaveIcon className="mr-2 h-4 w-4" />
              Save as template
            </DropdownMenuItem>
          )}
          <DropdownMenuItem onSelect={handleExportHtml}>
            <KbFileDownIcon className="mr-2 h-4 w-4" />
            Export HTML
          </DropdownMenuItem>
          <DropdownMenuSub>
            <DropdownMenuSubTrigger>
              <KbLink2Icon className="mr-2 h-4 w-4" />
              Backlinks ({backlinks.length})
            </DropdownMenuSubTrigger>
            <DropdownMenuSubContent className="w-56">
              {backlinks.length === 0 ? (
                <div className="px-2 py-1.5 text-xs text-muted-foreground">
                  No pages link here yet.
                </div>
              ) : (
                backlinks.map((bl) => (
                  <DropdownMenuItem
                    key={bl.id}
                    data-page-id={String(bl.id)}
                    onSelect={handleBacklinkSelect}
                  >
                    <span className="mr-2 shrink-0">{bl.icon ?? "📄"}</span>
                    <TruncatedText text={bl.title || "Untitled"} />
                  </DropdownMenuItem>
                ))
              )}
            </DropdownMenuSubContent>
          </DropdownMenuSub>
          {canDelete && (
            <>
              <DropdownMenuSeparator />
              <DropdownMenuItem variant="destructive" onSelect={onDelete}>
                <KbTrash2Icon className="mr-2 h-4 w-4" />
                Delete
              </DropdownMenuItem>
            </>
          )}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
