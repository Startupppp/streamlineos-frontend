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
import { Skeleton } from "@/components/ui/skeleton";
import { apiClient } from "@/lib/api-client";
import {
  chatUsersContract,
  kbPageSearchContract,
  type KbPageEditConflict,
} from "@/features/wiki/lib/wiki-schema";
import { getErrorMessage } from "@/lib/get-error-message";
import { KbPageNotFound } from "./kb-page-not-found";
import PageEditConflict from "./page-edit-conflict";
import { usePageAutosave, type PageAutosavePatch } from "./use-page-autosave";
import { uploadKbMedia } from "@/features/wiki/lib/upload-kb-media";
import { withoutPendingUploads } from "@/components/editor/plate/upload-media";
import {
  useKbPage,
  useUpdateKbPage,
  useRecordKbPageVisit,
} from "@/hooks/api/kb";
import { useCan } from "@/hooks/api/access";
import { pageHref } from "@/lib/knowledge-routes";
import PageCover from "./page-cover";
import { PageCoverPickerDialog } from "./page-cover-picker";
import PageIconPicker from "./page-icon-picker";
import PageDocumentHeader from "./page-document-header";
import PageRightPanel from "./page-right-panel";
import { PageDocumentMetaFooter } from "./page-document-meta-footer";
import { PageDocumentPropertyActions } from "./page-document-property-actions";
import { PageDocumentOutline } from "./page-document-outline";
import {
  normalizePlateValue,
  getPlainText,
  plainTextToPlateValue,
  prependPlateValue,
} from "@/components/editor/plate/plate-value-convert";

const PlateDocumentEditor = dynamic(
  () => import("@/components/editor/plate/plate-document-editor"),
  {
    ssr: false,
    loading: () => <Skeleton className="h-64 w-full rounded-lg" />,
  }
);

async function fetchMentionUsers(query: string) {
  const users = await apiClient.get<
    Array<{ id: string; name: string | null; email: string | null }>
  >("/chat/users", undefined, undefined, chatUsersContract);
  const lower = query.toLowerCase();
  const filtered = query
    ? users.filter((u) =>
        (u.name ?? u.email ?? "").toLowerCase().includes(lower)
      )
    : users;
  return filtered
    .slice(0, 10)
    .map((u) => ({ id: u.id, label: u.name ?? u.email ?? u.id }));
}

async function fetchPageLinks(query: string) {
  const page = await apiClient.get<{
    items: Array<{ id: number; title: string; icon: string | null; snippet: string }>;
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

export default function PageDocument({ pageId, onNavigateToPage, projectId }: PageDocumentProps) {
  const router = useRouter();
  const { data: page, isLoading, isError, error, refetch } = useKbPage(pageId);
  const updatePage = useUpdateKbPage();
  const recordVisit = useRecordKbPageVisit();
  const canManage = useCan("kb:pages:manage");

  const [titleDraft, setTitleDraft] = useState<{
    pageId: number;
    value: string;
  } | null>(null);
  const [reloadNonce, setReloadNonce] = useState(0);
  const [isReloading, setIsReloading] = useState(false);
  const [coverPickerOpen, setCoverPickerOpen] = useState(false);
  const [editorDraft, setEditorDraft] = useState<unknown>(null);
  const visitedRef = useRef<number | null>(null);
  const titleRef = useRef<HTMLTextAreaElement>(null);
  const editorContainerRef = useRef<HTMLDivElement>(null);
  const [toolbarHost, setToolbarHost] = useState<HTMLDivElement | null>(null);

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
  const handleSaveFailure = useCallback((error: unknown) => {
    toast.error("Failed to save page", { description: getErrorMessage(error) });
  }, []);

  const { saveState, conflict, savedAt, isOffline, pendingFields, schedule, discardLocalEdits, keepLocalEdits } = usePageAutosave({
    pageId,
    contentRevision: page?.contentRevision,
    save: handleSavePage,
    onConflict: handleConflict,
    onSaveError: handleSaveFailure,
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

  useEffect(() => {
    setEditorDraft(null);
  }, [pageId]);

  const handleNavigateToPage = useCallback(
    (targetPageId: number) => {
      if (onNavigateToPage) {
        onNavigateToPage(targetPageId);
      } else {
        router.push(pageHref(targetPageId));
      }
    },
    [router, onNavigateToPage]
  );

  const handleDiscardMine = useCallback(() => {
    setIsReloading(true);
    function applyServerVersion() {
      discardLocalEdits();
      setTitleDraft(null);
      setEditorDraft(null);
      setReloadNonce(nextReload);
      setIsReloading(false);
    }
    void refetch().then(applyServerVersion, applyServerVersion);
  }, [discardLocalEdits, refetch]);

  const handleUploadFile = useCallback(
    (file: File) => uploadKbMedia(file, pageId),
    [pageId]
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
    setEditorDraft(value);
    schedule({ content: withoutPendingUploads(value), contentText: plainText });
  }

  function applyEditorValue(next: unknown, plainText: string) {
    setEditorDraft(next);
    setReloadNonce(nextReload);
    schedule({ content: withoutPendingUploads(next), contentText: plainText });
    toast.success("Draft updated in the page");
  }

  function handleApplyImprovement(text: string) {
    const next = plainTextToPlateValue(text);
    applyEditorValue(next, text);
  }

  const currentContentText = useMemo(
    () => getPlainText(normalizePlateValue(editorDraft ?? page?.content)),
    [editorDraft, page?.content],
  );

  function handleInsertSummary(text: string) {
    const summary = plainTextToPlateValue(text);
    const body = normalizePlateValue(editorDraft ?? page?.content);
    const next = prependPlateValue(summary, body);
    applyEditorValue(next, getPlainText(next));
  }

  function handleOpenCover() {
    setCoverPickerOpen(true);
  }

  function handleCoverPickerOpenChange(open: boolean) {
    setCoverPickerOpen(open);
  }

  function handleCoverChange(coverImage: string | null) {
    updatePage.mutate(
      { pageId, coverImage },
      {
        onSuccess: () =>
          toast.success(coverImage ? "Cover updated" : "Cover removed"),
        onError: () => toast.error("Failed to update cover"),
      },
    );
  }

  function handleToolbarHost(node: HTMLDivElement | null) {
    setToolbarHost(node);
  }

  function handleIconChange(icon: string | null) {
    updatePage.mutate(
      { pageId, icon },
      { onError: () => toast.error("Failed to update icon") }
    );
  }

  if (isLoading) {
    return (
      <div className="w-full px-3 py-4 space-y-4">
        <Skeleton className="h-4 w-3/4" />
        <Skeleton className="h-4 w-1/2" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (isError || !page) {
    return <KbPageNotFound error={error} onRetry={refetch} />;
  }

  const isEditable = page.canEdit !== false && (!page.isLocked || canManage);
  const wordCount = (page.contentText ?? "")
    .split(/\s+/)
    .filter(Boolean).length;

  return (
    <div className="flex min-h-full flex-col">
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

      <div className="flex min-w-0 flex-1">
        <div className="flex min-w-0 flex-1 flex-col">
          <div className="sticky top-0 z-40 border-b border-border/70 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80">
            <div className="mx-auto w-full max-w-[46rem] px-4 py-2.5 sm:px-8">
              <PageDocumentHeader
                page={page}
                pageId={pageId}
                saveState={saveState}
                savedAt={savedAt}
                isOffline={isOffline}
                isEditable={isEditable}
                onNavigate={handleNavigateToPage}
                currentContent={currentContentText}
                onApplyImprovement={handleApplyImprovement}
                onInsertSummary={handleInsertSummary}
                onOpenCover={handleOpenCover}
                projectId={projectId}
              />
            </div>
            {isEditable ? (
              <div
                ref={handleToolbarHost}
                className="mx-auto w-full max-w-[46rem] border-t border-border/50 px-4 sm:px-8"
              />
            ) : null}
          </div>

          <div className="mx-auto w-full min-w-0 max-w-[46rem] px-4 pb-12 pt-3 sm:px-8">
            {conflict ? (
              <div className="mb-5">
                <PageEditConflict
                  conflict={conflict}
                  isReloading={isReloading}
                  pendingFields={pendingFields}
                  onKeepMine={keepLocalEdits}
                  onDiscardMine={handleDiscardMine}
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
                className="min-w-0 flex-1 resize-none overflow-hidden border-0 bg-transparent py-0 text-left text-3xl font-semibold leading-tight tracking-tight text-foreground outline-none placeholder:text-muted-foreground/70"
                rows={1}
                style={{ height: "auto" }}
                readOnly={!isEditable}
                aria-label="Page title"
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
              content={editorDraft ?? page.content}
              containerRef={editorContainerRef}
            />

            <div ref={editorContainerRef} className="min-w-0">
              <PlateDocumentEditor
                value={editorDraft ?? page.content ?? undefined}
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

            <PageDocumentMetaFooter
              trustState={page.trustState}
              nextReviewAt={page.nextReviewAt}
              updatedAt={page.updatedAt}
              lastEditedById={page.lastEditedById}
              ownerUserId={page.ownerUserId}
            />
          </div>
        </div>

        <PageRightPanel
          pageId={pageId}
          page={page}
          wordCount={wordCount}
          onNavigate={handleNavigateToPage}
        />
      </div>
    </div>
  );
}
