"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  Star,
  MessageSquare,
  History,
  Link2,
  MoreHorizontal,
  Lock,
  Unlock,
  Copy,
  Trash2,
  MoveRight,
  FileDown,
  Loader2,
  ChevronRight,
  Save,
} from "lucide-react";
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
import { Input } from "@/components/ui/input";
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
import { exportPageToHtml } from "@/features/knowledge-base/lib/export-page";

interface PageDocumentHeaderProps {
  page: KbPageDetail;
  pageId: number;
  saveState: "idle" | "pending" | "saving" | "saved";
  onNavigate: (pageId: number) => void;
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
        router.push(`/knowledge-base/pages/${dup.id}`);
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
    if (!window.confirm("Move this page to trash?")) return;
    deletePage.mutate(pageId, {
      onSuccess: () => {
        toast.success("Page moved to trash");
        router.push("/knowledge-base");
      },
      onError: () => toast.error("Failed to delete page"),
    });
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

  return (
    <>
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <nav className="flex items-center gap-1 text-sm text-muted-foreground flex-wrap min-w-0">
          <Link
            href="/knowledge-base"
            className="hover:text-foreground transition-colors shrink-0"
          >
            Wiki
          </Link>
          {ancestors.map((a) => (
            <span key={a.id} className="flex items-center gap-1 shrink-0">
              <ChevronRight className="h-3 w-3" />
              <Link
                href={`/knowledge-base/pages/${a.id}`}
                className="hover:text-foreground transition-colors truncate max-w-[120px]"
              >
                {a.title || "Untitled"}
              </Link>
            </span>
          ))}
          <span className="flex items-center gap-1 shrink-0">
            <ChevronRight className="h-3 w-3" />
            <span className="text-foreground font-medium truncate max-w-[200px]">
              {page.title || "Untitled"}
            </span>
          </span>
        </nav>

        <div className="flex items-center gap-1 shrink-0">
          {(saveState === "pending" || saveState === "saving") && (
            <span className="flex items-center gap-1 text-xs text-muted-foreground mr-2">
              <Loader2 className="h-3 w-3 animate-spin" />
              Saving…
            </span>
          )}
          {saveState === "saved" && (
            <span className="text-xs text-muted-foreground mr-2">Saved</span>
          )}

          <Button
            variant="ghost"
            size="icon"
            className={`h-8 w-8 ${page.isFavorite ? "text-amber-500" : ""}`}
            onClick={handleToggleFavorite}
            aria-label={page.isFavorite ? "Remove from favorites" : "Add to favorites"}
          >
            <Star
              className={`h-4 w-4 ${page.isFavorite ? "fill-amber-500" : ""}`}
            />
          </Button>

          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={handleOpenComments}
            aria-label="Open comments"
          >
            <MessageSquare className="h-4 w-4" />
          </Button>

          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={handleOpenHistory}
            aria-label="View page history"
          >
            <History className="h-4 w-4" />
          </Button>

          <Popover open={backlinksOpen} onOpenChange={setBacklinksOpen}>
            <PopoverTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8" aria-label="View backlinks">
                <Link2 className="h-4 w-4" />
              </Button>
            </PopoverTrigger>
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
                      <span className="truncate">{bl.title || "Untitled"}</span>
                    </button>
                  ))}
                </div>
              )}
            </PopoverContent>
          </Popover>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8" aria-label="More options">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              {canCreate && (
                <DropdownMenuItem onSelect={handleDuplicate}>
                  <Copy className="h-4 w-4 mr-2" />
                  Duplicate
                </DropdownMenuItem>
              )}
              <DropdownMenuItem onSelect={handleOpenMove}>
                <MoveRight className="h-4 w-4 mr-2" />
                Move
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              {canManage && (
                <DropdownMenuItem onSelect={handleToggleLock}>
                  {page.isLocked ? (
                    <Unlock className="h-4 w-4 mr-2" />
                  ) : (
                    <Lock className="h-4 w-4 mr-2" />
                  )}
                  {page.isLocked ? "Unlock page" : "Lock page"}
                </DropdownMenuItem>
              )}
              {canTemplates && (
                <DropdownMenuItem onSelect={handleOpenSaveAsTemplate}>
                  <Save className="h-4 w-4 mr-2" />
                  Save as template
                </DropdownMenuItem>
              )}
              <DropdownMenuItem onSelect={handleExportHtml}>
                <FileDown className="h-4 w-4 mr-2" />
                Export HTML
              </DropdownMenuItem>
              {canDelete && (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onSelect={handleDelete}
                    className="text-destructive focus:text-destructive"
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Delete
                  </DropdownMenuItem>
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
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

      <Dialog open={templateDialogOpen} onOpenChange={setTemplateDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Save as template</DialogTitle>
          </DialogHeader>
          <Input
            value={templateName}
            onChange={handleTemplateNameChange}
            placeholder="Template name"
          />
          <DialogFooter>
            <Button variant="outline" onClick={handleCancelTemplate}>
              Cancel
            </Button>
            <Button
              onClick={handleConfirmTemplate}
              disabled={createTemplate.isPending || !templateName.trim()}
            >
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
