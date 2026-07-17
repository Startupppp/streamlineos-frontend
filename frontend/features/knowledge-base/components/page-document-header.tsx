"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  KbChevronRightIcon,
  KbCopyIcon,
  KbFileDownIcon,
  KbHistoryIcon,
  KbInfoIcon,
  KbLink2Icon,
  KbLoader2Icon,
  KbLockIcon,
  KbMessageSquareIcon,
  KbMoreHorizontalIcon,
  KbMoveRightIcon,
  KbSaveIcon,
  KbStarIcon,
  KbTrash2Icon,
  KbUnlockIcon,
} from "@/features/knowledge-base/lib/kb-icons";
import { Badge } from "@/components/ui/badge";
import { TruncatedText } from "@/components/ui/truncated-text";
import PageMetadataSheet from "./page-metadata-sheet";
import { Button } from "@/components/ui/button";
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
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
import { Input } from "@/components/ui/input";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  useToggleFavoriteKbPage,
  useDeleteKbPage,
  useDuplicateKbPage,
  useLockKbPage,
  useKbPageBacklinks,
  useCreateKbPageTemplate,
} from "@/hooks/api/kb";
import { useCan } from "@/hooks/api/access";
import type { KbPageDetail } from "@/hooks/api/kb/pages";
import PageCommentsSheet from "./page-comments-sheet";
import PageHistorySheet from "./page-history-sheet";
import MovePageDialog from "./move-page-dialog";
import PageSharePopover from "./page-share-popover";
import { exportPageToHtml } from "@/features/knowledge-base/lib/export-page";
import { KNOWLEDGE_BASE, pageHref } from "@/features/knowledge-base/lib/knowledge-routes";

interface PageDocumentHeaderProps {
  page: KbPageDetail;
  pageId: number;
  saveState: "idle" | "pending" | "saving" | "saved";
  onNavigate: (pageId: number) => void;
}

const STATUS_LABELS: Record<string, string> = {
  draft: "Draft",
  in_review: "In Review",
  published: "Published",
  archived: "Archived",
};

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

export default function PageDocumentHeader({
  page,
  pageId,
  saveState,
  onNavigate,
}: PageDocumentHeaderProps) {
  const router = useRouter();
  const canCreate = useCan("kb:pages:create");
  const canDelete = useCan("kb:pages:delete");
  const canManage = useCan("kb:pages:manage");
  const canUpdate = useCan("kb:pages:update");
  const canTemplates = useCan("kb:templates:manage");

  const toggleFavorite = useToggleFavoriteKbPage();
  const deletePage = useDeleteKbPage();
  const duplicatePage = useDuplicateKbPage();
  const lockPage = useLockKbPage();
  const createTemplate = useCreateKbPageTemplate();
  const { data: backlinks = [] } = useKbPageBacklinks(pageId);

  const [commentsOpen, setCommentsOpen] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [moveOpen, setMoveOpen] = useState(false);
  const [templateDialogOpen, setTemplateDialogOpen] = useState(false);
  const [templateName, setTemplateName] = useState("");
  const [backlinksOpen, setBacklinksOpen] = useState(false);
  const [deleteAlertOpen, setDeleteAlertOpen] = useState(false);
  const [metaSheetOpen, setMetaSheetOpen] = useState(false);

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

  function handleDelete() {
    setDeleteAlertOpen(true);
  }

  function handleConfirmDelete() {
    deletePage.mutate(pageId, {
      onSuccess: () => {
        toast.success("Page moved to trash");
        router.push(KNOWLEDGE_BASE);
      },
      onError: () => toast.error("Failed to delete page"),
    });
  }

  function handleDeleteAlertOpenChange(open: boolean) {
    setDeleteAlertOpen(open);
  }

  function handleOpenMetaSheet() {
    setMetaSheetOpen(true);
  }

  function handleMetaSheetOpenChange(open: boolean) {
    setMetaSheetOpen(open);
  }

  function handleExportHtml() {
    exportPageToHtml(page.title, page.content);
  }

  function handleOpenSaveAsTemplate() {
    setTemplateName(page.title);
    setTemplateDialogOpen(true);
  }

  function handleTemplateNameChange(e: React.ChangeEvent<HTMLInputElement>) {
    setTemplateName(e.target.value);
  }

  function handleConfirmTemplate() {
    if (!templateName.trim()) return;
    createTemplate.mutate(
      { fromPageId: pageId, name: templateName.trim() },
      {
        onSuccess: () => {
          toast.success("Template saved");
          setTemplateDialogOpen(false);
          setTemplateName("");
        },
        onError: () => toast.error("Failed to save template"),
      }
    );
  }

  function handleCancelTemplate() {
    setTemplateDialogOpen(false);
  }

  function handleOpenComments() {
    setCommentsOpen(true);
  }

  function handleOpenHistory() {
    setHistoryOpen(true);
  }

  function handleOpenMove() {
    setMoveOpen(true);
  }

  function handleBacklinkClick(e: React.MouseEvent<HTMLButtonElement>) {
    const id = e.currentTarget.dataset.pageId;
    if (!id) return;
    onNavigate(Number(id));
    setBacklinksOpen(false);
  }

  const ancestors = page.ancestors ?? [];

  const statusBadgeClass: Record<string, string> = {
    draft: "bg-muted text-muted-foreground border-border",
    in_review: "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-500/10 dark:text-amber-300 dark:border-amber-500/30",
    published: "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-300 dark:border-emerald-500/30",
    archived: "bg-muted text-muted-foreground border-border opacity-60",
  };

  return (
    <>
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <nav className="flex items-center gap-1 text-sm text-muted-foreground flex-wrap min-w-0">
          <Link
            href={KNOWLEDGE_BASE}
            className="hover:text-foreground transition-colors shrink-0"
          >
            Wiki
          </Link>
          {ancestors.map((a) => (
            <span key={a.id} className="flex items-center gap-1 min-w-0">
              <KbChevronRightIcon className="h-3 w-3 shrink-0" />
              <Link
                href={pageHref(a.id)}
                className="hover:text-foreground transition-colors truncate max-w-[120px] min-w-0"
                title={a.title || "Untitled"}
              >
                {a.title || "Untitled"}
              </Link>
            </span>
          ))}
          <span className="flex items-center gap-1 shrink-0">
            <KbChevronRightIcon className="h-3 w-3" />
            <TruncatedText text={page.title || "Untitled"} className="text-foreground font-medium max-w-[200px]" />
          </span>
        </nav>

        <TooltipProvider delayDuration={0}>
          <div className="flex items-center gap-1 shrink-0">
          {(saveState === "pending" || saveState === "saving") && (
            <span className="flex items-center gap-1 text-xs text-muted-foreground mr-2">
              <KbLoader2Icon className="h-3 w-3 animate-spin" />
              Saving…
            </span>
          )}
          {saveState === "saved" && (
            <span className="text-xs text-muted-foreground mr-2">Saved</span>
          )}

          {page.status && (
            <div className="flex items-center gap-1.5 mr-1">
              <Badge
                variant="outline"
                className={`text-[10px] h-4 px-1.5 ${statusBadgeClass[page.status] ?? ""}`}
              >
                {STATUS_LABELS[page.status] ?? page.status}
              </Badge>
              {page.trustState === "verified" && (
                <Badge
                  variant="outline"
                  className="text-[10px] h-4 px-1.5 bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-300 dark:border-emerald-500/30"
                >
                  Verified
                </Badge>
              )}
              {page.trustState === "verification_expired" && (
                <Badge
                  variant="outline"
                  className="text-[10px] h-4 px-1.5 bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-500/10 dark:text-amber-300 dark:border-amber-500/30"
                >
                  Stale
                </Badge>
              )}
            </div>
          )}

            <HeaderToolbarTooltip label="Page info">
              <Button
                variant="ghost"
                size="icon"
                className="w-8"
                onClick={handleOpenMetaSheet}
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
                className={`h-8 w-8 ${page.isFavorite ? "text-amber-500" : ""}`}
                onClick={handleToggleFavorite}
                aria-label={page.isFavorite ? "Remove from favorites" : "Add to favorites"}
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
                onClick={handleOpenComments}
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
                onClick={handleOpenHistory}
                aria-label="View page history"
              >
                <KbHistoryIcon className="h-4 w-4" />
              </Button>
            </HeaderToolbarTooltip>

          {canUpdate && <PageSharePopover page={page} />}

            <Popover open={backlinksOpen} onOpenChange={setBacklinksOpen}>
              <HeaderToolbarTooltip label="Backlinks">
                <PopoverTrigger asChild>
                  <Button variant="ghost" size="icon" className="w-8" aria-label="View backlinks">
                    <KbLink2Icon className="h-4 w-4" />
                  </Button>
                </PopoverTrigger>
              </HeaderToolbarTooltip>
            <PopoverContent align="end" className="w-64 p-3">
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
            </PopoverContent>
            </Popover>

            <DropdownMenu>
              <HeaderToolbarTooltip label="More actions">
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="w-8" aria-label="More options">
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
              <DropdownMenuItem onSelect={handleOpenMove}>
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
                <DropdownMenuItem onSelect={handleOpenSaveAsTemplate}>
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
                  <DropdownMenuItem variant="destructive"
                    onSelect={handleDelete}
                  >
                    <KbTrash2Icon className="h-4 w-4 mr-2" />
                    Delete
                  </DropdownMenuItem>
                </>
              )}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </TooltipProvider>
      </div>

      <PageCommentsSheet
        pageId={pageId}
        open={commentsOpen}
        onOpenChange={setCommentsOpen}
      />
      <PageHistorySheet
        pageId={pageId}
        open={historyOpen}
        onOpenChange={setHistoryOpen}
      />
      <MovePageDialog
        pageId={pageId}
        currentParentId={page.parentPageId}
        open={moveOpen}
        onOpenChange={setMoveOpen}
      />

      <AlertDialog open={deleteAlertOpen} onOpenChange={handleDeleteAlertOpenChange}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Move page to trash?</AlertDialogTitle>
            <AlertDialogDescription>
              This page will be moved to trash. You can restore it from trash later.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={handleConfirmDelete}
              disabled={deletePage.isPending}
            >
              Move to trash
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog open={templateDialogOpen} onOpenChange={setTemplateDialogOpen}>
        <DialogContent className="sm:max-w-md gap-3">
          <DialogHeader>
            <DialogTitle>Save as template</DialogTitle>
          </DialogHeader>
          <Input
            value={templateName}
            onChange={handleTemplateNameChange}
            placeholder="Template name"
          />
          <DialogFooter>
            <Button variant="outline" size="sm" onClick={handleCancelTemplate}>
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={handleConfirmTemplate}
              disabled={createTemplate.isPending || !templateName.trim()}
            >
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <PageMetadataSheet
        pageId={pageId}
        page={page}
        open={metaSheetOpen}
        onOpenChange={handleMetaSheetOpenChange}
      />
    </>
  );
}
