"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
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
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { LoadingButton } from "@/components/ui/loading-button";
import { useDeleteKbPage, useCreateKbPageTemplate } from "@/hooks/api/kb";
import type { KbPageDetail } from "@/hooks/api/kb/page-types";
import PageCommentsSheet from "./page-comments-sheet";
import PageHistorySheet from "./page-history-sheet";
import MovePageDialog from "./move-page-dialog";
import PageMetadataSheet from "./page-metadata-sheet";
import { PageDocumentBreadcrumb } from "./page-document-breadcrumb";
import { PageDocumentToolbar } from "./page-document-toolbar";
import { KNOWLEDGE_BASE } from "@/lib/knowledge-routes";

interface PageDocumentHeaderProps {
  page: KbPageDetail;
  pageId: number;
  saveState: "idle" | "pending" | "saving" | "saved";
  savedAt?: Date | null;
  isOffline?: boolean;
  isEditable: boolean;
  onNavigate: (pageId: number) => void;
  onApplyImprovement?: (text: string) => void;
  onInsertSummary?: (text: string) => void;
  onOpenCover: () => void;
  projectId?: number;
}

export default function PageDocumentHeader({
  page,
  pageId,
  saveState,
  savedAt,
  isOffline,
  isEditable,
  onNavigate,
  onApplyImprovement,
  onInsertSummary,
  onOpenCover,
  projectId,
}: PageDocumentHeaderProps) {
  const router = useRouter();
  const deletePage = useDeleteKbPage();
  const createTemplate = useCreateKbPageTemplate();

  const [commentsOpen, setCommentsOpen] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [moveOpen, setMoveOpen] = useState(false);
  const [templateDialogOpen, setTemplateDialogOpen] = useState(false);
  const [templateName, setTemplateName] = useState("");
  const [deleteAlertOpen, setDeleteAlertOpen] = useState(false);
  const [metaSheetOpen, setMetaSheetOpen] = useState(false);

  function handleOpenMetaSheet() {
    setMetaSheetOpen(true);
  }

  function handleMetaSheetOpenChange(open: boolean) {
    setMetaSheetOpen(open);
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

  function handleOpenSaveAsTemplate() {
    setTemplateName(page.title);
    setTemplateDialogOpen(true);
  }

  function handleDelete() {
    setDeleteAlertOpen(true);
  }

  function handleDeleteAlertOpenChange(open: boolean) {
    setDeleteAlertOpen(open);
  }

  function handleConfirmDelete() {
    const afterDeleteHref =
      projectId !== undefined && projectId > 0
        ? `/build/${projectId}/wiki`
        : KNOWLEDGE_BASE;
    deletePage.mutate(pageId, {
      onSuccess: () => {
        toast.success("Page moved to trash");
        router.push(afterDeleteHref);
      },
      onError: () => toast.error("Failed to delete page"),
    });
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

  return (
    <>
      <div className="flex min-w-0 items-center justify-between gap-3">
        <PageDocumentBreadcrumb
          page={page}
          saveState={saveState}
          savedAt={savedAt}
          isOffline={isOffline}
          projectId={projectId}
        />
        <PageDocumentToolbar
          page={page}
          pageId={pageId}
          isEditable={isEditable}
          onApplyImprovement={onApplyImprovement}
          onInsertSummary={onInsertSummary}
          onOpenMetaSheet={handleOpenMetaSheet}
          onOpenComments={handleOpenComments}
          onOpenHistory={handleOpenHistory}
          onOpenMove={handleOpenMove}
          onOpenSaveAsTemplate={handleOpenSaveAsTemplate}
          onOpenCover={onOpenCover}
          onDelete={handleDelete}
          onNavigate={onNavigate}
        />
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
            <LoadingButton
              size="sm"
              onClick={handleConfirmTemplate}
              isPending={createTemplate.isPending}
              loadingText="Saving…"
              disabled={!templateName.trim()}
            >
              Save
            </LoadingButton>
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
