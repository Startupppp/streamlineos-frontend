"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { KbAlertCircleIcon } from "@/features/wiki/lib/kb-icons";
import { getErrorMessage } from "@/lib/get-error-message";
import { cn } from "@/lib/utils";
import { useKbPage, useUpdateKbPage, useRecordKbPageVisit } from "@/hooks/api/kb/pages";
import { useKbWorkbook } from "@/hooks/api/kb/workbook";
import { ErrorState } from "@/components/shared/error-state";
import { useCan, useCanState } from "@/hooks/api/access";
import { pageHref } from "@/lib/knowledge-routes";
import { toFortuneSheets, type FortuneSheet } from "@/features/wiki/lib/kb-workbook-convert";
import { exportSpreadsheet } from "@/features/wiki/lib/kb-spreadsheet-file";
import { DocumentRecordGate, documentRecordResolution } from "./document-record-gate";
import { PageSpreadsheetSkeleton } from "./page-document-skeleton";
import PageCover from "./page-cover";
import { PageCoverPickerDialog } from "./page-cover-picker";
import PageDocumentHeader from "./page-document-header";
import PageIconPicker from "./page-icon-picker";
import { PageDocumentPropertyActions } from "./page-document-property-actions";
import PageRightPanel from "./page-right-panel";
import PageEditConflict from "./page-edit-conflict";
import PageSpreadsheetGrid from "./page-spreadsheet-grid";
import { usePageAutosave, type PageAutosavePatch } from "./use-page-autosave";
import { usePagePresentationUpdate } from "./use-page-presentation-update";
import type { KbPageEditConflict } from "@/features/wiki/lib/wiki-schema";
import { WIKI_SPREADSHEET_COLUMN } from "@/features/wiki/lib/wiki-document-column";

interface PageSpreadsheetProps {
  pageId: number;
  onNavigateToPage?: (targetPageId: number) => void;
  projectId?: number;
}

function nextReload(current: number): number {
  return current + 1;
}

export default function PageSpreadsheet({ pageId, onNavigateToPage, projectId }: PageSpreadsheetProps) {
  const router = useRouter();
  const { data: page, isLoading, isError, error, refetch } = useKbPage(pageId);
  const workbookQuery = useKbWorkbook(pageId);
  const workbook = workbookQuery.data;
  const refetchWorkbook = workbookQuery.refetch;
  const updatePage = useUpdateKbPage();
  const recordVisit = useRecordKbPageVisit();
  const canUpdate = useCan("kb:pages:update");
  const canManage = useCan("kb:pages:manage");
  const viewAccess = useCanState("kb:pages:view");

  const [titleDraft, setTitleDraft] = useState<{ pageId: number; value: string } | null>(null);
  const [reloadNonce, setReloadNonce] = useState(0);
  const [isReloading, setIsReloading] = useState(false);
  const [coverPickerOpen, setCoverPickerOpen] = useState(false);
  const [detailsMobileOpen, setDetailsMobileOpen] = useState(false);
  const [workbookSaveHost, setWorkbookSaveHost] = useState<HTMLElement | null>(null);
  const visitedRef = useRef<number | null>(null);
  const titleRef = useRef<HTMLTextAreaElement>(null);
  const sheetsRef = useRef<FortuneSheet[] | null>(null);

  const handleWorkbookSaveHost = useCallback((node: HTMLElement | null) => {
    setWorkbookSaveHost(node);
  }, []);

  const handleSavePage = useCallback(
    (payload: PageAutosavePatch & { pageId: number; expectedContentRevision: number }) =>
      updatePage.mutateAsync(payload),
    [updatePage],
  );

  const handleConflict = useCallback((detail: KbPageEditConflict) => {
    toast.error("This page changed while you were editing", {
      description: `${detail.lastEditedByName ?? "Someone else"} saved a newer version. Your edits are kept — choose which version wins.`,
    });
  }, []);

  const handleSaveFailure = useCallback((err: unknown) => {
    toast.error("Failed to save page", { description: getErrorMessage(err) });
  }, []);

  const { saveState, conflict, savedAt, isOffline, pendingFields, schedule, retry, discardLocalEdits, keepLocalEdits } =
    usePageAutosave({ pageId, contentRevision: page?.contentRevision, save: handleSavePage, onConflict: handleConflict, onSaveError: handleSaveFailure });

  const { pendingPresentation, isRetryingPresentation, handleCoverChange, handleIconChange, handleRetryPresentation, discardPresentation } =
    usePagePresentationUpdate({ pageId, page, canManage, updatePage, refetch });

  useEffect(() => {
    if (visitedRef.current === pageId) return;
    visitedRef.current = pageId;
    recordVisit.mutate(pageId);
  }, [pageId, recordVisit]);

  useEffect(() => {
    sheetsRef.current = null;
  }, [pageId, reloadNonce]);

  const localTitle = titleDraft?.pageId === pageId ? titleDraft.value : (page?.title ?? "");

  const handleNavigateToPage = useCallback(
    (targetPageId: number) => {
      if (onNavigateToPage) { onNavigateToPage(targetPageId); } else { router.push(pageHref(targetPageId)); }
    },
    [router, onNavigateToPage],
  );

  const handleDiscardMine = useCallback(() => {
    setIsReloading(true);
    void refetch()
      .then(
        (result) => {
          if (!result.isSuccess || !result.data || (conflict?.currentContentRevision !== null && conflict?.currentContentRevision !== undefined && result.data.contentRevision < conflict.currentContentRevision)) {
            toast.error("Couldn't load the latest file version. Your edits are still here.");
            return;
          }
          discardLocalEdits();
          setTitleDraft(null);
          setReloadNonce(nextReload);
        },
        () => { toast.error("Couldn't load the latest file version. Your edits are still here."); },
      )
      .finally(() => setIsReloading(false));
  }, [conflict?.currentContentRevision, discardLocalEdits, refetch]);

  const handleReloadWorkbook = useCallback(() => {
    setIsReloading(true);
    void refetchWorkbook()
      .then(
        (result) => {
          if (!result.isSuccess) {
            toast.error("Couldn't load the latest spreadsheet version. Your edits are still here.");
            return;
          }
          setReloadNonce(nextReload);
        },
        () => { toast.error("Couldn't load the latest spreadsheet version. Your edits are still here."); },
      )
      .finally(() => setIsReloading(false));
  }, [refetchWorkbook]);

  const handleRefetchRevision = useCallback(
    () => refetchWorkbook().then((result) => (result.isSuccess ? result.data.contentRevision : null)),
    [refetchWorkbook],
  );

  const handleRetryWorkbook = useCallback(() => {
    void refetchWorkbook();
  }, [refetchWorkbook]);

  const handleCompareTitle = useCallback(
    () => Promise.resolve({ title: page?.title ?? "", body: "" }),
    [page?.title],
  );

  const handleExportSpreadsheet = useCallback(
    async (format: "xlsx" | "csv") => {
      const sheets = sheetsRef.current ?? (workbook ? toFortuneSheets(workbook.sheets) : []);
      try {
        await exportSpreadsheet(sheets, page?.title ?? "spreadsheet", format);
      } catch (err) {
        toast.error(getErrorMessage(err));
      }
    },
    [workbook, page?.title],
  );

  function handleTitleChange(e: React.ChangeEvent<HTMLTextAreaElement>) {
    setTitleDraft({ pageId, value: e.target.value });
    schedule({ title: e.target.value });
  }
  function handleTitleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter") e.preventDefault();
  }
  function handleOpenCover() { setCoverPickerOpen(true); }
  function handleCoverPickerOpenChange(open: boolean) { setCoverPickerOpen(open); }
  function handleOpenDetails() { setDetailsMobileOpen(true); }
  function handleDetailsMobileOpenChange(open: boolean) { setDetailsMobileOpen(open); }

  const recordResolution = documentRecordResolution({
    access: viewAccess,
    isLoading,
    isError,
    error,
    hasRecord: page !== undefined,
  });

  if (recordResolution.kind !== "ready" || !page) {
    return (
      <DocumentRecordGate
        resolution={
          recordResolution.kind === "ready"
            ? { kind: "error", error }
            : recordResolution
        }
        loading={<PageSpreadsheetSkeleton />}
        error={error}
        onRetry={() => {
          void refetch();
        }}
      />
    );
  }

  const isEditable = canUpdate && page.can.edit === true && (!page.isLocked || canManage);

  return (
    <div className="wiki-document flex h-full min-h-0 flex-1 flex-col overflow-hidden">
      <PageCover coverImage={page.coverImage} isEditable={isEditable} onCoverChange={handleCoverChange} onChangeCover={handleOpenCover} />
      <PageCoverPickerDialog open={coverPickerOpen} onOpenChange={handleCoverPickerOpenChange} onCoverChange={handleCoverChange} pageId={pageId} />
      <div className="flex min-h-0 min-w-0 flex-1">
        <div className="flex h-full min-h-0 min-w-0 flex-1 flex-col">
          <div className="wiki-document-chrome sticky top-0 z-40 shrink-0">
            <div className={cn(WIKI_SPREADSHEET_COLUMN, "py-2.5")}>
              <PageDocumentHeader
                page={page} pageId={pageId} saveState={saveState} savedAt={savedAt} isOffline={isOffline}
                onRetrySave={retry} isEditable={isEditable} onNavigate={handleNavigateToPage}
                onOpenCover={handleOpenCover} onOpenDetailsPanel={handleOpenDetails}
                onSpreadsheetExport={handleExportSpreadsheet} projectId={projectId}
                workbookSaveHostRef={handleWorkbookSaveHost}
              />
            </div>
          </div>
          <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
            <div className="shrink-0">
            {pendingPresentation && (
              <div role="alert" className="mx-4 mb-3 mt-3 flex flex-wrap items-center gap-2 rounded-lg border border-status-warning-rule bg-status-warning-surface p-3 text-sm text-status-warning-ink sm:mx-6 lg:mx-8">
                <span className="min-w-0 flex-1">The page changed before your {pendingPresentation.field === "icon" ? "icon" : "cover"} change was saved. Your choice is ready to retry.</span>
                <Button size="sm" onClick={handleRetryPresentation} disabled={isRetryingPresentation || !isEditable}>{isRetryingPresentation ? "Retrying…" : `Retry ${pendingPresentation.field === "icon" ? "icon" : "cover"} change`}</Button>
                <Button size="sm" variant="outline" onClick={discardPresentation} disabled={isRetryingPresentation}>Discard choice</Button>
              </div>
            )}
            {conflict ? (
              <div className="mx-4 mb-3 mt-3 sm:mx-6 lg:mx-8">
                <PageEditConflict
                  key={`${pageId}:${conflict.currentContentRevision}`} conflict={conflict} isReloading={isReloading}
                  pendingFields={pendingFields} localTitle={localTitle} localBody="" onKeepMine={keepLocalEdits}
                  onDiscardMine={handleDiscardMine} onCompare={handleCompareTitle}
                />
              </div>
            ) : null}
            {page.isLocked && !canManage ? (
              <div className="mx-4 mb-3 mt-3 flex items-center gap-2 rounded-xl border border-border bg-muted/60 px-3 py-2 text-sm text-muted-foreground sm:mx-6 lg:mx-8">
                <KbAlertCircleIcon className="h-4 w-4 shrink-0" />
                <span>This page is locked and is read-only.</span>
              </div>
            ) : null}
            <div className="group/title flex items-center gap-2 px-4 py-2 sm:px-6 lg:px-8">
              {page.icon ? <PageIconPicker icon={page.icon} isEditable={isEditable} onIconChange={handleIconChange} variant="inline" /> : null}
              <textarea
                ref={titleRef} value={localTitle} onChange={handleTitleChange} onKeyDown={handleTitleKeyDown}
                placeholder="Untitled"
                className="min-w-0 flex-1 resize-none overflow-hidden border-0 bg-transparent py-0 text-left text-3xl font-semibold leading-tight tracking-tight text-foreground outline-none placeholder:text-muted-foreground"
                rows={1} style={{ height: "auto" }} readOnly={!isEditable} aria-label="Page title"
              />
              <PageDocumentPropertyActions icon={page.icon} hasCover={Boolean(page.coverImage)} isEditable={isEditable} onIconChange={handleIconChange} onOpenCover={handleOpenCover} />
            </div>
            </div>
            {workbook ? (
              <PageSpreadsheetGrid
                key={`${pageId}:${reloadNonce}`}
                pageId={pageId}
                pageTitle={page.title}
                workbook={workbook}
                contentRevision={page.contentRevision}
                isEditable={isEditable}
                sheetsRef={sheetsRef}
                isReloading={isReloading}
                onReload={handleReloadWorkbook}
                onRefetchRevision={handleRefetchRevision}
                saveStatusHost={workbookSaveHost}
              />
            ) : workbookQuery.isError ? (
              <ErrorState
                title="Couldn't load this spreadsheet"
                description={getErrorMessage(workbookQuery.error)}
                error={workbookQuery.error}
                onRetry={handleRetryWorkbook}
              />
            ) : (
              <div className="relative min-h-0 flex-1">
                <Skeleton className="absolute inset-0 h-auto w-auto rounded-none" />
              </div>
            )}
          </div>
        </div>
        <PageRightPanel pageId={pageId} page={page} onNavigate={handleNavigateToPage} mobileOpen={detailsMobileOpen} onMobileOpenChange={handleDetailsMobileOpenChange} />
      </div>
    </div>
  );
}
