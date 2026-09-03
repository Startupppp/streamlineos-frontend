"use client";

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { KbAlertCircleIcon } from "@/features/wiki/lib/kb-icons";
import { Skeleton } from "@/components/ui/skeleton";
import { apiClient } from "@/lib/api-client";
import { getErrorMessage } from "@/lib/get-error-message";
import { KbPageNotFound } from "./kb-page-not-found";
import { usePageAutosave, type PageAutosavePatch } from "./use-page-autosave";
import { Button } from "@/components/ui/button";
import { uploadKbMedia } from "@/features/wiki/lib/upload-kb-media";
import {
  useKbPage,
  useUpdateKbPage,
  useRecordKbPageVisit,
} from "@/hooks/api/kb";
import { useCan } from "@/hooks/api/access";
import { pageHref } from "@/features/wiki/lib/knowledge-routes";
import PageCover from "./page-cover";
import PageIconPicker from "./page-icon-picker";
import PageDocumentHeader from "./page-document-header";
import PageRightPanel from "./page-right-panel";

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
  >("/chat/users");
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
  const results = await apiClient.get<
    Array<{ id: number; title: string; icon: string | null; snippet: string }>
  >("/kb/pages/search", { q: query });
  return results.map((r) => ({ id: r.id, label: r.title || "Untitled" }));
}

interface PageDocumentProps {
  pageId: number;
  onNavigateToPage?: (targetPageId: number) => void;
}

export default function PageDocument({ pageId, onNavigateToPage }: PageDocumentProps) {
  const router = useRouter();
  const { data: page, isLoading, isError, error, refetch } = useKbPage(pageId);
  const updatePage = useUpdateKbPage();
  const recordVisit = useRecordKbPageVisit();
  const canManage = useCan("kb:pages:manage");

  const [titleDraft, setTitleDraft] = useState<{
    pageId: number;
    value: string;
  } | null>(null);
  const visitedRef = useRef<number | null>(null);
  const titleRef = useRef<HTMLTextAreaElement>(null);

  const handleSavePage = useCallback(
    (payload: PageAutosavePatch & { pageId: number; expectedContentRevision?: number }) =>
      updatePage.mutateAsync(payload),
    [updatePage],
  );
  const handleConflict = useCallback(() => {
    toast.error("Page edited by someone else", {
      description: "Your unsaved changes were not applied. Reload to see the latest version.",
    });
  }, []);
  const handleSaveFailure = useCallback((error: unknown) => {
    toast.error("Failed to save page", { description: getErrorMessage(error) });
  }, []);

  const { saveState, conflict, schedule, resolveConflict } = usePageAutosave({
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

  const handleReload = useCallback(() => {
    resolveConflict();
    void refetch();
  }, [resolveConflict, refetch]);

  const handleUploadFile = useCallback(
    (file: File) => uploadKbMedia(file, pageId),
    [pageId]
  );

  function handleTitleChange(e: React.ChangeEvent<HTMLTextAreaElement>) {
    setTitleDraft({ pageId, value: e.target.value });
    schedule({ title: e.target.value });
  }

  function handleTitleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter") e.preventDefault();
  }

  function handleEditorChange(value: unknown, plainText: string) {
    schedule({ content: value, contentText: plainText });
  }

  function handleApplyImprovement(text: string) {
    void navigator.clipboard.writeText(text).then(() => {
      toast.success("Improved draft copied to clipboard — paste it into the editor");
    }).catch(() => {
      toast.info("Copy this draft and paste it into the editor", { description: text.slice(0, 100) });
    });
  }

  function handleCoverChange(coverImage: string | null) {
    updatePage.mutate(
      { pageId, coverImage },
      { onError: () => toast.error("Failed to update cover") }
    );
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

  const isEditable = !page.isLocked || canManage;
  const wordCount = (page.contentText ?? "")
    .split(/\s+/)
    .filter(Boolean).length;

  return (
    <div className="min-h-full flex flex-col">
      <PageCover
        coverImage={page.coverImage}
        isEditable={isEditable}
        onCoverChange={handleCoverChange}
      />

      <div className="flex flex-1 min-w-0">
        <div className="flex-1 min-w-0 w-full px-3 pt-3 pb-16">
          <PageDocumentHeader
            page={page}
            pageId={pageId}
            saveState={saveState}
            onNavigate={handleNavigateToPage}
            onApplyImprovement={handleApplyImprovement}
          />

          <div className="flex flex-row items-center mt-4 mb-4 gap-2 overflow-hidden">
            <PageIconPicker
              icon={page.icon}
              isEditable={isEditable}
              onIconChange={handleIconChange}
            />
            <textarea
              ref={titleRef}
              value={localTitle}
              onChange={handleTitleChange}
              onKeyDown={handleTitleKeyDown}
              placeholder="Untitled"
              className="flex-1 min-w-0 w-full resize-none overflow-hidden bg-transparent border-0 outline-none text-3xl font-bold text-left text-foreground placeholder:text-muted-foreground/50 leading-tight"
              rows={1}
              style={{ height: "auto" }}
              readOnly={!isEditable}
            />
          </div>

          {/*
            The 409 latch blocks every further autosave, so the editor keeps
            accepting keystrokes while saving nothing. A toast is dismissible and
            the state is not — this banner stands for as long as the latch does.
          */}
          {conflict && (
            <div
              role="alert"
              className="mb-4 flex flex-wrap items-center gap-x-3 gap-y-2 rounded-lg border border-status-danger-rule bg-status-danger-surface px-3 py-2.5"
            >
              <KbAlertCircleIcon className="h-4 w-4 shrink-0 text-status-danger-ink" />
              <span className="text-sm text-status-danger-ink">
                Someone else edited this page. Autosave is paused — reload to
                continue editing the latest version.
              </span>
              <Button size="sm" variant="outline" className="h-7" onClick={handleReload}>
                Reload
              </Button>
            </div>
          )}

          {page.isLocked && !canManage && (
            <div className="mb-4 flex items-center gap-2 rounded-lg border border-border bg-muted px-3 py-2 text-sm text-muted-foreground">
              <KbAlertCircleIcon className="h-4 w-4 shrink-0" />
              <span>This page is locked and is read-only.</span>
            </div>
          )}

          <PlateDocumentEditor
            value={page.content ?? undefined}
            contentKey={pageId}
            editable={isEditable}
            placeholder="Start writing…"
            onChange={handleEditorChange}
            fetchMentionUsers={fetchMentionUsers}
            fetchPageLinks={fetchPageLinks}
            onNavigateToPage={handleNavigateToPage}
            uploadFile={isEditable ? handleUploadFile : undefined}
          />
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
