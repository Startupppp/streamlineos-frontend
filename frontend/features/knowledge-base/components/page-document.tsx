"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { AlertCircle } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { ErrorState } from "@/components/shared/error-state";
import { apiClient } from "@/lib/api-client";
import {
  useKbPage,
  useUpdateKbPage,
  useRecordKbPageVisit,
} from "@/hooks/api/kb";
import { useCan } from "@/hooks/api/access";
import PageCover from "./page-cover";
import PageIconPicker from "./page-icon-picker";
import PageDocumentHeader from "./page-document-header";

const TiptapEditor = dynamic(
  () =>
    import("@/components/editor/tiptap-editor").then((m) => ({
      default: m.TiptapEditor,
    })),
  {
    ssr: false,
    loading: () => <Skeleton className="h-64 w-full rounded-lg" />,
  }
);

function extractContentText(content: Record<string, unknown>): string {
  const doc = content as { content?: unknown[] };
  if (!Array.isArray(doc.content)) return "";

  function traverse(nodes: unknown[]): string {
    return nodes
      .map((node) => {
        const n = node as {
          type?: string;
          text?: string;
          content?: unknown[];
        };
        if (n.type === "text") return n.text ?? "";
        if (Array.isArray(n.content)) return traverse(n.content);
        return "";
      })
      .join(" ");
  }

  return traverse(doc.content).slice(0, 200000);
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);
  if (days > 0) return `${days}d ago`;
  if (hours > 0) return `${hours}h ago`;
  if (minutes > 0) return `${minutes}m ago`;
  return "just now";
}

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
}

export default function PageDocument({ pageId }: PageDocumentProps) {
  const router = useRouter();
  const { data: page, isLoading, isError, refetch } = useKbPage(pageId);
  const updatePage = useUpdateKbPage();
  const recordVisit = useRecordKbPageVisit();
  const canManage = useCan("kb:pages:manage");

  const [titleDraft, setTitleDraft] = useState<{
    pageId: number;
    value: string;
  } | null>(null);
  const [saveState, setSaveState] = useState<
    "idle" | "pending" | "saving" | "saved"
  >("idle");
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const visitedRef = useRef<number | null>(null);

  const localTitle =
    titleDraft?.pageId === pageId ? titleDraft.value : (page?.title ?? "");

  useEffect(() => {
    if (visitedRef.current === pageId) return;
    visitedRef.current = pageId;
    recordVisit.mutate(pageId);
  }, [pageId, recordVisit]);

  const handleNavigateToPage = useCallback(
    (targetPageId: number) => {
      router.push(`/knowledge-base/pages/${targetPageId}`);
    },
    [router]
  );

  function scheduleAutosave(patch: {
    title?: string;
    content?: Record<string, unknown>;
    contentText?: string;
  }) {
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    setSaveState("pending");
    saveTimerRef.current = setTimeout(() => {
      setSaveState("saving");
      updatePage.mutate(
        { pageId, ...patch },
        {
          onSuccess: () => setSaveState("saved"),
          onError: () => {
            setSaveState("idle");
            toast.error("Failed to save page");
          },
        }
      );
    }, 1500);
  }

  function handleTitleChange(e: React.ChangeEvent<HTMLTextAreaElement>) {
    setTitleDraft({ pageId, value: e.target.value });
    scheduleAutosave({ title: e.target.value });
  }

  function handleTitleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter") e.preventDefault();
  }

  function handleTitleInput(e: React.FormEvent<HTMLTextAreaElement>) {
    const el = e.currentTarget;
    el.style.height = "auto";
    el.style.height = `${el.scrollHeight}px`;
  }

  function handleEditorChange(json: Record<string, unknown>) {
    const contentText = extractContentText(json);
    scheduleAutosave({ content: json, contentText });
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
      <div className="max-w-4xl mx-auto px-6 py-8 space-y-4">
        <Skeleton className="h-8 w-3/4" />
        <Skeleton className="h-4 w-1/2" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (isError || !page) {
    return (
      <div className="flex h-full items-center justify-center p-8">
        <ErrorState
          title="Page not found"
          description="This page may have been deleted or you may not have access."
          onRetry={refetch}
        />
      </div>
    );
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

      <div className="flex-1 max-w-4xl mx-auto w-full px-6 pt-6 pb-16">
        <PageDocumentHeader
          page={page}
          pageId={pageId}
          saveState={saveState}
          onNavigate={handleNavigateToPage}
        />

        <div className="flex items-start gap-3 mt-4 mb-2">
          <PageIconPicker
            icon={page.icon}
            isEditable={isEditable}
            onIconChange={handleIconChange}
          />
        </div>

        <textarea
          value={localTitle}
          onChange={handleTitleChange}
          onKeyDown={handleTitleKeyDown}
          onInput={handleTitleInput}
          placeholder="Untitled"
          className="w-full resize-none bg-transparent border-0 outline-none text-3xl font-bold text-foreground placeholder:text-muted-foreground/50 leading-tight mb-4"
          rows={1}
          style={{ height: "auto" }}
          readOnly={!isEditable}
        />

        {page.isLocked && !canManage && (
          <div className="mb-4 flex items-center gap-2 rounded-lg border border-border bg-muted px-3 py-2 text-sm text-muted-foreground">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>This page is locked and is read-only.</span>
          </div>
        )}

        <TiptapEditor
          content={page.content ?? undefined}
          contentKey={pageId}
          variant="document"
          editable={isEditable}
          placeholder="Start writing…"
          minHeightClassName="min-h-[400px]"
          onChange={handleEditorChange}
          fetchMentionUsers={fetchMentionUsers}
          fetchPageLinks={fetchPageLinks}
          onNavigateToPage={handleNavigateToPage}
        />

        <div className="flex items-center gap-4 mt-8 pt-4 border-t border-border/40 text-xs text-muted-foreground">
          <span>{wordCount} words</span>
          <span>Edited {timeAgo(page.updatedAt)}</span>
        </div>
      </div>
    </div>
  );
}
