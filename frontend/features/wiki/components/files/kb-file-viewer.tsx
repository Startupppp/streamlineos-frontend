"use client";

import { useState, useRef } from "react";
import { toast } from "sonner";
import { PageState } from "@/components/shared/page-state";
import { PageFileSkeleton } from "@/features/wiki/components/page-document-skeleton";
import { Button } from "@/components/ui/button";
import { LoadingButton } from "@/components/ui/loading-button";
import { getErrorMessage } from "@/lib/get-error-message";
import { formatFileSize } from "@/lib/format-utils";
import { useCan } from "@/hooks/api/access";
import { usePageState } from "@/hooks/api/use-page-state";
import {
  useKbFileDetail,
  useKbFileDownloadUrl,
  useKbFilePreviewUrl,
  useCreateKbFileVersion,
} from "@/hooks/api/kb/files";
import type { KbFileDetail } from "@/hooks/api/kb/kb-files-schema";
import {
  KbDownloadIcon,
  KbHistoryIcon,
  KbUploadIcon,
  KbAlertCircleIcon,
  KbEyeIcon,
} from "@/features/wiki/lib/kb-icons";
import { KbFileVersionSheet } from "./kb-file-version-sheet";

interface KbFileViewerProps {
  pageId: number;
}

interface KbFileReadyViewProps {
  pageId: number;
  detail: KbFileDetail;
}

export function KbFileViewer({ pageId }: KbFileViewerProps) {
  const { data, isLoading, isError, error, refetch } = useKbFileDetail(pageId);
  const pageState = usePageState({
    permission: "kb:pages:view",
    isLoading,
    isError,
    error,
  });

  function handleRetry() { void refetch(); }

  return (
    <PageState
      resolution={pageState}
      loading={<PageFileSkeleton />}
      onRetry={handleRetry}
    >
      {data ? <KbFileReadyView pageId={pageId} detail={data} /> : null}
    </PageState>
  );
}

function KbFileReadyView({ pageId, detail }: KbFileReadyViewProps) {
  const canEdit = useCan("kb:pages:update");
  const downloadMutation = useKbFileDownloadUrl();
  const previewMutation = useKbFilePreviewUrl();
  const appendVersion = useCreateKbFileVersion(pageId);
  const [versionSheetOpen, setVersionSheetOpen] = useState(false);
  const [previewSrc, setPreviewSrc] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  async function handleDownload() {
    try {
      const result = await downloadMutation.mutateAsync({ pageId });
      window.open(result.url, "_blank", "noopener,noreferrer");
    } catch (err) {
      toast.error(getErrorMessage(err));
    }
  }

  async function handlePreview() {
    try {
      const result = await previewMutation.mutateAsync({ pageId });
      setPreviewSrc(result.url);
    } catch (err) {
      toast.error(getErrorMessage(err));
    }
  }

  function handleUploadClick() {
    fileInputRef.current?.click();
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = "";
    appendVersion.mutate(
      { file },
      {
        onError: (err) => toast.error(getErrorMessage(err)),
        onSuccess: () => toast.success("New version uploaded"),
      },
    );
  }

  function handleVersionSheetOpen() { setVersionSheetOpen(true); }

  const { currentVersion, scanState, previewKind } = detail;
  const isQuarantined = scanState === "infected" || previewKind === "quarantined";
  const canInlinePreview =
    !previewSrc &&
    !isQuarantined &&
    currentVersion != null &&
    (previewKind === "inline" || previewKind === "text");

  return (
    <div className="flex flex-1 flex-col gap-6 p-8">
      <div className="flex flex-wrap items-start gap-3">
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium text-foreground">
            {currentVersion?.fileName ?? detail.page.title}
          </p>
          {currentVersion && (
            <p className="mt-0.5 text-xs text-muted-foreground">
              {currentVersion.mimeType} · {formatFileSize(currentVersion.byteSize)} · v
              {currentVersion.versionNumber}
            </p>
          )}
        </div>

        <div className="flex shrink-0 flex-wrap gap-2">
          {!isQuarantined && currentVersion && (
            <LoadingButton
              size="sm"
              variant="outline"
              isPending={downloadMutation.isPending}
              onClick={handleDownload}
            >
              <KbDownloadIcon className="h-4 w-4" />
              Download
            </LoadingButton>
          )}

          {canInlinePreview && (
            <LoadingButton
              size="sm"
              variant="outline"
              isPending={previewMutation.isPending}
              onClick={handlePreview}
            >
              <KbEyeIcon className="h-4 w-4" />
              Preview
            </LoadingButton>
          )}

          <Button size="sm" variant="outline" onClick={handleVersionSheetOpen}>
            <KbHistoryIcon className="h-4 w-4" />
            History
          </Button>

          {canEdit && (
            <LoadingButton
              size="sm"
              variant="outline"
              isPending={appendVersion.isPending}
              onClick={handleUploadClick}
            >
              <KbUploadIcon className="h-4 w-4" />
              Upload new version
            </LoadingButton>
          )}
        </div>
      </div>

      {isQuarantined && (
        <div className="flex items-center gap-2 rounded-xl border border-status-warning-rule bg-status-warning-surface p-3 text-sm text-status-warning-ink">
          <KbAlertCircleIcon className="h-4 w-4 shrink-0" />
          This file was flagged during security scanning and cannot be previewed or downloaded.
        </div>
      )}

      {!currentVersion && (
        <div className="flex flex-1 flex-col items-center justify-center gap-2 rounded-xl border border-dashed p-12 text-sm text-muted-foreground">
          <span>No file uploaded yet.</span>
          {canEdit && (
            <LoadingButton
              size="sm"
              variant="outline"
              isPending={appendVersion.isPending}
              onClick={handleUploadClick}
            >
              <KbUploadIcon className="h-4 w-4" />
              Upload file
            </LoadingButton>
          )}
        </div>
      )}

      {previewSrc && (
        <iframe
          src={previewSrc}
          className="min-h-96 w-full flex-1 rounded-xl border"
          title="File preview"
          sandbox="allow-same-origin"
        />
      )}

      <input
        ref={fileInputRef}
        type="file"
        className="sr-only"
        tabIndex={-1}
        onChange={handleFileChange}
        aria-hidden="true"
      />

      <KbFileVersionSheet
        pageId={pageId}
        open={versionSheetOpen}
        onOpenChange={setVersionSheetOpen}
      />
    </div>
  );
}
