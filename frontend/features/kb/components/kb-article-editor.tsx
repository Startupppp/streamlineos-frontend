"use client";

import { useEffect, useMemo, useState, type ChangeEvent } from "react";
import { History, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { PageWrapper } from "@/components/ui/page-wrapper";
import {
  useUpdateKbArticle,
  type KbArticleDetail,
  type KbArticleStatus,
  type KbArticleVisibility,
  type KbCategory,
} from "@/hooks/api/support/kb";
import { getApiError } from "@/lib/api-client";
import { useDebouncedValue } from "@/hooks/common/use-debounce";
import { toast } from "sonner";
import { KbFeedbackPanel } from "./kb-feedback-panel";
import { KbAttachmentsPanel } from "./kb-attachments-panel";
import { KbCommentsPanel } from "./kb-comments-panel";

const CATEGORY_NONE = "none";

interface ArticleDraft {
  title: string;
  categoryId: string;
  excerpt: string;
  content: string;
  status: KbArticleStatus;
  visibility: KbArticleVisibility;
  tagsInput: string;
}

function draftStorageKey(articleId: number): string {
  return `kb-draft-${articleId}`;
}

function isArticleStatus(value: unknown): value is KbArticleStatus {
  return value === "draft" || value === "published" || value === "archived";
}

function isArticleVisibility(value: unknown): value is KbArticleVisibility {
  return value === "internal" || value === "public";
}

function asArticleStatus(v: string): KbArticleStatus | undefined {
  return isArticleStatus(v) ? v : undefined;
}

function asArticleVisibility(v: string): KbArticleVisibility | undefined {
  return isArticleVisibility(v) ? v : undefined;
}

function parseDraft(value: unknown): ArticleDraft | null {
  if (typeof value !== "object" || value === null) return null;
  const record: Record<string, unknown> = { ...value };
  const { title, categoryId, excerpt, content, status, visibility, tagsInput } = record;
  if (
    typeof title !== "string" ||
    typeof categoryId !== "string" ||
    typeof excerpt !== "string" ||
    typeof content !== "string" ||
    typeof tagsInput !== "string" ||
    !isArticleStatus(status) ||
    !isArticleVisibility(visibility)
  ) {
    return null;
  }
  return { title, categoryId, excerpt, content, status, visibility, tagsInput };
}

function readDraft(articleId: number): ArticleDraft | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(draftStorageKey(articleId));
    if (!raw) return null;
    return parseDraft(JSON.parse(raw));
  } catch {
    return null;
  }
}

function articleToDraft(article: KbArticleDetail): ArticleDraft {
  return {
    title: article.title,
    categoryId: article.categoryId ? String(article.categoryId) : CATEGORY_NONE,
    excerpt: article.excerpt ?? "",
    content: article.content ?? "",
    status: article.status,
    visibility: article.visibility,
    tagsInput: (article.tags ?? []).join(", "),
  };
}

export function KbArticleEditor({
  article,
  categories,
}: {
  article: KbArticleDetail;
  categories: KbCategory[];
}) {
  const update = useUpdateKbArticle();

  const [title, setTitle] = useState(article.title);
  const [categoryId, setCategoryId] = useState<string>(
    article.categoryId ? String(article.categoryId) : CATEGORY_NONE,
  );
  const [excerpt, setExcerpt] = useState(article.excerpt ?? "");
  const [content, setContent] = useState(article.content ?? "");
  const [status, setStatus] = useState<KbArticleStatus>(article.status);
  const [visibility, setVisibility] = useState<KbArticleVisibility>(article.visibility);
  const [tagsInput, setTagsInput] = useState((article.tags ?? []).join(", "));

  const baseline = useMemo(() => articleToDraft(article), [article]);
  const [pendingDraft, setPendingDraft] = useState<ArticleDraft | null>(() => {
    const stored = readDraft(article.id);
    if (!stored) return null;
    return JSON.stringify(stored) === JSON.stringify(articleToDraft(article)) ? null : stored;
  });

  const currentDraft = useMemo<ArticleDraft>(
    () => ({ title, categoryId, excerpt, content, status, visibility, tagsInput }),
    [title, categoryId, excerpt, content, status, visibility, tagsInput],
  );
  const debouncedDraft = useDebouncedValue(currentDraft, 1000);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const key = draftStorageKey(article.id);
    if (JSON.stringify(debouncedDraft) === JSON.stringify(baseline)) {
      window.localStorage.removeItem(key);
      return;
    }
    window.localStorage.setItem(key, JSON.stringify(debouncedDraft));
  }, [debouncedDraft, baseline, article.id]);

  const tags = useMemo(
    () =>
      tagsInput
        .split(",")
        .map((t) => t.trim())
        .filter(Boolean),
    [tagsInput],
  );

  function handleTitleChange(event: ChangeEvent<HTMLInputElement>) {
    setTitle(event.target.value);
  }

  function handleExcerptChange(event: ChangeEvent<HTMLTextAreaElement>) {
    setExcerpt(event.target.value);
  }

  function handleContentChange(event: ChangeEvent<HTMLTextAreaElement>) {
    setContent(event.target.value);
  }

  function handleTagsChange(event: ChangeEvent<HTMLInputElement>) {
    setTagsInput(event.target.value);
  }

  function handleStatusChange(v: string) {
    const next = asArticleStatus(v);
    if (next) setStatus(next);
  }

  function handleVisibilityChange(v: string) {
    const next = asArticleVisibility(v);
    if (next) setVisibility(next);
  }

  function handleRestoreDraft() {
    if (!pendingDraft) return;
    setTitle(pendingDraft.title);
    setCategoryId(pendingDraft.categoryId);
    setExcerpt(pendingDraft.excerpt);
    setContent(pendingDraft.content);
    setStatus(pendingDraft.status);
    setVisibility(pendingDraft.visibility);
    setTagsInput(pendingDraft.tagsInput);
    setPendingDraft(null);
    toast.success("Draft restored");
  }

  function handleDiscardDraft() {
    if (typeof window !== "undefined") {
      window.localStorage.removeItem(draftStorageKey(article.id));
    }
    setPendingDraft(null);
  }

  function handleSave() {
    if (!title.trim()) {
      toast.error("Title is required");
      return;
    }
    update.mutate(
      {
        id: article.id,
        title: title.trim(),
        categoryId: categoryId === CATEGORY_NONE ? null : Number(categoryId),
        excerpt: excerpt.trim() || null,
        content,
        status,
        visibility,
        tags: tags.length > 0 ? tags : null,
      },
      {
        onSuccess: () => {
          if (typeof window !== "undefined") {
            window.localStorage.removeItem(draftStorageKey(article.id));
          }
          setPendingDraft(null);
          toast.success("Article saved");
        },
        onError: (e) => toast.error(getApiError(e)),
      },
    );
  }

  return (
    <PageWrapper
      eyebrow="Documents · Knowledge Base"
      title={article.title}
      subtitle="Edit article content, metadata, and publishing settings."
      backHref="/kb"
      actions={
        <Button size="sm" onClick={handleSave} disabled={update.isPending}>
          <Save className="h-3.5 w-3.5 mr-1" />
          {update.isPending ? "Saving…" : "Save"}
        </Button>
      }
    >
      {pendingDraft && (
        <div className="mb-4 flex flex-col gap-3 rounded-lg border border-amber-300 bg-amber-50 px-4 py-3 text-amber-900 dark:border-amber-800/50 dark:bg-amber-950/20 dark:text-amber-200 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-2 min-w-0">
            <History className="h-4 w-4 mt-0.5 shrink-0" />
            <p className="text-sm">
              Unsaved changes from a previous session were found. Restore them?
            </p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <Button size="sm" variant="outline" onClick={handleDiscardDraft}>
              Discard
            </Button>
            <Button size="sm" onClick={handleRestoreDraft}>
              Restore
            </Button>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 space-y-4">
          <div className="space-y-1">
            <Label>Title *</Label>
            <Input value={title} onChange={handleTitleChange} placeholder="Article title" />
          </div>
          <div className="space-y-1">
            <Label>Excerpt</Label>
            <Textarea
              rows={2}
              value={excerpt}
              onChange={handleExcerptChange}
              placeholder="Short summary shown in listings"
            />
          </div>

          <Tabs defaultValue="write">
            <div className="flex items-center justify-between">
              <Label>Content</Label>
              <TabsList>
                <TabsTrigger value="write">Write</TabsTrigger>
                <TabsTrigger value="preview">Preview</TabsTrigger>
              </TabsList>
            </div>
            <TabsContent value="write" className="mt-2">
              <Textarea
                rows={18}
                value={content}
                onChange={handleContentChange}
                placeholder="Write the article body…"
                className="font-mono text-sm"
              />
            </TabsContent>
            <TabsContent value="preview" className="mt-2">
              <Card>
                <CardContent className="py-4">
                  {content.trim() ? (
                    <p className="whitespace-pre-wrap text-sm leading-relaxed">{content}</p>
                  ) : (
                    <p className="text-sm text-muted-foreground">Nothing to preview yet.</p>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>

        <div className="space-y-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm">Settings</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-1">
                <Label>Category</Label>
                <Select value={categoryId} onValueChange={setCategoryId}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={CATEGORY_NONE}>Uncategorized</SelectItem>
                    {categories.map((c) => (
                      <SelectItem key={c.id} value={String(c.id)}>
                        {c.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label>Status</Label>
                <Select value={status} onValueChange={handleStatusChange}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="draft">Draft</SelectItem>
                    <SelectItem value="published">Published</SelectItem>
                    <SelectItem value="archived">Archived</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label>Visibility</Label>
                <Select value={visibility} onValueChange={handleVisibilityChange}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="internal">Internal</SelectItem>
                    <SelectItem value="public">Public</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-[11px] text-muted-foreground">
                  Public + published articles appear on the help center.
                </p>
              </div>
              <div className="space-y-1">
                <Label>Tags</Label>
                <Input
                  value={tagsInput}
                  onChange={handleTagsChange}
                  placeholder="Comma separated"
                />
              </div>
            </CardContent>
          </Card>

          <KbFeedbackPanel article={article} />
          <KbAttachmentsPanel article={article} />
          <KbCommentsPanel article={article} />
        </div>
      </div>
    </PageWrapper>
  );
}
