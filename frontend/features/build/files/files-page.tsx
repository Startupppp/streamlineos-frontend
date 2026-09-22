"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { Download, FileText, Trash2 } from "lucide-react";
import { PlusIcon } from "@animateicons/react/lucide";
import { useAnimatedIcon } from "@/hooks/common/use-animated-icon";
import {
  useProjectFiles,
  useUploadProjectFile,
  useDeleteProjectFile,
  useProjectFileSignedUrl,
  type ProjectFileRow,
} from "@/hooks/api/build/project-files";
import { useCan } from "@/hooks/api/access";
import { usePageState } from "@/hooks/api/use-page-state";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { PageState } from "@/components/shared/page-state";
import { EmptyState } from "@/components/ui/empty-state";
import { LoadingButton } from "@/components/ui/loading-button";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { getErrorMessage } from "@/lib/get-error-message";
import { Card, CardContent } from "@/components/ui/card";
import { CONTENT_PANEL_SOLID } from "@/components/ui/content-fill-panel";

const ALLOWED_TYPES = [
  "application/pdf",
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
  "text/plain",
  "text/csv",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
].join(",");

const MAX_BYTES = 2 * 1024 * 1024;

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function UploadButton({ onUpload }: { onUpload: () => void }) {
  const { iconRef, hoverHandlers } = useAnimatedIcon();
  return (
    <Button onClick={onUpload} {...hoverHandlers}>
      <PlusIcon ref={iconRef} size={14} />
      Upload file
    </Button>
  );
}

function FileDownloadButton({ projectId, file }: { projectId: number; file: ProjectFileRow }) {
  const [enabled, setEnabled] = useState(false);
  const { data, isFetching } = useProjectFileSignedUrl(
    projectId,
    enabled ? file.id : null,
  );

  useEffect(() => {
    if (data?.url) {
      window.open(data.url, "_blank", "noopener,noreferrer");
      setEnabled(false);
    }
  }, [data?.url]);

  const handleClick = useCallback(() => {
    if (data?.url) {
      window.open(data.url, "_blank", "noopener,noreferrer");
      return;
    }
    setEnabled(true);
  }, [data?.url]);

  return (
    <LoadingButton
      variant="ghost"
      size="sm"
      className="h-7 w-7"
      isPending={isFetching}
      onClick={handleClick}
      type="button"
      aria-label="Download file"
    >
      {!isFetching ? <Download className="h-4 w-4" /> : null}
    </LoadingButton>
  );
}

function FileCard({
  file,
  projectId,
  canManage,
  onDelete,
}: {
  file: ProjectFileRow;
  projectId: number;
  canManage: boolean;
  onDelete: (id: number) => void;
}) {
  const handleConfirmDelete = useCallback(() => onDelete(file.id), [file.id, onDelete]);
  const date = new Date(file.createdAt).toLocaleString();

  return (
    <Card className={CONTENT_PANEL_SOLID}>
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          <FileText className="h-5 w-5 text-muted-foreground shrink-0 mt-0.5" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate">{file.fileName}</p>
            <p className="text-[11px] text-muted-foreground tabular-nums mt-0.5">
              {formatFileSize(file.sizeBytes)} · {date}
            </p>
          </div>
          <div className="flex items-center gap-1 shrink-0">
            <FileDownloadButton projectId={projectId} file={file} />
            {canManage ? (
              <ConfirmDialog
                title="Delete file"
                description={`Permanently delete "${file.fileName}"? This cannot be undone.`}
                confirmLabel="Delete"
                destructive
                onConfirm={handleConfirmDelete}
                trigger={
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 w-7 text-destructive hover:text-destructive"
                    type="button"
                    aria-label="Delete file"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                }
              />
            ) : null}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

interface FilesPageProps {
  projectId: number;
}

export function FilesPage({ projectId }: FilesPageProps) {
  const canManage = useCan("build:files:manage");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { data, isLoading, isError, error, refetch, hasNextPage, fetchNextPage, isFetchingNextPage } =
    useProjectFiles(projectId);
  const uploadFile = useUploadProjectFile(projectId);
  const deleteFile = useDeleteProjectFile(projectId);

  const handleUploadClick = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  const handleFileChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;
      if (file.size > MAX_BYTES) {
        toast.error(`File is too large. Maximum size is 2 MB.`);
        return;
      }
      const reader = new FileReader();
      reader.onload = () => {
        const raw = reader.result as string;
        const base64 = raw.includes(",") ? raw.slice(raw.indexOf(",") + 1) : raw;
        uploadFile.mutate(
          { fileName: file.name, mimeType: file.type, contentBase64: base64 },
          {
            onSuccess: () => toast.success("File uploaded"),
            onError: (err) => toast.error(getErrorMessage(err)),
          },
        );
      };
      reader.readAsDataURL(file);
      e.target.value = "";
    },
    [uploadFile],
  );

  const handleDelete = useCallback(
    (fileId: number) => {
      deleteFile.mutate(fileId, {
        onSuccess: () => toast.success("File deleted"),
        onError: (err) => toast.error(getErrorMessage(err)),
      });
    },
    [deleteFile],
  );

  const handleRetry = useCallback(() => { void refetch(); }, [refetch]);
  const handleFetchMore = useCallback(() => { void fetchNextPage(); }, [fetchNextPage]);

  const pageState = usePageState({ permission: "build:files:view", isLoading, isError, error });

  if (pageState.kind !== "ready" && pageState.kind !== "empty" && pageState.kind !== "loading") {
    return (
      <PageWrapper title="Files" subtitle="Project files and documents">
        <PageState resolution={pageState} loading={null} onRetry={handleRetry} className="flex-1">
          {null}
        </PageState>
      </PageWrapper>
    );
  }

  if (pageState.kind === "loading") {
    return (
      <PageWrapper title="Files" subtitle="Project files and documents">
        <div className="flex flex-col gap-3">
          {[0, 1, 2].map((i) => (
            <div key={i} className={`${CONTENT_PANEL_SOLID} h-16 animate-pulse`} />
          ))}
        </div>
      </PageWrapper>
    );
  }

  return (
    <PageWrapper
      title="Files"
      subtitle="Project files and documents"
      actions={
        canManage ? (
          <>
            <input
              ref={fileInputRef}
              type="file"
              accept={ALLOWED_TYPES}
              className="hidden"
              onChange={handleFileChange}
              aria-hidden="true"
            />
            <UploadButton onUpload={handleUploadClick} />
          </>
        ) : undefined
      }
    >
      <div className="flex flex-col gap-4 pb-6">
        {data.length === 0 ? (
          <EmptyState
            className="flex-1 min-h-[40vh]"
            illustrationPreset="activity"
            title="No files yet"
            description="Upload files to share documents, images, and resources with your project team."
            action={canManage ? { label: "Upload file", onClick: handleUploadClick } : undefined}
          />
        ) : (
          <>
            <div className="flex flex-col gap-3">
              {data.map((file) => (
                <FileCard
                  key={file.id}
                  file={file}
                  projectId={projectId}
                  canManage={canManage}
                  onDelete={handleDelete}
                />
              ))}
            </div>
            {hasNextPage ? (
              <div className="flex justify-center pt-2">
                <LoadingButton
                  variant="outline"
                  size="sm"
                  isPending={isFetchingNextPage}
                  onClick={handleFetchMore}
                  type="button"
                >
                  Load more
                </LoadingButton>
              </div>
            ) : null}
          </>
        )}
      </div>
    </PageWrapper>
  );
}
