"use client";

import {
  use,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ChangeEvent,
} from "react";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { LoadingState } from "@/components/shared/loading-state";
import { ErrorState } from "@/components/shared/error-state";
import { EmptyState } from "@/components/ui/empty-state";
import {
  EmptyMailIllustration,
  EmptyTicketIllustration,
  EmptyUploadIllustration,
} from "@/components/illustrations";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
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
  Paperclip,
  Upload,
  FileText,
  ImageIcon,
  Download,
  History,
  Sparkles,
  RefreshCw,
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
} from "@/hooks/api/support/kb";
import {
  useKbComments,
  useAddKbComment,
  useDeleteKbComment,
} from "@/hooks/api/support/kb-comments";
import {
  useKbAttachments,
  useUploadKbAttachment,
  useDeleteKbAttachment,
  useKbAttachmentDownloadUrl,
  type KbAttachment,
} from "@/hooks/api/support/kb-attachments";
import {
  useKbIndexStatus,
  useReindexKbArticle,
} from "@/hooks/api/support/kb-rag";
import { getApiError } from "@/lib/api-client";
import { resolveImageUrl } from "@/lib/utils";
import { formatFileSize } from "@/lib/format-utils";
import { useDebouncedValue } from "@/hooks/common/use-debounce";
import { toast } from "sonner";
import { format, formatDistanceToNow } from "date-fns";

const ATTACHMENT_ACCEPT =
  ".pdf,.doc,.docx,.xls,.xlsx,.jpg,.jpeg,.png,.gif,.webp";
const ATTACHMENT_MAX_SIZE = 10 * 1024 * 1024;

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
  const { title, categoryId, excerpt, content, status, visibility, tagsInput } =
    record;
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
            <p className="text-base font-semibold tabular-nums">
              {article.views}
            </p>
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
            illustration={<EmptyMailIllustration />}
            title="No feedback yet"
            description="Reader feedback will appear here."
            compact
          />
        ) : (
          <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
            {feedback.map((item) => (
              <div
                key={item.id}
                className="rounded-lg border border-border px-3 py-2"
              >
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
                  <p className="text-xs text-muted-foreground mt-1">
                    {item.comment}
                  </p>
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

interface CommentItemProps {
  comment: {
    id: number;
    userImage?: string | null;
    userName?: string | null;
    createdAt?: string | null;
    body: string;
  };
  isPendingDelete: boolean;
  onDelete: (commentId: number) => void;
}

function CommentItem({ comment, isPendingDelete, onDelete }: CommentItemProps) {
  function handleDelete() {
    onDelete(comment.id);
  }
  return (
    <div className="rounded-lg border border-border px-3 py-2">
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
          onClick={handleDelete}
          disabled={isPendingDelete}
          aria-label="Delete comment"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </Button>
      </div>
      <p className="text-xs text-foreground mt-1 whitespace-pre-wrap break-words">
        {comment.body}
      </p>
    </div>
  );
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

  function handleCommentsRetry() {
    void commentsQuery.refetch();
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
            onRetry={handleCommentsRetry}
          />
        ) : comments.length === 0 ? (
          <EmptyState
            illustration={<EmptyTicketIllustration />}
            title="No comments yet"
            description="Internal notes are only visible to your team."
            compact
          />
        ) : (
          <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
            {comments.map((comment) => (
              <CommentItem
                key={comment.id}
                comment={comment}
                isPendingDelete={deleteComment.isPending}
                onDelete={handleDelete}
              />
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function AttachmentIcon({ mimeType }: { mimeType: string | null }) {
  if (mimeType?.startsWith("image/")) {
    return <ImageIcon className="h-4 w-4 text-muted-foreground shrink-0" />;
  }
  return <FileText className="h-4 w-4 text-muted-foreground shrink-0" />;
}

interface AttachmentRowItemProps {
  attachment: KbAttachment;
  isDownloadPending: boolean;
  isDeletePending: boolean;
  onDownload: (attachment: KbAttachment) => void;
  onDelete: (attachment: KbAttachment) => void;
}

function AttachmentRowItem({
  attachment,
  isDownloadPending,
  isDeletePending,
  onDownload,
  onDelete,
}: AttachmentRowItemProps) {
  function handleDownload() {
    onDownload(attachment);
  }
  function handleDelete() {
    onDelete(attachment);
  }
  return (
    <div className="flex items-center gap-2 rounded-lg border border-border px-3 py-2">
      <AttachmentIcon mimeType={attachment.mimeType} />
      <div className="min-w-0 flex-1">
        <p className="text-xs font-medium truncate">{attachment.fileName}</p>
        {attachment.fileSize !== null && (
          <p className="text-[10px] text-muted-foreground">
            {formatFileSize(attachment.fileSize)}
          </p>
        )}
      </div>
      <Button
        variant="ghost"
        size="icon"
        className="h-6 w-6 shrink-0 text-muted-foreground hover:text-foreground"
        onClick={handleDownload}
        disabled={isDownloadPending}
        aria-label={`Download ${attachment.fileName}`}
      >
        <Download className="h-3.5 w-3.5" />
      </Button>
      <Button
        variant="ghost"
        size="icon"
        className="h-6 w-6 shrink-0 text-muted-foreground hover:text-destructive"
        onClick={handleDelete}
        disabled={isDeletePending}
        aria-label={`Delete ${attachment.fileName}`}
      >
        <Trash2 className="h-3.5 w-3.5" />
      </Button>
    </div>
  );
}

function ArticleAttachmentsPanel({ article }: { article: KbArticleDetail }) {
  const attachmentsQuery = useKbAttachments(article.id);
  const uploadAttachment = useUploadKbAttachment(article.id);
  const deleteAttachment = useDeleteKbAttachment(article.id);
  const downloadUrl = useKbAttachmentDownloadUrl(article.id);
  const indexStatus = useKbIndexStatus(article.id);
  const reindex = useReindexKbArticle();
  const inputRef = useRef<HTMLInputElement>(null);
  const [pendingDelete, setPendingDelete] = useState<KbAttachment | null>(null);

  const attachments = attachmentsQuery.data ?? [];

  function handleReindex() {
    reindex.mutate(article.id, {
      onSuccess: (result) => {
        toast.success(
          `Indexed ${result.chunks} passage${result.chunks === 1 ? "" : "s"} for AI search`,
        );
        result.warnings.forEach((warning) => toast.warning(warning));
      },
      onError: (e) => toast.error(getApiError(e)),
    });
  }

  function handlePickFile() {
    inputRef.current?.click();
  }

  function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    if (file.size > ATTACHMENT_MAX_SIZE) {
      toast.error("File too large (max 10MB)");
      return;
    }
    uploadAttachment.mutate(file, {
      onSuccess: () => toast.success("Attachment uploaded"),
      onError: (e) => toast.error(getApiError(e)),
    });
  }

  function handleDownload(attachment: KbAttachment) {
    downloadUrl.mutate(attachment.id, {
      onSuccess: (data) =>
        window.open(data.url, "_blank", "noopener,noreferrer"),
      onError: (e) => toast.error(getApiError(e)),
    });
  }

  function handleConfirmDelete() {
    if (!pendingDelete) return;
    const attachmentId = pendingDelete.id;
    deleteAttachment.mutate(attachmentId, {
      onSuccess: () => toast.success("Attachment deleted"),
      onError: (e) => toast.error(getApiError(e)),
    });
    setPendingDelete(null);
  }

  function handleAttachmentsRetry() {
    void attachmentsQuery.refetch();
  }

  function handlePendingDeleteOpenChange(open: boolean) {
    if (!open) setPendingDelete(null);
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm flex items-center gap-2">
          <Paperclip className="h-4 w-4 text-muted-foreground" /> Attachments
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <input
          ref={inputRef}
          type="file"
          accept={ATTACHMENT_ACCEPT}
          onChange={handleFileChange}
          className="hidden"
          aria-hidden="true"
        />
        <Button
          size="sm"
          variant="outline"
          className="w-full"
          onClick={handlePickFile}
          disabled={uploadAttachment.isPending}
        >
          {uploadAttachment.isPending ? (
            <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" />
          ) : (
            <Upload className="h-3.5 w-3.5 mr-1" />
          )}
          {uploadAttachment.isPending ? "Uploading…" : "Upload file"}
        </Button>
        <p className="text-[11px] text-muted-foreground">
          PDF, images, Word or Excel · up to 10MB.
        </p>

        {attachmentsQuery.isLoading ? (
          <LoadingState variant="list" rows={2} />
        ) : attachmentsQuery.error ? (
          <ErrorState
            compact
            title="Couldn't load attachments"
            description={getApiError(attachmentsQuery.error)}
            onRetry={handleAttachmentsRetry}
          />
        ) : attachments.length === 0 ? (
          <EmptyState
            illustration={<EmptyUploadIllustration />}
            title="No attachments yet"
            description="Upload PDFs or docs readers can download."
            compact
          />
        ) : (
          <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
            {attachments.map((attachment) => (
              <AttachmentRowItem
                key={attachment.id}
                attachment={attachment}
                isDownloadPending={downloadUrl.isPending}
                isDeletePending={deleteAttachment.isPending}
                onDownload={handleDownload}
                onDelete={setPendingDelete}
              />
            ))}
          </div>
        )}

        <div className="rounded-lg border border-border bg-muted/30 px-3 py-2.5 space-y-2">
          <div className="flex items-center gap-2 min-w-0">
            <Sparkles className="h-3.5 w-3.5 text-primary shrink-0" />
            <div className="min-w-0 flex-1">
              <p className="text-xs font-medium leading-none">
                AI search index
              </p>
              <p className="text-[11px] text-muted-foreground mt-1">
                {indexStatus.isLoading
                  ? "Checking…"
                  : indexStatus.data && indexStatus.data.chunks > 0
                    ? `${indexStatus.data.chunks} passage${indexStatus.data.chunks === 1 ? "" : "s"} indexed`
                    : "Not indexed yet"}
              </p>
            </div>
          </div>
          <Button
            size="sm"
            variant="outline"
            className="w-full"
            onClick={handleReindex}
            disabled={reindex.isPending}
          >
            {reindex.isPending ? (
              <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" />
            ) : (
              <RefreshCw className="h-3.5 w-3.5 mr-1" />
            )}
            {reindex.isPending ? "Indexing…" : "Rebuild AI index"}
          </Button>
        </div>
      </CardContent>

      <AlertDialog
        open={pendingDelete !== null}
        onOpenChange={handlePendingDeleteOpenChange}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete attachment?</AlertDialogTitle>
            <AlertDialogDescription>
              {pendingDelete
                ? `"${pendingDelete.fileName}" will be permanently removed and can no longer be downloaded.`
                : ""}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
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
  const [visibility, setVisibility] = useState<KbArticleVisibility>(
    article.visibility,
  );
  const [tagsInput, setTagsInput] = useState((article.tags ?? []).join(", "));

  const baseline = useMemo(() => articleToDraft(article), [article]);
  const [pendingDraft, setPendingDraft] = useState<ArticleDraft | null>(() => {
    const stored = readDraft(article.id);
    if (!stored) return null;
    return JSON.stringify(stored) === JSON.stringify(articleToDraft(article))
      ? null
      : stored;
  });

  const currentDraft = useMemo<ArticleDraft>(
    () => ({
      title,
      categoryId,
      excerpt,
      content,
      status,
      visibility,
      tagsInput,
    }),
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
            <Input
              value={title}
              onChange={handleTitleChange}
              placeholder="Article title"
            />
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
                    <p className="whitespace-pre-wrap text-sm leading-relaxed">
                      {content}
                    </p>
                  ) : (
                    <p className="text-sm text-muted-foreground">
                      Nothing to preview yet.
                    </p>
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
                <Select
                  value={visibility}
                  onValueChange={handleVisibilityChange}
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

          <ArticleAttachmentsPanel article={article} />

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

  function handleRetry() {
    void articleQuery.refetch();
  }

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
          onRetry={handleRetry}
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
