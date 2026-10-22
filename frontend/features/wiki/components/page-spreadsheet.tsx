"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { KbAlertCircleIcon } from "@/features/wiki/lib/kb-icons";
import { getErrorMessage } from "@/lib/get-error-message";
import { cn } from "@/lib/utils";
import { useKbPage, useUpdateKbPage, useRecordKbPageVisit, useKbWorkbook } from "@/hooks/api/kb";
import { ErrorState } from "@/components/shared/error-state";
import { useCan, useCanState } from "@/hooks/api/access";
import { NoPermissionState } from "@/components/shared/no-permission-state";
import { pageHref } from "@/lib/knowledge-routes";
import { toFortuneSheets, type FortuneSheet } from "@/features/wiki/lib/kb-workbook-convert";
import { exportSpreadsheet } from "@/features/wiki/lib/kb-spreadsheet-file";
import { KbPageNotFound } from "./kb-page-not-found";
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

const WIKI_DOCUMENT_COLUMN = "mx-auto w-full min-w-0 max-w-4xl px-4 sm:px-8";

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
  const visitedRef = useRef<number | null>(null);
  const titleRef = useRef<HTMLTextAreaElement>(null);
  const sheetsRef = useRef<FortuneSheet[] | null>(null);

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

  if (viewAccess === "loading" || isLoading) {
    return (
      <div className="w-full px-3 py-4 space-y-4">
        <Skeleton className="h-4 w-3/4" />
        <Skeleton className="h-4 w-1/2" />
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }
  if (viewAccess === "denied") return <NoPermissionState permission="kb:pages:view" />;
  if (isError || !page) return <KbPageNotFound error={error} onRetry={refetch} />;

  const isEditable = canUpdate && page.can.edit === true && (!page.isLocked || canManage);

  return (
    <div className="wiki-document flex h-full min-h-full flex-1 flex-col">
      <PageCover coverImage={page.coverImage} isEditable={isEditable} onCoverChange={handleCoverChange} onChangeCover={handleOpenCover} />
      <PageCoverPickerDialog open={coverPickerOpen} onOpenChange={handleCoverPickerOpenChange} onCoverChange={handleCoverChange} pageId={pageId} />
      <div className="flex min-h-0 min-w-0 flex-1">
        <div className="flex h-full min-h-0 min-w-0 flex-1 flex-col">
          <div className="wiki-document-chrome sticky top-0 z-40 shrink-0">
            <div className={cn(WIKI_DOCUMENT_COLUMN, "py-2.5")}>
              <PageDocumentHeader
                page={page} pageId={pageId} saveState={saveState} savedAt={savedAt} isOffline={isOffline}
                onRetrySave={retry} isEditable={isEditable} onNavigate={handleNavigateToPage}
                onOpenCover={handleOpenCover} onOpenDetailsPanel={handleOpenDetails}
                onSpreadsheetExport={handleExportSpreadsheet} projectId={projectId}
              />
            </div>
          </div>
          <div className={cn("flex min-h-0 flex-1 flex-col py-4", WIKI_DOCUMENT_COLUMN)}>
            {pendingPresentation && (
              <div role="alert" className="mb-5 flex flex-wrap items-center gap-2 rounded-lg border border-status-warning-rule bg-status-warning-surface p-3 text-sm text-status-warning-ink">
                <span className="min-w-0 flex-1">The page changed before your {pendingPresentation.field === "icon" ? "icon" : "cover"} change was saved. Your choice is ready to retry.</span>
                <Button size="sm" onClick={handleRetryPresentation} disabled={isRetryingPresentation || !isEditable}>{isRetryingPresentation ? "Retrying…" : `Retry ${pendingPresentation.field === "icon" ? "icon" : "cover"} change`}</Button>
                <Button size="sm" variant="outline" onClick={discardPresentation} disabled={isRetryingPresentation}>Discard choice</Button>
              </div>
            )}
            {conflict ? (
              <div className="mb-5">
                <PageEditConflict
                  key={`${pageId}:${conflict.currentContentRevision}`} conflict={conflict} isReloading={isReloading}
                  pendingFields={pendingFields} localTitle={localTitle} localBody="" onKeepMine={keepLocalEdits}
                  onDiscardMine={handleDiscardMine} onCompare={handleCompareTitle}
                />
              </div>
            ) : null}
            {page.isLocked && !canManage ? (
              <div className="mb-5 flex items-center gap-2 rounded-xl border border-border bg-muted/60 px-3 py-2 text-sm text-muted-foreground">
                <KbAlertCircleIcon className="h-4 w-4 shrink-0" />
                <span>This page is locked and is read-only.</span>
              </div>
            ) : null}
            <div className="group/title mb-2 flex items-center gap-2">
              {page.icon ? <PageIconPicker icon={page.icon} isEditable={isEditable} onIconChange={handleIconChange} variant="inline" /> : null}
              <textarea
                ref={titleRef} value={localTitle} onChange={handleTitleChange} onKeyDown={handleTitleKeyDown}
                placeholder="Untitled"
                className="min-w-0 flex-1 resize-none overflow-hidden border-0 bg-transparent py-0 text-left text-3xl font-semibold leading-tight tracking-tight text-foreground outline-none placeholder:text-muted-foreground"
                rows={1} style={{ height: "auto" }} readOnly={!isEditable} aria-label="Page title"
              />
              <PageDocumentPropertyActions icon={page.icon} hasCover={Boolean(page.coverImage)} isEditable={isEditable} onIconChange={handleIconChange} onOpenCover={handleOpenCover} />
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
              />
            ) : workbookQuery.isError ? (
              <ErrorState
                title="Couldn't load this spreadsheet"
                description={getErrorMessage(workbookQuery.error)}
                error={workbookQuery.error}
                onRetry={handleRetryWorkbook}
              />
            ) : (
              <Skeleton className="min-h-[400px] w-full flex-1 rounded-xl" />
            )}
          </div>
        </div>
        <PageRightPanel pageId={pageId} page={page} onNavigate={handleNavigateToPage} mobileOpen={detailsMobileOpen} onMobileOpenChange={handleDetailsMobileOpenChange} />
      </div>
    </div>
  );
}
