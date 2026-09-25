"use client";

import { useCallback, useRef, useState } from "react";
import { toast } from "sonner";
import { Upload } from "lucide-react";
import { ErrorReference } from "@/components/shared/error-reference";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { LoadingButton } from "@/components/ui/loading-button";
import { SemanticBadge } from "@/components/ui/semantic-badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useCan } from "@/hooks/api/access";
import {
  useApproveDocumentVersion,
  useDocumentVersions,
  useUploadDocumentVersion,
  type DocumentVersionRow,
} from "@/hooks/api/hr/document-kb-link";
import { useUploadFile } from "@/hooks/api/use-upload-file";
import { getErrorMessage } from "@/lib/get-error-message";
import { formatFileSize } from "@/lib/format-utils";

interface DocumentVersionsPanelProps {
  documentId: number;
}

const STATUS_TONE = { approved: "success", pending: "warning", rejected: "danger" } as const;

interface VersionItemProps {
  row: DocumentVersionRow;
  canApprove: boolean;
  onApprove: (version: number) => void;
}

function VersionItem({ row, canApprove, onApprove }: VersionItemProps) {
  const handleApprove = useCallback(() => onApprove(row.version), [onApprove, row.version]);
  return (
    <li className="flex flex-wrap items-center gap-2 text-sm">
      <span className="font-mono tabular-nums text-foreground">v{row.version}</span>
      <SemanticBadge tone={STATUS_TONE[row.status]} size="xs" label={row.status === "approved" ? "Approved" : row.status === "pending" ? "Waiting for approval" : "Rejected"} />
      {row.isCurrent ? <SemanticBadge tone="info" size="xs" label="Current" /> : null}
      <span className="text-muted-foreground">
        {row.fileName ?? "File"}
        {row.fileSize ? ` · ${formatFileSize(row.fileSize)}` : ""}
      </span>
      {row.status === "pending" && canApprove ? (
        <Button type="button" variant="outline" size="sm" className="ml-auto" onClick={handleApprove}>
          Approve
        </Button>
      ) : null}
    </li>
  );
}

/**
 * The file history of a document. Uploading a new version changes nothing anyone reads. Approving it is the
 * moment the document's file changes for everyone, including anyone reading it through the Knowledge Base, which
 * is why approval needs the permission to publish and asks first.
 */
export function DocumentVersionsPanel({ documentId }: DocumentVersionsPanelProps) {
  const canManage = useCan("hr:documents:manage");
  const canPublish = useCan("hr:documents:publish");
  const versions = useDocumentVersions(documentId);
  const uploadFile = useUploadFile();
  const uploadVersion = useUploadDocumentVersion();
  const approve = useApproveDocumentVersion();
  const inputRef = useRef<HTMLInputElement>(null);
  const [approving, setApproving] = useState<number | null>(null);
  const [failure, setFailure] = useState<unknown>(null);

  const handlePick = useCallback(() => inputRef.current?.click(), []);
  const handleFile = useCallback(
    async (event: React.ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];
      event.target.value = "";
      if (!file) return;
      setFailure(null);
      try {
        const stored = await uploadFile.mutateAsync({ file, folder: "hr-documents" });
        await uploadVersion.mutateAsync({ documentId, fileUrl: stored.key, fileName: file.name, fileSize: stored.size, mimeType: stored.mimeType });
        toast.success("New version uploaded. It is waiting for approval.");
      } catch (error) {
        setFailure(error);
        toast.error(getErrorMessage(error));
      }
    },
    [documentId, uploadFile, uploadVersion],
  );
  const handleAskApprove = useCallback((version: number) => setApproving(version), []);
  const handleApproveChange = useCallback((open: boolean) => { if (!open) setApproving(null); }, []);
  const handleConfirmApprove = useCallback(async () => {
    if (approving === null) return;
    setFailure(null);
    try {
      await approve.mutateAsync({ documentId, version: approving });
      toast.success(`Version ${approving} is now the current version.`);
    } catch (error) {
      setFailure(error);
      toast.error(getErrorMessage(error));
    } finally {
      setApproving(null);
    }
  }, [approve, approving, documentId]);

  if (versions.isError)
    return (
      <Alert variant="destructive">
        <AlertTitle>Could not load the versions</AlertTitle>
        <AlertDescription>
          <p>{getErrorMessage(versions.error)}</p>
          <ErrorReference error={versions.error} className="mt-2 justify-start" />
        </AlertDescription>
      </Alert>
    );
  if (!versions.data) return <Skeleton className="h-16 w-full" />;

  return (
    <section aria-label="Versions" className="flex flex-col gap-3 rounded-md border border-border p-3">
      <div className="flex items-center gap-2">
        <h3 className="text-sm font-medium text-foreground">Versions</h3>
        {canManage ? (
          <>
            <input ref={inputRef} type="file" className="hidden" aria-label="Choose a new version file" onChange={handleFile} />
            <LoadingButton type="button" variant="outline" size="sm" className="ml-auto" isPending={uploadFile.isPending || uploadVersion.isPending} onClick={handlePick}>
              <Upload className="mr-1.5 h-3.5 w-3.5" aria-hidden="true" />
              Upload new version
            </LoadingButton>
          </>
        ) : null}
      </div>
      <ul className="flex flex-col gap-2">
        {versions.data.versions.map((row) => (
          <VersionItem key={row.version} row={row} canApprove={canPublish} onApprove={handleAskApprove} />
        ))}
      </ul>
      {failure !== null ? (
        <Alert variant="destructive">
          <AlertTitle>Not done</AlertTitle>
          <AlertDescription>
            <p>{getErrorMessage(failure)}</p>
            <ErrorReference error={failure} className="mt-2 justify-start" />
          </AlertDescription>
        </Alert>
      ) : null}
      <ConfirmDialog
        open={approving !== null}
        onOpenChange={handleApproveChange}
        title={`Approve version ${approving ?? ""}?`}
        description="It becomes the current file for everyone who reads this document, including through the Knowledge Base for entries that follow the latest version."
        confirmLabel="Approve version"
        isPending={approve.isPending}
        keepOpenOnConfirm
        onConfirm={handleConfirmApprove}
      />
    </section>
  );
}
