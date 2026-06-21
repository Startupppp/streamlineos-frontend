"use client";

import { useState, type ChangeEvent } from "react";
import { useParams } from "next/navigation";
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
} from "lucide-react";
import {
  usePublicKbArticle,
  useSubmitKbFeedback,
} from "@/lib/api/hooks/support/kb";
import {
  usePublicKbAttachments,
  type PublicKbAttachment,
} from "@/lib/api/hooks/support/kb-attachments";
import { getApiError } from "@/lib/api-client";
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

export default function PublicHelpArticlePage() {
  const params = useParams<{ orgId: string; slug: string }>();
  const orgId = params.orgId;
  const slug = params.slug;

  const { data: article, isLoading, error, refetch } = usePublicKbArticle(orgId, slug);
  const attachmentsQuery = usePublicKbAttachments(orgId, slug);
  const submitFeedback = useSubmitKbFeedback();

  const [showComment, setShowComment] = useState(false);
  const [pendingHelpful, setPendingHelpful] = useState<boolean | null>(null);
  const [comment, setComment] = useState("");
  const [submitted, setSubmitted] = useState(false);

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

  return (
    <main className="min-h-screen bg-background">
      <div className="mx-auto max-w-3xl px-4 py-8 sm:py-12">
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
          <>
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

              <div className="mt-6 whitespace-pre-wrap text-[15px] leading-relaxed text-foreground">
                {article.content}
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
          </>
        )}
      </div>
    </main>
  );
}
