"use client";

import { useRef, useState, type ChangeEvent } from "react";
import {
  FileText,
  ImageIcon,
  Loader2,
  Paperclip,
  RefreshCw,
  Sparkles,
  Upload,
} from "lucide-react";
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
import { Button } from "@/components/ui/button";
import { AnimatedIconButton } from "@/components/ui/animated-icon-button";
import { DownloadIcon, Trash2Icon } from "@animateicons/react/lucide";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorState } from "@/components/shared/error-state";
import { LoadingState } from "@/components/shared/loading-state";
import { EmptyUploadIllustration } from "@/components/illustrations";
import {
  useKbAttachments,
  useUploadKbAttachment,
  useDeleteKbAttachment,
  useKbAttachmentDownloadUrl,
  type KbAttachment,
} from "@/hooks/api/support/kb-attachments";
import { useKbIndexStatus, useReindexKbArticle } from "@/hooks/api/support/kb-rag";
import { getApiError } from "@/lib/api-client";
import { formatFileSize } from "@/lib/format-utils";
import { toast } from "sonner";
import type { KbArticleDetail } from "@/hooks/api/support/kb";

const ATTACHMENT_ACCEPT = ".pdf,.doc,.docx,.xls,.xlsx,.jpg,.jpeg,.png,.gif,.webp";
const ATTACHMENT_MAX_SIZE = 10 * 1024 * 1024;

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
      <AnimatedIconButton
        variant="ghost"
        size="icon"
        className="h-6 w-6 shrink-0 text-muted-foreground hover:text-foreground"
        onClick={handleDownload}
        disabled={isDownloadPending}
        aria-label={`Download ${attachment.fileName}`}
        icon={DownloadIcon}
      />
      <AnimatedIconButton
        variant="ghost"
        size="icon"
        className="h-6 w-6 shrink-0 text-muted-foreground hover:text-destructive"
        onClick={handleDelete}
        disabled={isDeletePending}
        aria-label={`Delete ${attachment.fileName}`}
        icon={Trash2Icon}
      />
    </div>
  );
}

export function KbAttachmentsPanel({ article }: { article: KbArticleDetail }) {
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
      onSuccess: (data) => window.open(data.url, "_blank", "noopener,noreferrer"),
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
          <LoadingState variant="list" rows={8} />
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
              <p className="text-xs font-medium leading-none">AI search index</p>
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

      <AlertDialog open={pendingDelete !== null} onOpenChange={handlePendingDeleteOpenChange}>
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
