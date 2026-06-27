"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type ChangeEvent } from "react";
import { useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  ArrowLeft,
  Check,
  Loader2,
  AlertCircle,
  Globe,
  GlobeLock,
  Settings2,
  Sparkles,
  Wand2,
  FileText,
} from "lucide-react";
import { TiptapEditor } from "@/components/editor/tiptap-editor";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useDebouncedValue } from "@/hooks/use-debounce";
import { getErrorMessage } from "@/lib/get-error-message";
import { queryKeys } from "@/lib/query-keys";
import { cn } from "@/lib/utils";
import {
  useCreateKbArticle,
  useUpdateKbArticle,
  usePublishKbArticle,
  useUnpublishKbArticle,
  useKbAiDraft,
  useKbAiImprove,
  useKbAiSummarize,
} from "@/lib/api/hooks/kb";
import type { KbArticle, KbArticleStatus } from "@/types/kb";
import { ArticleSettingsSheet } from "./article-settings-sheet";

type SaveState = "idle" | "saving" | "saved" | "error";

interface ArticleSnapshot {
  title: string;
  content: string;
  contentText: string;
}

interface ArticleEditorProps {
  spaceId: number;
  article?: KbArticle;
  initialTitle?: string;
}

const BLOCK_TYPES = new Set([
  "paragraph",
  "heading",
  "listItem",
  "blockquote",
  "codeBlock",
]);

function extractPlainText(node: unknown): string {
  if (typeof node !== "object" || node === null) return "";
  if ("text" in node && typeof node.text === "string") return node.text;
  if ("content" in node && Array.isArray(node.content)) {
    const inner = node.content.map(extractPlainText).join("");
    const type = "type" in node && typeof node.type === "string" ? node.type : "";
    return BLOCK_TYPES.has(type) ? `${inner}\n` : inner;
  }
  return "";
}

function parseStoredContent(raw: string | null | undefined): unknown {
  if (!raw) return undefined;
  try {
    const parsed: unknown = JSON.parse(raw);
    if (typeof parsed === "object" && parsed !== null) return parsed;
    return raw;
  } catch {
    return raw;
  }
}

function serializeContent(json: unknown): string {
  if (json === null || json === undefined) return "";
  return JSON.stringify(json);
}

function normalizePlainText(json: unknown): string {
  return extractPlainText(json).replace(/\s+/g, " ").trim();
}

function buildDocFromText(text: string): unknown {
  const lines = text.replace(/\r\n/g, "\n").split("\n");
  const blocks = lines.map((line) =>
    line.length > 0
      ? { type: "paragraph", content: [{ type: "text", text: line }] }
      : { type: "paragraph" },
  );
  return { type: "doc", content: blocks.length > 0 ? blocks : [{ type: "paragraph" }] };
}

function handleAiError(error: unknown): void {
  const message = getErrorMessage(error);
  if (message.toLowerCase().includes("credit")) {
    toast.error("You're out of AI credits — top up to continue");
    return;
  }
  toast.error(message);
}

function snapshotKey(snapshot: ArticleSnapshot): string {
  return JSON.stringify(snapshot);
}

function isConflictError(error: unknown): boolean {
  if (!(error instanceof Error)) return false;
  return error.message.startsWith("409") || /conflict/i.test(error.message);
}

const STATUS_LABELS: Record<KbArticleStatus, string> = {
  draft: "Draft",
  in_review: "In review",
  published: "Published",
  archived: "Archived",
};

const STATUS_STYLES: Record<KbArticleStatus, string> = {
  draft: "bg-muted text-muted-foreground",
  in_review:
    "bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300",
  published:
    "bg-green-100 text-green-700 dark:bg-green-950/40 dark:text-green-300",
  archived: "bg-muted text-muted-foreground",
};

function StatusPill({ status }: { status: KbArticleStatus }) {
  return (
    <Badge variant="outline" className={cn("font-medium", STATUS_STYLES[status])}>
      {STATUS_LABELS[status]}
    </Badge>
  );
}

function SaveIndicator({ state }: { state: SaveState }) {
  if (state === "saving") {
    return (
      <span className="flex items-center gap-1 text-xs text-muted-foreground">
        <Loader2 className="h-3 w-3 animate-spin" /> Saving…
      </span>
    );
  }
  if (state === "saved") {
    return (
      <span className="flex items-center gap-1 text-xs text-muted-foreground">
        <Check className="h-3 w-3" /> Saved
      </span>
    );
  }
  if (state === "error") {
    return (
      <span className="flex items-center gap-1 text-xs text-destructive">
        <AlertCircle className="h-3 w-3" /> Couldn&apos;t save
      </span>
    );
  }
  return null;
}

export function ArticleEditorSkeleton() {
  return (
    <div className="flex flex-1 min-h-0 flex-col">
      <div className="flex shrink-0 items-center gap-3 border-b border-border px-4 py-3 sm:px-6">
        <Skeleton className="h-8 w-8 rounded-md" />
        <Skeleton className="h-8 max-w-md flex-1" />
        <Skeleton className="h-6 w-16 rounded-full" />
        <Skeleton className="h-8 w-24 rounded-md" />
        <Skeleton className="h-8 w-24 rounded-md" />
      </div>
      <div className="flex-1 min-h-0 overflow-y-auto">
        <div className="mx-auto max-w-4xl space-y-3 px-4 py-6 sm:px-6">
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-[360px] w-full rounded-md" />
        </div>
      </div>
    </div>
  );
}

export function ArticleEditor({ spaceId, article, initialTitle }: ArticleEditorProps) {
  const router = useRouter();
  const qc = useQueryClient();
  const createArticle = useCreateKbArticle();
  const updateArticle = useUpdateKbArticle();
  const publishArticle = usePublishKbArticle();
  const unpublishArticle = useUnpublishKbArticle();
  const aiDraft = useKbAiDraft();
  const aiImprove = useKbAiImprove();
  const aiSummarize = useKbAiSummarize();

  const [initialContent] = useState<unknown>(() => parseStoredContent(article?.content));
  const [title, setTitle] = useState(article?.title ?? initialTitle ?? "");
  const [contentJson, setContentJson] = useState<unknown>(initialContent);
  const [editorContent, setEditorContent] = useState<unknown>(initialContent);
  const [editorKey, setEditorKey] = useState(0);
  const [articleId, setArticleId] = useState<number | null>(article?.id ?? null);
  const [saveState, setSaveState] = useState<SaveState>("idle");
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [draftOpen, setDraftOpen] = useState(false);
  const [draftPrompt, setDraftPrompt] = useState("");

  const creatingRef = useRef(false);
  const lastSavedKeyRef = useRef<string>(
    snapshotKey({
      title: (article?.title ?? "").trim(),
      content: serializeContent(initialContent),
      contentText: normalizePlainText(initialContent),
    }),
  );

  const currentSnapshot = useMemo<ArticleSnapshot>(
    () => ({
      title: title.trim(),
      content: serializeContent(contentJson),
      contentText: normalizePlainText(contentJson),
    }),
    [title, contentJson],
  );
  const latestSnapshotRef = useRef(currentSnapshot);
  useEffect(() => {
    latestSnapshotRef.current = currentSnapshot;
  }, [currentSnapshot]);

  const debouncedSnapshot = useDebouncedValue(currentSnapshot, 1000);

  const status: KbArticleStatus = article?.status ?? "draft";
  const isSaving = createArticle.isPending || updateArticle.isPending;
  const displayState: SaveState = isSaving ? "saving" : saveState;
  const canPublish =
    Boolean(article) &&
    currentSnapshot.title.length > 0 &&
    currentSnapshot.contentText.length > 0;

  const performSave = useCallback(
    (snapshot: ArticleSnapshot, key: string) => {
      if (articleId === null) {
        if (creatingRef.current) return;
        creatingRef.current = true;
        createArticle.mutate(
          {
            title: snapshot.title,
            spaceId,
            content: snapshot.content,
            contentText: snapshot.contentText,
            status: "draft",
          },
          {
            onSuccess: (created) => {
              creatingRef.current = false;
              lastSavedKeyRef.current = key;
              setArticleId(created.id);
              setSaveState("saved");
              const live = latestSnapshotRef.current;
              const liveKey = snapshotKey(live);
              if (liveKey !== key && live.title) {
                updateArticle.mutate(
                  {
                    articleId: created.id,
                    title: live.title,
                    content: live.content,
                    contentText: live.contentText,
                  },
                  {
                    onSuccess: () => {
                      lastSavedKeyRef.current = liveKey;
                    },
                  },
                );
              }
              router.replace(
                `/knowledge-base/spaces/${spaceId}/articles/${created.id}/edit`,
              );
            },
            onError: (error) => {
              creatingRef.current = false;
              setSaveState("error");
              toast.error(getErrorMessage(error));
            },
          },
        );
        return;
      }

      updateArticle.mutate(
        {
          articleId,
          title: snapshot.title,
          content: snapshot.content,
          contentText: snapshot.contentText,
        },
        {
          onSuccess: () => {
            lastSavedKeyRef.current = key;
            setSaveState("saved");
          },
          onError: (error) => {
            setSaveState("error");
            if (isConflictError(error)) {
              toast.warning("This article changed elsewhere. Showing the latest version.");
              qc.invalidateQueries({ queryKey: queryKeys.kb.article(articleId) });
            } else {
              toast.error(getErrorMessage(error));
            }
          },
        },
      );
    },
    [articleId, spaceId, createArticle, updateArticle, router, qc],
  );

  useEffect(() => {
    const key = snapshotKey(debouncedSnapshot);
    if (key === lastSavedKeyRef.current) return;
    if (!debouncedSnapshot.title) return;
    performSave(debouncedSnapshot, key);
  }, [debouncedSnapshot, performSave]);

  const handleTitleChange = useCallback((event: ChangeEvent<HTMLInputElement>) => {
    setTitle(event.target.value);
  }, []);

  const handleEditorChange = useCallback((json: unknown) => {
    setContentJson(json);
  }, []);

  const replaceBody = useCallback((text: string) => {
    const doc = buildDocFromText(text);
    setContentJson(doc);
    setEditorContent(doc);
    setEditorKey((key) => key + 1);
  }, []);

  const isAiBusy = aiDraft.isPending || aiImprove.isPending || aiSummarize.isPending;

  const handleDraftPromptChange = useCallback((event: ChangeEvent<HTMLTextAreaElement>) => {
    setDraftPrompt(event.target.value);
  }, []);

  function handleOpenDraft() {
    setDraftPrompt("");
    setDraftOpen(true);
  }

  function handleCloseDraft() {
    setDraftOpen(false);
  }

  function handleDraftSubmit() {
    const prompt = draftPrompt.trim();
    if (!prompt || aiDraft.isPending) return;
    const draftTitle = title.trim();
    aiDraft.mutate(
      { prompt, title: draftTitle || undefined },
      {
        onSuccess: (data) => {
          replaceBody(data.content);
          setDraftOpen(false);
          toast.success("Draft generated");
        },
        onError: handleAiError,
      },
    );
  }

  function handleImprove() {
    const text = currentSnapshot.contentText;
    if (!text) {
      toast.error("Add some content before improving");
      return;
    }
    if (aiImprove.isPending) return;
    aiImprove.mutate(
      { text },
      {
        onSuccess: (data) => {
          replaceBody(data.content);
          toast.success("Content improved");
        },
        onError: handleAiError,
      },
    );
  }

  function handleSummarize() {
    const text = currentSnapshot.contentText;
    if (!text) {
      toast.error("Add some content before summarizing");
      return;
    }
    if (articleId === null) {
      toast.error("Save the article before generating an excerpt");
      return;
    }
    if (aiSummarize.isPending) return;
    const id = articleId;
    aiSummarize.mutate(
      { text },
      {
        onSuccess: (data) => {
          updateArticle.mutate(
            { articleId: id, excerpt: data.content.trim() },
            {
              onSuccess: () => toast.success("Excerpt updated from summary"),
              onError: (error) => toast.error(getErrorMessage(error)),
            },
          );
        },
        onError: handleAiError,
      },
    );
  }

  function handleBack() {
    router.push(`/knowledge-base/spaces/${spaceId}`);
  }

  function handleOpenSettings() {
    setSettingsOpen(true);
  }

  function handlePublish() {
    if (!article) return;
    if (!canPublish) {
      toast.error("Add a title and content before publishing");
      return;
    }
    const id = article.id;
    const snapshot = currentSnapshot;
    const key = snapshotKey(snapshot);
    const runPublish = () => {
      publishArticle.mutate(id, {
        onSuccess: () => toast.success("Article published"),
        onError: (error) => toast.error(getErrorMessage(error)),
      });
    };
    if (key !== lastSavedKeyRef.current && snapshot.title) {
      updateArticle.mutate(
        {
          articleId: id,
          title: snapshot.title,
          content: snapshot.content,
          contentText: snapshot.contentText,
        },
        {
          onSuccess: () => {
            lastSavedKeyRef.current = key;
            setSaveState("saved");
            runPublish();
          },
          onError: (error) => {
            setSaveState("error");
            toast.error(getErrorMessage(error));
          },
        },
      );
      return;
    }
    runPublish();
  }

  function handleUnpublish() {
    if (!article) return;
    unpublishArticle.mutate(article.id, {
      onSuccess: () => toast.success("Article unpublished"),
      onError: (error) => toast.error(getErrorMessage(error)),
    });
  }

  const isPublishing = publishArticle.isPending || unpublishArticle.isPending;

  return (
    <div className="flex flex-1 min-h-0 flex-col">
      <header className="flex shrink-0 flex-wrap items-center gap-3 border-b border-border px-4 py-3 sm:px-6">
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 shrink-0"
          onClick={handleBack}
          aria-label="Back to space"
        >
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <Input
          value={title}
          onChange={handleTitleChange}
          placeholder="Article title"
          aria-label="Article title"
          className="h-9 min-w-0 flex-1 border-0 bg-transparent px-0 text-base font-semibold shadow-none focus-visible:ring-0"
        />
        <div className="flex shrink-0 items-center gap-3">
          <StatusPill status={status} />
          <SaveIndicator state={displayState} />
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" disabled={isAiBusy}>
                {isAiBusy ? (
                  <Loader2 className="mr-1 h-4 w-4 animate-spin" />
                ) : (
                  <Sparkles className="mr-1 h-4 w-4" />
                )}
                AI
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-60">
              <DropdownMenuLabel className="flex items-center justify-between">
                <span>AI authoring</span>
                <span className="text-[10px] font-normal text-muted-foreground">1 credit</span>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onSelect={handleOpenDraft} disabled={isAiBusy}>
                <Sparkles className="h-4 w-4" /> Draft from prompt
              </DropdownMenuItem>
              <DropdownMenuItem onSelect={handleImprove} disabled={isAiBusy}>
                <Wand2 className="h-4 w-4" /> Improve
              </DropdownMenuItem>
              <DropdownMenuItem onSelect={handleSummarize} disabled={isAiBusy}>
                <FileText className="h-4 w-4" /> Summarize → excerpt
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          <Button
            variant="outline"
            size="sm"
            onClick={handleOpenSettings}
            disabled={!article}
          >
            <Settings2 className="mr-1 h-4 w-4" /> Settings
          </Button>
          {status === "published" ? (
            <Button
              variant="outline"
              size="sm"
              onClick={handleUnpublish}
              disabled={!article || isPublishing}
            >
              <GlobeLock className="mr-1 h-4 w-4" /> Unpublish
            </Button>
          ) : (
            <Button
              size="sm"
              onClick={handlePublish}
              disabled={!canPublish || isPublishing}
            >
              <Globe className="mr-1 h-4 w-4" /> Publish
            </Button>
          )}
        </div>
      </header>

      <div className="flex-1 min-h-0 overflow-y-auto scrollbar-thin">
        <div className="mx-auto max-w-4xl px-4 py-6 sm:px-6">
          <TiptapEditor
            key={editorKey}
            content={editorContent}
            onChange={handleEditorChange}
            placeholder="Start writing your article…"
          />
        </div>
      </div>

      <Dialog open={draftOpen} onOpenChange={setDraftOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Draft from prompt</DialogTitle>
            <DialogDescription>
              Describe what this article should cover. AI writes a first draft you can edit. Uses 1 credit.
            </DialogDescription>
          </DialogHeader>
          <Textarea
            value={draftPrompt}
            onChange={handleDraftPromptChange}
            placeholder="e.g. How to reset your password in three steps"
            aria-label="Draft prompt"
            rows={4}
            className="resize-none"
          />
          <DialogFooter>
            <Button variant="outline" onClick={handleCloseDraft} disabled={aiDraft.isPending}>
              Cancel
            </Button>
            <Button onClick={handleDraftSubmit} disabled={!draftPrompt.trim() || aiDraft.isPending}>
              {aiDraft.isPending ? (
                <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
              ) : (
                <Sparkles className="mr-1.5 h-4 w-4" />
              )}
              Generate draft
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {article && (
        <ArticleSettingsSheet
          open={settingsOpen}
          onOpenChange={setSettingsOpen}
          spaceId={spaceId}
          article={article}
        />
      )}
    </div>
  );
}
