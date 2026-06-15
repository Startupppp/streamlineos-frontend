"use client";

import { use, useMemo, useState, type ChangeEvent } from "react";
import { useRouter } from "next/navigation";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { LoadingState } from "@/components/shared/loading-state";
import { ErrorState } from "@/components/shared/error-state";
import { EmptyState } from "@/components/ui/empty-state";
import {
  ArrowLeft,
  Save,
  ThumbsUp,
  ThumbsDown,
  Eye,
  MessageSquare,
  MessagesSquare,
  Send,
  Trash2,
  Loader2,
} from "lucide-react";
import {
  useKbArticle,
  useUpdateKbArticle,
  useKbArticleFeedback,
  useKbCategories,
  type KbArticleDetail,
  type KbCategory,
  type KbArticleStatus,
  type KbArticleVisibility,
} from "@/lib/api/hooks/support/kb";
import {
  useKbComments,
  useAddKbComment,
  useDeleteKbComment,
} from "@/lib/api/hooks/support/kb-comments";
import { getApiError } from "@/lib/api-client";
import { resolveImageUrl } from "@/lib/utils";
import { toast } from "sonner";
import { format, formatDistanceToNow } from "date-fns";

const CATEGORY_NONE = "none";

function ArticleFeedbackPanel({ article }: { article: KbArticleDetail }) {
  const feedbackQuery = useKbArticleFeedback(article.id);
  const feedback = feedbackQuery.data ?? [];

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm flex items-center gap-2">
          <MessageSquare className="h-4 w-4 text-muted-foreground" /> Feedback
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="grid grid-cols-3 gap-2 text-center">
          <div className="rounded-lg border border-border py-2">
            <p className="text-base font-semibold tabular-nums">{article.views}</p>
            <p className="text-[11px] text-muted-foreground flex items-center justify-center gap-1">
              <Eye className="h-3 w-3" /> Views
            </p>
          </div>
          <div className="rounded-lg border border-border py-2">
            <p className="text-base font-semibold tabular-nums text-green-600">
              {article.helpfulCount}
            </p>
            <p className="text-[11px] text-muted-foreground flex items-center justify-center gap-1">
              <ThumbsUp className="h-3 w-3" /> Helpful
            </p>
          </div>
          <div className="rounded-lg border border-border py-2">
            <p className="text-base font-semibold tabular-nums text-red-600">
              {article.notHelpfulCount}
            </p>
            <p className="text-[11px] text-muted-foreground flex items-center justify-center gap-1">
              <ThumbsDown className="h-3 w-3" /> Not helpful
            </p>
          </div>
        </div>

        {feedbackQuery.isLoading ? (
          <LoadingState variant="list" rows={2} />
        ) : feedback.length === 0 ? (
          <EmptyState
            icon={MessageSquare}
            title="No feedback yet"
            description="Reader feedback will appear here."
            compact
          />
        ) : (
          <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
            {feedback.map((item) => (
              <div key={item.id} className="rounded-lg border border-border px-3 py-2">
                <div className="flex items-center justify-between">
                  <Badge
                    variant={item.helpful ? "default" : "secondary"}
                    className="text-[10px]"
                  >
                    {item.helpful ? "Helpful" : "Not helpful"}
                  </Badge>
                  {item.createdAt && (
                    <span className="text-[11px] text-muted-foreground">
                      {format(new Date(item.createdAt), "MMM d, yyyy")}
                    </span>
                  )}
                </div>
                {item.comment && (
                  <p className="text-xs text-muted-foreground mt-1">{item.comment}</p>
                )}
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function getCommentInitials(name: string | null | undefined) {
  if (!name) return "?";
  return name
    .split(" ")
    .map((w) => w[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

function InternalCommentsPanel({ article }: { article: KbArticleDetail }) {
  const commentsQuery = useKbComments(article.id);
  const addComment = useAddKbComment(article.id);
  const deleteComment = useDeleteKbComment(article.id);
  const [draft, setDraft] = useState("");

  const comments = commentsQuery.data ?? [];

  function handleDraftChange(event: ChangeEvent<HTMLTextAreaElement>) {
    setDraft(event.target.value);
  }

  function handleAdd() {
    const body = draft.trim();
    if (!body) {
      toast.error("Comment cannot be empty");
      return;
    }
    addComment.mutate(body, {
      onSuccess: () => {
        setDraft("");
        toast.success("Comment added");
      },
      onError: (e) => toast.error(getApiError(e)),
    });
  }

  function handleDelete(commentId: number) {
    deleteComment.mutate(commentId, {
      onSuccess: () => toast.success("Comment deleted"),
      onError: (e) => toast.error(getApiError(e)),
    });
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm flex items-center gap-2">
          <MessagesSquare className="h-4 w-4 text-muted-foreground" /> Internal
          Comments
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="space-y-2">
          <Textarea
            rows={2}
            value={draft}
            onChange={handleDraftChange}
            placeholder="Add an internal note for your team…"
            className="text-sm resize-none"
          />
          <div className="flex justify-end">
            <Button
              size="sm"
              onClick={handleAdd}
              disabled={addComment.isPending || !draft.trim()}
            >
              {addComment.isPending ? (
                <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" />
              ) : (
                <Send className="h-3.5 w-3.5 mr-1" />
              )}
              Comment
            </Button>
          </div>
        </div>

        {commentsQuery.isLoading ? (
          <LoadingState variant="list" rows={2} />
        ) : commentsQuery.error ? (
          <ErrorState
            compact
            title="Couldn't load comments"
            description={getApiError(commentsQuery.error)}
            onRetry={() => commentsQuery.refetch()}
          />
        ) : comments.length === 0 ? (
          <EmptyState
            icon={MessagesSquare}
            title="No comments yet"
            description="Internal notes are only visible to your team."
            compact
          />
        ) : (
          <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
            {comments.map((comment) => (
              <div
                key={comment.id}
                className="rounded-lg border border-border px-3 py-2"
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5 min-w-0">
                    <Avatar className="h-5 w-5 shrink-0">
                      <AvatarImage src={resolveImageUrl(comment.userImage)} />
                      <AvatarFallback className="text-[8px]">
                        {getCommentInitials(comment.userName)}
                      </AvatarFallback>
                    </Avatar>
                    <span className="text-xs font-medium truncate">
                      {comment.userName ?? "Unknown"}
                    </span>
                    {comment.createdAt && (
                      <span className="text-[10px] text-muted-foreground shrink-0">
                        {formatDistanceToNow(new Date(comment.createdAt), {
                          addSuffix: true,
                        })}
                      </span>
                    )}
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6 shrink-0 text-muted-foreground hover:text-destructive"
                    onClick={() => handleDelete(comment.id)}
                    disabled={deleteComment.isPending}
                    aria-label="Delete comment"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
                <p className="text-xs text-foreground mt-1 whitespace-pre-wrap break-words">
                  {comment.body}
                </p>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function ArticleEditor({
  article,
  categories,
}: {
  article: KbArticleDetail;
  categories: KbCategory[];
}) {
  const router = useRouter();
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
        onSuccess: () => toast.success("Article saved"),
        onError: (e) => toast.error(getApiError(e)),
      },
    );
  }

  function handleBack() {
    router.push("/support/kb");
  }

  return (
    <PageWrapper
      eyebrow="Support · Knowledge Base"
      title={article.title}
      subtitle="Edit article content, metadata, and publishing settings."
      actions={
        <>
          <Button variant="outline" size="sm" onClick={handleBack}>
            <ArrowLeft className="h-4 w-4 mr-1" /> Back
          </Button>
          <Button size="sm" onClick={handleSave} disabled={update.isPending}>
            <Save className="h-4 w-4 mr-1" />
            {update.isPending ? "Saving…" : "Save"}
          </Button>
        </>
      }
    >
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
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
                <Select value={status} onValueChange={(v) => setStatus(v as KbArticleStatus)}>
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
                <Select
                  value={visibility}
                  onValueChange={(v) => setVisibility(v as KbArticleVisibility)}
                >
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

          <ArticleFeedbackPanel article={article} />

          <InternalCommentsPanel article={article} />
        </div>
      </div>
    </PageWrapper>
  );
}

export default function KbArticleEditorPage({
  params,
}: {
  params: Promise<{ articleId: string }>;
}) {
  const { articleId: articleIdStr } = use(params);
  const articleId = Number(articleIdStr);

  const articleQuery = useKbArticle(articleId);
  const categoriesQuery = useKbCategories();
  const categories = categoriesQuery.data ?? [];

  if (articleQuery.isLoading) {
    return (
      <PageWrapper eyebrow="Support · Knowledge Base" title="Edit Article">
        <LoadingState variant="form" />
      </PageWrapper>
    );
  }

  if (articleQuery.error || !articleQuery.data) {
    return (
      <PageWrapper eyebrow="Support · Knowledge Base" title="Edit Article">
        <ErrorState
          title="Article not found"
          description={
            articleQuery.error
              ? getApiError(articleQuery.error)
              : "This article does not exist."
          }
          onRetry={() => articleQuery.refetch()}
        />
      </PageWrapper>
    );
  }

  return (
    <ArticleEditor
      key={articleQuery.data.id}
      article={articleQuery.data}
      categories={categories}
    />
  );
}
