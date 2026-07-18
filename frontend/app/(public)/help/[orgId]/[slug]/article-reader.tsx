"use client";

import { useMemo, useState, type ChangeEvent } from "react";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { LoadingState } from "@/components/shared/loading-state";
import { ErrorState } from "@/components/shared/error-state";
import {
  ArrowLeft,
  Eye,
  ThumbsUp,
  ThumbsDown,
  CheckCircle2,
  Paperclip,
  FileText,
  ImageIcon,
  Download,
  LifeBuoy,
} from "lucide-react";
import {
  usePublicKbArticle,
  useSubmitKbFeedback,
} from "@/hooks/api/support/kb";
import {
  usePublicKbAttachments,
  type PublicKbAttachment,
} from "@/hooks/api/support/kb-attachments";
import { ArticleContent, prepareArticle } from "@/components/kb/article-content";
import { TableOfContents } from "@/components/blog/table-of-contents";
import type { TocItem } from "@/lib/blog-utils";
import { getApiError } from "@/lib/api-client";
import { cn } from "@/lib/utils";
import { formatFileSize } from "@/lib/format-utils";
import { toast } from "sonner";
import { format } from "date-fns";

function PublicAttachmentIcon({ mimeType }: { mimeType: string | null }) {
  if (mimeType?.startsWith("image/")) {
    return <ImageIcon className="h-4 w-4 text-muted-foreground shrink-0" />;
  }
  return <FileText className="h-4 w-4 text-muted-foreground shrink-0" />;
}

function PublicArticleAttachments({
  attachments,
}: {
  attachments: PublicKbAttachment[];
}) {
  if (attachments.length === 0) return null;

  return (
    <div className="mt-8 border-t border-border pt-6">
      <h2 className="flex items-center gap-2 text-sm font-semibold text-foreground">
        <Paperclip className="h-4 w-4 text-muted-foreground" /> Attachments
      </h2>
      <ul className="mt-3 space-y-2">
        {attachments.map((attachment) => {
          const sizeLabel =
            attachment.fileSize !== null
              ? formatFileSize(attachment.fileSize)
              : null;
          return (
            <li key={attachment.id}>
              {attachment.downloadUrl ? (
                <a
                  href={attachment.downloadUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-3 rounded-lg border border-border px-3 py-2 transition-colors hover:bg-muted/50"
                >
                  <PublicAttachmentIcon mimeType={attachment.mimeType} />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium truncate text-foreground">
                      {attachment.fileName}
                    </p>
                    {sizeLabel && (
                      <p className="text-xs text-muted-foreground">{sizeLabel}</p>
                    )}
                  </div>
                  <Download className="h-4 w-4 text-muted-foreground shrink-0" />
                </a>
              ) : (
                <div className="flex items-center gap-3 rounded-lg border border-border px-3 py-2 opacity-60">
                  <PublicAttachmentIcon mimeType={attachment.mimeType} />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium truncate text-foreground">
                      {attachment.fileName}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Download unavailable
                    </p>
                  </div>
                </div>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}

interface ArticleReaderProps {
  orgId: string;
  slug: string;
}

export function ArticleReader({ orgId, slug }: ArticleReaderProps) {
  const { data: article, isLoading, error, refetch } = usePublicKbArticle(orgId, slug);
  const attachmentsQuery = usePublicKbAttachments(orgId, slug);
  const submitFeedback = useSubmitKbFeedback();

  const [showComment, setShowComment] = useState(false);
  const [pendingHelpful, setPendingHelpful] = useState<boolean | null>(null);
  const [comment, setComment] = useState("");
  const [submitted, setSubmitted] = useState(false);

  const tocItems = useMemo<TocItem[]>(() => {
    if (!article?.content) return [];
    return prepareArticle(article.content)
      .headings.filter((heading) => heading.level === 2 || heading.level === 3)
      .map((heading) => ({
        id: heading.id,
        text: heading.text,
        level: heading.level === 3 ? 3 : 2,
      }));
  }, [article?.content]);

  function handleCommentChange(event: ChangeEvent<HTMLTextAreaElement>) {
    setComment(event.target.value);
  }

  function handleVote(helpful: boolean) {
    setPendingHelpful(helpful);
    setShowComment(true);
  }

  function handleSubmit() {
    if (pendingHelpful === null) return;
    submitFeedback.mutate(
      {
        orgId,
        slug,
        helpful: pendingHelpful,
        comment: comment.trim() || undefined,
      },
      {
        onSuccess: () => {
          setSubmitted(true);
          setShowComment(false);
          toast.success("Thanks for your feedback!");
        },
        onError: (e) => toast.error(getApiError(e)),
      },
    );
  }

  const hasToc = tocItems.length > 0;

  return (
    <main className="min-h-dvh bg-background">
      <div
        className={cn(
          "mx-auto px-4 py-8 sm:py-12",
          hasToc ? "max-w-5xl" : "max-w-3xl",
        )}
      >
        <Button asChild variant="ghost" size="sm" className="mb-4 -ml-2">
          <Link href={`/help/${orgId}`}>
            <ArrowLeft className="h-4 w-4 mr-1" /> Back to help center
          </Link>
        </Button>

        {isLoading ? (
          <LoadingState variant="form" />
        ) : error || !article ? (
          <ErrorState
            title="Article not available"
            description={error ? getApiError(error) : "This article does not exist or is not published."}
            onRetry={() => refetch()}
          />
        ) : (
          <div
            className={cn(
              hasToc && "lg:grid lg:grid-cols-[minmax(0,1fr)_220px] lg:gap-10",
            )}
          >
            <div className="min-w-0 max-w-3xl">
              <article>
                {article.categoryName && (
                  <Badge variant="secondary" className="mb-3">
                    {article.categoryName}
                  </Badge>
                )}
                <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
                  {article.title}
                </h1>
                <div className="flex flex-wrap items-center gap-3 mt-3 text-xs text-muted-foreground">
                  {article.publishedAt && (
                    <span>Updated {format(new Date(article.publishedAt), "MMM d, yyyy")}</span>
                  )}
                  <span className="flex items-center gap-1">
                    <Eye className="h-3.5 w-3.5" /> {article.views} views
                  </span>
                </div>

                {article.excerpt && (
                  <p className="mt-4 text-base text-muted-foreground leading-relaxed">
                    {article.excerpt}
                  </p>
                )}

                <div className="mt-6">
                  <ArticleContent content={article.content} />
                </div>

                {article.tags && article.tags.length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-6">
                    {article.tags.map((tag) => (
                      <Badge key={tag} variant="outline" className="text-[11px]">
                        {tag}
                      </Badge>
                    ))}
                  </div>
                )}
              </article>

              {attachmentsQuery.data && (
                <PublicArticleAttachments attachments={attachmentsQuery.data} />
              )}

              <Card className="mt-10">
                <CardContent className="py-5">
                  {submitted ? (
                    <div className="flex items-center justify-center gap-2 text-sm text-foreground py-2">
                      <CheckCircle2 className="h-5 w-5 text-emerald-600" />
                      Thanks for your feedback!
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <p className="text-sm font-medium text-center">Was this article helpful?</p>
                      <div className="flex items-center justify-center gap-3">
                        <Button
                          variant={pendingHelpful === true ? "default" : "outline"}
                          size="sm"
                          onClick={() => handleVote(true)}
                        >
                          <ThumbsUp className="h-4 w-4 mr-1" /> Yes
                        </Button>
                        <Button
                          variant={pendingHelpful === false ? "default" : "outline"}
                          size="sm"
                          onClick={() => handleVote(false)}
                        >
                          <ThumbsDown className="h-4 w-4 mr-1" /> No
                        </Button>
                      </div>

                      {showComment && (
                        <div className="space-y-2">
                          <Textarea
                            rows={3}
                            value={comment}
                            onChange={handleCommentChange}
                            placeholder="Tell us more (optional)"
                          />
                          <div className="flex justify-center">
                            <Button
                              size="sm"
                              onClick={handleSubmit}
                              disabled={submitFeedback.isPending}
                            >
                              {submitFeedback.isPending ? "Submitting…" : "Submit feedback"}
                            </Button>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card className="mt-4 border-primary/30 bg-primary/5">
                <CardContent className="py-5 flex flex-col items-center gap-3 text-center sm:flex-row sm:justify-between sm:text-left">
                  <div className="flex items-start gap-3">
                    <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                      <LifeBuoy className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-foreground">Still need help?</p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        Our support team is happy to assist you.
                      </p>
                    </div>
                  </div>
                  <Button asChild size="sm" className="shrink-0">
                    <Link href="/contact">Contact support</Link>
                  </Button>
                </CardContent>
              </Card>
            </div>

            {hasToc && (
              <aside className="hidden lg:block">
                <div className="sticky top-8">
                  <TableOfContents items={tocItems} />
                </div>
              </aside>
            )}
          </div>
        )}
      </div>
    </main>
  );
}
