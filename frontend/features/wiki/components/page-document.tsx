"use client";

import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { KbAlertCircleIcon } from "@/features/wiki/lib/kb-icons";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { apiClient } from "@/lib/api-client";
import {
  chatUsersContract,
  kbPageSearchContract,
  type KbPageEditConflict,
} from "@/features/wiki/lib/wiki-schema";
import { getErrorMessage } from "@/lib/get-error-message";
import { cn } from "@/lib/utils";
import { DocumentRecordGate, documentRecordResolution } from "./document-record-gate";
import PageEditConflict from "./page-edit-conflict";
import { usePageAutosave, type PageAutosavePatch } from "./use-page-autosave";
import { usePagePresentationUpdate } from "./use-page-presentation-update";
import { uploadKbMedia } from "@/features/wiki/lib/upload-kb-media";
import { withoutPendingUploads } from "@/components/editor/plate/upload-media";
import {
  useKbPage,
  useUpdateKbPage,
  useRecordKbPageVisit,
} from "@/hooks/api/kb/pages";
import { useCan, useCanState } from "@/hooks/api/access";
import { pageHref } from "@/lib/knowledge-routes";
import PageCover from "./page-cover";
import { PageCoverPickerDialog } from "./page-cover-picker";
import PageIconPicker from "./page-icon-picker";
import PageDocumentHeader from "./page-document-header";
import PageRightPanel from "./page-right-panel";
import { PageDocumentSkeleton } from "./page-document-skeleton";
import { PageDocumentPropertyActions } from "./page-document-property-actions";
import { PageDocumentOutline } from "./page-document-outline";
import {
  normalizePlateValue,
  getPlainText,
  plainTextToPlateValue,
  prependPlateValue,
} from "@/components/editor/plate/plate-value-convert";
import { KbFileViewer } from "./files";
import "../wiki-document.css";

const PageSpreadsheet = dynamic(() => import("./page-spreadsheet"), {
  ssr: false,
  loading: () => <Skeleton className="h-full w-full" />,
});

const WIKI_DOCUMENT_COLUMN = "mx-auto w-full min-w-0 max-w-4xl px-4 sm:px-8";

function loadedEditorSnapshot(storedContent: unknown): string {
  const loaded = normalizePlateValue(storedContent);
  return `${getPlainText(loaded)}\u0000${JSON.stringify(withoutPendingUploads(loaded))}`;
}

const PlateDocumentEditor = dynamic(
  () => import("@/components/editor/plate/plate-document-editor"),
  {
    ssr: false,
    loading: () => <Skeleton className="h-64 w-full rounded-lg" />,
  },
);

async function fetchMentionUsers(query: string) {
  const users = await apiClient.get<
    Array<{ id: string; name: string | null; email: string | null }>
  >("/chat/users", undefined, undefined, chatUsersContract);
  const lower = query.toLowerCase();
  const filtered = query
    ? users.filter((u) =>
        (u.name ?? u.email ?? "").toLowerCase().includes(lower),
      )
    : users;
  return filtered
    .slice(0, 10)
    .map((u) => ({ id: u.id, label: u.name ?? u.email ?? u.id }));
}

async function fetchPageLinks(query: string) {
  const page = await apiClient.get<{
    items: Array<{
      id: number;
      title: string;
      icon: string | null;
      snippet: string;
    }>;
    hasMore: boolean;
    limit: number;
  }>("/kb/pages/search", { q: query }, undefined, kbPageSearchContract);
  return page.items.map((r) => ({ id: r.id, label: r.title || "Untitled" }));
}

interface PageDocumentProps {
  pageId: number;
  onNavigateToPage?: (targetPageId: number) => void;
  projectId?: number;
}

function nextReload(current: number): number {
  return current + 1;
}

export default function PageDocument({
  pageId,
  onNavigateToPage,
  projectId,
}: PageDocumentProps) {
  const router = useRouter();
  const { data: page, isLoading, isError, error, refetch } = useKbPage(pageId);
  const storedContent = useMemo(
    () =>
      page?.content ??
      (page?.contentText ? plainTextToPlateValue(page.contentText) : null),
    [page?.content, page?.contentText],
  );
  const updatePage = useUpdateKbPage();
  const recordVisit = useRecordKbPageVisit();
  const canUpdate = useCan("kb:pages:update");
  const canManage = useCan("kb:pages:manage");
  const viewAccess = useCanState("kb:pages:view");

  const [titleDraft, setTitleDraft] = useState<{
    pageId: number;
    value: string;
  } | null>(null);
  const [reloadNonce, setReloadNonce] = useState(0);
  const [isReloading, setIsReloading] = useState(false);
  const [coverPickerOpen, setCoverPickerOpen] = useState(false);
  const [editorDraft, setEditorDraft] = useState<{
    pageId: number;
    value: unknown;
  } | null>(null);
  const visitedRef = useRef<number | null>(null);
  const titleRef = useRef<HTMLTextAreaElement>(null);
  const editorContainerRef = useRef<HTMLDivElement>(null);
  const editorSnapshotRef = useRef<{ pageId: number; snapshot: string } | null>(
    null,
  );
  const editorValue = editorDraft?.pageId === pageId ? editorDraft.value : null;
  const [toolbarHost, setToolbarHost] = useState<HTMLDivElement | null>(null);
  const [detailsMobileOpen, setDetailsMobileOpen] = useState(false);

  const handleSavePage = useCallback(
    (
      payload: PageAutosavePatch & {
        pageId: number;
        expectedContentRevision: number;
      },
    ) => updatePage.mutateAsync(payload),
    [updatePage],
  );
  const handleConflict = useCallback((detail: KbPageEditConflict) => {
    toast.error("This file changed while you were editing", {
      description: `${detail.lastEditedByName ?? "Someone else"} saved a newer version. Your edits are kept — choose which version wins.`,
    });
  }, []);
  const handleSaveFailure = useCallback((error: unknown) => {
    toast.error("Failed to save file", { description: getErrorMessage(error) });
  }, []);

  const {
    saveState,
    conflict,
    savedAt,
    isOffline,
    pendingFields,
    schedule,
    retry,
    discardLocalEdits,
    keepLocalEdits,
  } = usePageAutosave({
    pageId,
    contentRevision: page?.contentRevision,
    save: handleSavePage,
    onConflict: handleConflict,
    onSaveError: handleSaveFailure,
  });
  const {
    pendingPresentation,
    isRetryingPresentation,
    handleCoverChange,
    handleIconChange,
    handleRetryPresentation,
    discardPresentation,
  } = usePagePresentationUpdate({
    pageId,
    page,
    canManage,
    updatePage,
    refetch,
  });

  const localTitle =
    titleDraft?.pageId === pageId ? titleDraft.value : (page?.title ?? "");

  useLayoutEffect(() => {
    const el = titleRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${el.scrollHeight}px`;
  }, [localTitle]);

  useEffect(() => {
    if (visitedRef.current === pageId) return;
    visitedRef.current = pageId;
    recordVisit.mutate(pageId);
  }, [pageId, recordVisit]);

  const handleNavigateToPage = useCallback(
    (targetPageId: number) => {
      if (onNavigateToPage) {
        onNavigateToPage(targetPageId);
      } else {
        router.push(pageHref(targetPageId));
      }
    },
    [router, onNavigateToPage],
  );

  const handleDiscardMine = useCallback(() => {
    setIsReloading(true);
    void refetch()
      .then(
        (result) => {
          if (
            !result.isSuccess ||
            !result.data ||
            (conflict?.currentContentRevision !== null &&
              conflict?.currentContentRevision !== undefined &&
              result.data.contentRevision < conflict.currentContentRevision)
          ) {
            toast.error(
              "Couldn't load the latest file version. Your edits are still here.",
            );
            return;
          }
          discardLocalEdits();
          setTitleDraft(null);
          setEditorDraft(null);
          editorSnapshotRef.current = null;
          setReloadNonce(nextReload);
        },
        () => {
          toast.error(
            "Couldn't load the latest file version. Your edits are still here.",
          );
        },
      )
      .finally(() => setIsReloading(false));
  }, [conflict?.currentContentRevision, discardLocalEdits, refetch]);

  const handleUploadFile = useCallback(
    (file: File) => uploadKbMedia(file, pageId),
    [pageId],
  );

  function handleTitleMouseDown(e: React.MouseEvent<HTMLTextAreaElement>) {
    e.stopPropagation();
  }

  function handleTitleChange(e: React.ChangeEvent<HTMLTextAreaElement>) {
    setTitleDraft({ pageId, value: e.target.value });
    schedule({ title: e.target.value });
  }

  function handleTitleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter") e.preventDefault();
  }

  function handleEditorChange(value: unknown, plainText: string) {
    const content = withoutPendingUploads(value);
    const snapshot = `${plainText}\u0000${JSON.stringify(content)}`;
    const recorded =
      editorSnapshotRef.current?.pageId === pageId
        ? editorSnapshotRef.current.snapshot
        : null;
    const baseline = recorded ?? loadedEditorSnapshot(storedContent);
    if (recorded === null) {
      editorSnapshotRef.current = { pageId, snapshot: baseline };
    }
    if (snapshot === baseline) return;
    editorSnapshotRef.current = { pageId, snapshot };
    setEditorDraft({ pageId, value });
    schedule({ content, contentText: plainText });
  }

  function applyEditorValue(next: unknown, plainText: string) {
    setEditorDraft({ pageId, value: next });
    setReloadNonce(nextReload);
    schedule({ content: withoutPendingUploads(next), contentText: plainText });
    toast.success("Draft updated in the file");
  }

  function handleApplyImprovement(text: string) {
    const next = plainTextToPlateValue(text);
    applyEditorValue(next, text);
  }

  const currentContentText = useMemo(
    () => getPlainText(normalizePlateValue(editorValue ?? storedContent)),
    [editorValue, storedContent],
  );

  const handleCompareVersions = useCallback(async () => {
    const result = await refetch();
    if (
      !result.isSuccess ||
      !result.data ||
      (conflict?.currentContentRevision !== null &&
        conflict?.currentContentRevision !== undefined &&
        result.data.contentRevision < conflict.currentContentRevision)
    ) {
      throw new Error("The latest page version is unavailable");
    }
    return {
      title: result.data.title,
      body: getPlainText(normalizePlateValue(result.data.content)),
    };
  }, [conflict?.currentContentRevision, refetch]);

  function handleInsertSummary(text: string) {
    const summary = plainTextToPlateValue(text);
    const body = normalizePlateValue(editorValue ?? storedContent);
    const next = prependPlateValue(summary, body);
    applyEditorValue(next, getPlainText(next));
  }

  function handleOpenCover() {
    setCoverPickerOpen(true);
  }

  function handleCoverPickerOpenChange(open: boolean) {
    setCoverPickerOpen(open);
  }

  function handleToolbarHost(node: HTMLDivElement | null) {
    setToolbarHost(node);
  }

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
        loading={<PageDocumentSkeleton />}
        error={error}
        onRetry={() => {
          void refetch();
        }}
      />
    );
  }

  if (page.kind === "spreadsheet")
    return <PageSpreadsheet {...{ pageId, onNavigateToPage, projectId }} />;

  if (page.kind === "file") return <KbFileViewer pageId={pageId} />;

  const isEditable =
    canUpdate && page.can.edit === true && (!page.isLocked || canManage);
  const wordCount = (page.contentText ?? "")
    .split(/\s+/)
    .filter(Boolean).length;

  return (
    <div className="wiki-document flex h-full min-h-full flex-1 flex-col">
      <PageCover
        coverImage={page.coverImage}
        isEditable={isEditable}
        onCoverChange={handleCoverChange}
        onChangeCover={handleOpenCover}
      />
      <PageCoverPickerDialog
        open={coverPickerOpen}
        onOpenChange={handleCoverPickerOpenChange}
        onCoverChange={handleCoverChange}
        pageId={pageId}
      />

      <div className="flex min-h-0 min-w-0 flex-1">
        <div className="flex h-full min-h-0 min-w-0 flex-1 flex-col">
          <div className="wiki-document-chrome sticky top-0 z-40 shrink-0">
            <div className={cn(WIKI_DOCUMENT_COLUMN, "py-2.5")}>
              <PageDocumentHeader
                page={page}
                pageId={pageId}
                saveState={saveState}
                savedAt={savedAt}
                isOffline={isOffline}
                onRetrySave={retry}
                isEditable={isEditable}
                onNavigate={handleNavigateToPage}
                currentContent={currentContentText}
                onApplyImprovement={handleApplyImprovement}
                onInsertSummary={handleInsertSummary}
                onOpenCover={handleOpenCover}
                onOpenDetailsPanel={() => setDetailsMobileOpen(true)}
                projectId={projectId}
              />
            </div>
            {isEditable ? (
              <div
                ref={handleToolbarHost}
                data-slot="wiki-document-toolbar"
                className={cn(WIKI_DOCUMENT_COLUMN, "border-t border-border")}
              />
            ) : null}
          </div>

          <div
            className={cn(
              "wiki-document-body flex min-h-0 flex-1 flex-col py-4",
              WIKI_DOCUMENT_COLUMN,
            )}
          >
            {pendingPresentation && (
              <div
                role="alert"
                className="mb-5 flex flex-wrap items-center gap-2 rounded-lg border border-status-warning-rule bg-status-warning-surface p-3 text-sm text-status-warning-ink"
              >
                <span className="min-w-0 flex-1">
                  The page changed before your{" "}
                  {pendingPresentation.field === "icon" ? "icon" : "cover"}{" "}
                  change was saved. Your choice is ready to retry.
                </span>
                <Button
                  size="sm"
                  onClick={handleRetryPresentation}
                  disabled={isRetryingPresentation || !isEditable}
                >
                  {isRetryingPresentation
                    ? "Retrying…"
                    : `Retry ${pendingPresentation.field === "icon" ? "icon" : "cover"} change`}
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={discardPresentation}
                  disabled={isRetryingPresentation}
                >
                  Discard choice
                </Button>
              </div>
            )}
            {conflict ? (
              <div className="mb-5">
                <PageEditConflict
                  key={`${pageId}:${conflict.currentContentRevision}`}
                  conflict={conflict}
                  isReloading={isReloading}
                  pendingFields={pendingFields}
                  localTitle={localTitle}
                  localBody={currentContentText}
                  onKeepMine={keepLocalEdits}
                  onDiscardMine={handleDiscardMine}
                  onCompare={handleCompareVersions}
                />
              </div>
            ) : null}

            {page.isLocked && !canManage ? (
              <div className="mb-5 flex items-center gap-2 rounded-xl border border-border bg-muted/60 px-3 py-2 text-sm text-muted-foreground">
                <KbAlertCircleIcon className="h-4 w-4 shrink-0" />
                <span>This file is locked and is read-only.</span>
              </div>
            ) : null}

            <div className="group/title mb-2 flex items-center gap-2">
              {page.icon ? (
                <PageIconPicker
                  icon={page.icon}
                  isEditable={isEditable}
                  onIconChange={handleIconChange}
                  variant="inline"
                />
              ) : null}
              <textarea
                ref={titleRef}
                value={localTitle}
                onChange={handleTitleChange}
                onKeyDown={handleTitleKeyDown}
                onMouseDown={handleTitleMouseDown}
                placeholder="Untitled"
                className="min-w-0 flex-1 resize-none overflow-hidden border-0 bg-transparent py-0 text-left text-3xl font-semibold leading-tight tracking-tight text-foreground outline-none placeholder:text-muted-foreground"
                rows={1}
                style={{ height: "auto" }}
                readOnly={!isEditable}
                aria-label="File title"
              />
              <PageDocumentPropertyActions
                icon={page.icon}
                hasCover={Boolean(page.coverImage)}
                isEditable={isEditable}
                onIconChange={handleIconChange}
                onOpenCover={handleOpenCover}
              />
            </div>

            <PageDocumentOutline
              content={editorValue ?? storedContent}
              containerRef={editorContainerRef}
            />

            <div
              ref={editorContainerRef}
              className="flex min-h-0 min-w-0 flex-1 flex-col"
            >
              <PlateDocumentEditor
                value={editorValue ?? storedContent ?? undefined}
                contentKey={`${pageId}:${reloadNonce}`}
                editable={isEditable}
                placeholder="Start writing…"
                onChange={handleEditorChange}
                fetchMentionUsers={fetchMentionUsers}
                fetchPageLinks={fetchPageLinks}
                onNavigateToPage={handleNavigateToPage}
                uploadFile={isEditable ? handleUploadFile : undefined}
                toolbarHost={toolbarHost}
              />
            </div>
          </div>
        </div>

        <PageRightPanel
          pageId={pageId}
          page={page}
          wordCount={wordCount}
          onNavigate={handleNavigateToPage}
          mobileOpen={detailsMobileOpen}
          onMobileOpenChange={setDetailsMobileOpen}
        />
      </div>
    </div>
  );
}
