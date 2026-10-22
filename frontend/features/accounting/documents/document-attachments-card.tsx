"use client";

import { memo, useCallback, useRef, useState } from "react";
import { toast } from "sonner";
import { Download, FileText, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { LoadingButton } from "@/components/ui/loading-button";
import { Skeleton } from "@/components/ui/skeleton";
import { TablePagination } from "@/components/ui/table-pagination";
import { ErrorState } from "@/components/shared/error-state";
import { useCan, useCanState } from "@/hooks/api/access";
import {
  ATTACHMENTS_MANAGE,
  ATTACHMENTS_READ,
  ATTACHMENT_MIME_TYPES,
  MAX_ATTACHMENT_BYTES,
  useAttachDocumentFile,
  useDocumentAttachments,
  useDownloadDocumentAttachment,
  useRemoveDocumentAttachment,
} from "@/hooks/api/accounting/documents";
import type {
  AttachableDocumentType,
  DocumentAttachment,
} from "@/hooks/api/accounting/documents-schema";
import { formatDateTime } from "@/lib/date-utils";
import { formatFileSize } from "@/lib/format-utils";
import { getErrorMessage } from "@/lib/get-error-message";

const PAGE_SIZE = 10;
const ACCEPT = ATTACHMENT_MIME_TYPES.join(",");

function attachmentRejection(file: File): string | null {
  if (file.size === 0) return `${file.name} is empty`;
  if (!ATTACHMENT_MIME_TYPES.includes(file.type))
    return `${file.name} is not an accepted type. Attach a PDF, image, text, CSV, Word or Excel file.`;
  if (file.size > MAX_ATTACHMENT_BYTES) return `${file.name} is larger than 2 MB`;
  return null;
}

interface AttachmentRowProps {
  attachment: DocumentAttachment;
  canManage: boolean;
  isDownloading: boolean;
  onDownload: (attachment: DocumentAttachment) => void;
  onRemove: (attachmentId: string) => void;
}

const AttachmentRow = memo(function AttachmentRow({
  attachment,
  canManage,
  isDownloading,
  onDownload,
  onRemove,
}: AttachmentRowProps) {
  const handleDownload = useCallback(() => onDownload(attachment), [attachment, onDownload]);
  const handleRemove = useCallback(() => onRemove(attachment.id), [attachment.id, onRemove]);

  return (
    <li className="flex items-center gap-3 py-2">
      <FileText className="size-4 shrink-0 text-muted-foreground" aria-hidden />
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium">{attachment.fileName}</p>
        <p className="text-micro tabular-nums text-muted-foreground">
          {formatFileSize(attachment.sizeBytes)} · {formatDateTime(attachment.createdAt)}
        </p>
      </div>
      <LoadingButton
        type="button"
        variant="ghost"
        size="sm"
        className="size-9"
        isPending={isDownloading}
        onClick={handleDownload}
        aria-label={`Download ${attachment.fileName}`}
      >
        {isDownloading ? null : <Download className="size-4" />}
      </LoadingButton>
      {canManage ? (
        <ConfirmDialog
          title="Remove this attachment?"
          description={`"${attachment.fileName}" leaves this document. The document itself is unchanged.`}
          confirmLabel="Remove"
          destructive
          onConfirm={handleRemove}
          trigger={
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="size-9 text-destructive hover:text-destructive"
              aria-label={`Remove ${attachment.fileName}`}
            >
              <Trash2 className="size-4" />
            </Button>
          }
        />
      ) : null}
    </li>
  );
});

interface DocumentAttachmentsCardProps {
  documentType: AttachableDocumentType;
  documentId: string;
}

export function DocumentAttachmentsCard({ documentType, documentId }: DocumentAttachmentsCardProps) {
  const readState = useCanState(ATTACHMENTS_READ);
  const canManage = useCan(ATTACHMENTS_MANAGE);
  const inputRef = useRef<HTMLInputElement>(null);
  const [page, setPage] = useState(1);

  const query = useDocumentAttachments(documentType, documentId, { page, pageSize: PAGE_SIZE });
  const attach = useAttachDocumentFile(documentType, documentId);
  const remove = useRemoveDocumentAttachment(documentType, documentId);
  const download = useDownloadDocumentAttachment();

  const handlePick = useCallback(() => inputRef.current?.click(), []);

  const handleFileChange = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];
      event.target.value = "";
      if (!file) return;
      const rejection = attachmentRejection(file);
      if (rejection) {
        toast.error(rejection);
        return;
      }
      attach.mutate(file, {
        onSuccess: () => {
          setPage(1);
          toast.success(`Attached ${file.name}`);
        },
        onError: (error) => toast.error(getErrorMessage(error)),
      });
    },
    [attach],
  );

  const handleDownload = useCallback(
    (attachment: DocumentAttachment) => {
      download.mutate(attachment, { onError: (error) => toast.error(getErrorMessage(error)) });
    },
    [download],
  );

  const handleRemove = useCallback(
    (attachmentId: string) => {
      remove.mutate(attachmentId, {
        onSuccess: () => toast.success("Attachment removed"),
        onError: (error) => toast.error(getErrorMessage(error)),
      });
    },
    [remove],
  );

  const handleRetry = useCallback(() => {
    void query.refetch();
  }, [query]);

  if (readState === "denied") return null;

  const data = query.data;
  const downloadingId = download.isPending ? download.variables?.id : undefined;

  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between gap-2">
        <div className="flex min-w-0 flex-col gap-1">
          <CardTitle>Attachments</CardTitle>
          <CardDescription>Receipts, contracts and other evidence for this document.</CardDescription>
        </div>
        {canManage ? (
          <>
            <input
              ref={inputRef}
              type="file"
              accept={ACCEPT}
              className="hidden"
              onChange={handleFileChange}
              aria-hidden="true"
              tabIndex={-1}
            />
            <LoadingButton
              type="button"
              size="sm"
              variant="outline"
              isPending={attach.isPending}
              onClick={handlePick}
            >
              Attach file
            </LoadingButton>
          </>
        ) : null}
      </CardHeader>
      <CardContent className="flex flex-col gap-2">
        {query.isError ? (
          <ErrorState compact error={query.error} onRetry={handleRetry} />
        ) : !data ? (
          <div className="flex flex-col gap-2">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
          </div>
        ) : data.items.length === 0 ? (
          <p className="text-sm text-muted-foreground">No files attached yet.</p>
        ) : (
          <ul className="divide-y divide-border/60">
            {data.items.map((attachment) => (
              <AttachmentRow
                key={attachment.id}
                attachment={attachment}
                canManage={canManage}
                isDownloading={downloadingId === attachment.id}
                onDownload={handleDownload}
                onRemove={handleRemove}
              />
            ))}
          </ul>
        )}
        {data && data.total > PAGE_SIZE ? (
          <TablePagination
            page={page}
            pageSize={PAGE_SIZE}
            total={data.total}
            onPageChange={setPage}
          />
        ) : null}
      </CardContent>
    </Card>
  );
}
