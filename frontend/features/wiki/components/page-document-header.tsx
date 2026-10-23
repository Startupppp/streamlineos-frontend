"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Sheet,
  SheetBody,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { LoadingButton } from "@/components/ui/loading-button";
import { useDeleteKbPage } from "@/hooks/api/kb/pages";
import { useCreateKbPageTemplate } from "@/hooks/api/kb/page-templates";
import type { KbPageDetail } from "@/hooks/api/kb/page-types";
import PageCommentsSheet from "./page-comments-sheet";
import PageHistorySheet from "./page-history-sheet";
import MovePageDialog from "./move-page-dialog";
import PageMetadataSheet from "./page-metadata-sheet";
import { PageRecordLinks } from "./page-record-links";
import { PageDocumentBreadcrumb } from "./page-document-breadcrumb";
import { PageDocumentToolbar } from "./page-document-toolbar";
import { KNOWLEDGE_BASE } from "@/lib/knowledge-routes";
import { isApiError } from "@/lib/api-envelope";
import { getErrorMessage } from "@/lib/get-error-message";
import type { PageSaveState } from "./use-page-autosave";

interface PageDocumentHeaderProps {
  page: KbPageDetail;
  pageId: number;
  saveState: PageSaveState;
  savedAt?: Date | null;
  isOffline?: boolean;
  onRetrySave?: () => void;
  isEditable: boolean;
  onNavigate: (pageId: number) => void;
  currentContent?: string;
  onApplyImprovement?: (text: string) => void;
  onInsertSummary?: (text: string) => void;
  onOpenCover: () => void;
  onOpenDetailsPanel?: () => void;
  onSpreadsheetExport?: (format: "xlsx" | "csv") => void;
  projectId?: number;
  workbookSaveHostRef?: (node: HTMLElement | null) => void;
  moreOptionsHost?: HTMLElement | null;
}

export default function PageDocumentHeader({
  page,
  pageId,
  saveState,
  savedAt,
  isOffline,
  onRetrySave,
  isEditable,
  onNavigate,
  currentContent,
  onApplyImprovement,
  onInsertSummary,
  onOpenCover,
  onOpenDetailsPanel,
  onSpreadsheetExport,
  projectId,
  workbookSaveHostRef,
  moreOptionsHost,
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
  const [linkedRecordsOpen, setLinkedRecordsOpen] = useState(false);

  function handleOpenMetaSheet() {
    setMetaSheetOpen(true);
  }

  function handleMetaSheetOpenChange(open: boolean) {
    setMetaSheetOpen(open);
  }

  function handleOpenLinkedRecords() {
    setLinkedRecordsOpen(true);
  }

  function handleLinkedRecordsOpenChange(open: boolean) {
    setLinkedRecordsOpen(open);
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
        toast.success("File moved to trash");
        router.push(afterDeleteHref);
      },
      onError: (error) => toast.error(getErrorMessage(error)),
    });
  }

  function handleTemplateNameChange(e: React.ChangeEvent<HTMLInputElement>) {
    setTemplateName(e.target.value);
  }

  function handleConfirmTemplate() {
    const name = templateName.trim();
    if (!name) return;
    createTemplate.mutate(
      { fromPageId: pageId, name },
      {
        onSuccess: () => {
          toast.success("Template saved");
          setTemplateDialogOpen(false);
          setTemplateName("");
        },
        onError: (error) =>
          toast.error(
            isApiError(error) && error.status === 409
              ? `A template named "${name}" already exists. Choose another name.`
              : getErrorMessage(error),
          ),
      },
    );
  }

  function handleCancelTemplate() {
    setTemplateDialogOpen(false);
  }

  return (
    <>
      <div className="flex min-w-0 flex-col gap-2 sm:flex-row sm:items-center sm:justify-between sm:gap-3">
        <PageDocumentBreadcrumb
          page={page}
          saveState={saveState}
          savedAt={savedAt}
          isOffline={isOffline}
          onRetrySave={onRetrySave}
          projectId={projectId}
          workbookSaveHostRef={workbookSaveHostRef}
        />
        <PageDocumentToolbar
          page={page}
          pageId={pageId}
          isEditable={isEditable}
          currentContent={currentContent}
          onApplyImprovement={onApplyImprovement}
          onInsertSummary={onInsertSummary}
          onOpenMetaSheet={handleOpenMetaSheet}
          onOpenComments={handleOpenComments}
          onOpenHistory={handleOpenHistory}
          onOpenMove={handleOpenMove}
          onOpenSaveAsTemplate={handleOpenSaveAsTemplate}
          onOpenCover={onOpenCover}
          onOpenLinkedRecords={handleOpenLinkedRecords}
          onDelete={handleDelete}
          onNavigate={onNavigate}
          onOpenDetailsPanel={onOpenDetailsPanel}
          onSpreadsheetExport={onSpreadsheetExport}
          moreOptionsHost={moreOptionsHost}
        />
      </div>

      <PageCommentsSheet
        pageId={pageId}
        open={commentsOpen}
        content={page.content}
        onOpenChange={setCommentsOpen}
      />
      <PageHistorySheet
        pageId={pageId}
        open={historyOpen}
        projectId={projectId}
        onOpenChange={setHistoryOpen}
      />
      <MovePageDialog
        pageId={pageId}
        currentParentId={page.parentPageId}
        open={moveOpen}
        onOpenChange={setMoveOpen}
      />

      <ConfirmDialog
        open={deleteAlertOpen}
        onOpenChange={handleDeleteAlertOpenChange}
        title="Move file to trash?"
        description="This file will be moved to the Recycle Bin. You can restore it from the Recycle Bin."
        destructive
        confirmLabel="Move to trash"
        isPending={deletePage.isPending}
        onConfirm={handleConfirmDelete}
      />

      <Dialog open={templateDialogOpen} onOpenChange={setTemplateDialogOpen}>
        <DialogContent className="sm:max-w-md gap-3">
          <DialogHeader>
            <DialogTitle>Save as template</DialogTitle>
            <DialogDescription className="text-xs">
              Reuse this file&apos;s structure when creating new files.
            </DialogDescription>
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

      <Sheet
        open={linkedRecordsOpen}
        onOpenChange={handleLinkedRecordsOpenChange}
      >
        <SheetContent
          side="right"
          className="flex flex-col gap-0 p-0 sm:max-w-sm"
        >
          <SheetHeader className="border-b border-border px-4 py-3 pr-12">
            <SheetTitle>Linked records</SheetTitle>
          </SheetHeader>
          <SheetBody>
            <div className="px-4 py-4">
              <PageRecordLinks pageId={pageId} />
            </div>
          </SheetBody>
        </SheetContent>
      </Sheet>
    </>
  );
}
