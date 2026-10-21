"use client";

import { useCallback } from "react";
import { toast } from "sonner";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { LoadingButton } from "@/components/ui/loading-button";
import { Skeleton } from "@/components/ui/skeleton";
import { InfiniteScrollSentinel } from "@/components/ui/infinite-scroll-sentinel";
import { getErrorMessage } from "@/lib/get-error-message";
import { useCan } from "@/hooks/api/access";
import {
  useKbFileVersions,
  useKbFileDownloadUrl,
  useRestoreKbFileVersion,
} from "@/hooks/api/kb/files";
import type { KbFileVersion } from "@/hooks/api/kb/kb-files-schema";
import {
  KbDownloadIcon,
  KbRotateCcwIcon,
  KbAlertCircleIcon,
} from "@/features/wiki/lib/kb-icons";

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleString(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

interface VersionRowProps {
  version: KbFileVersion;
  pageId: number;
  canEdit: boolean;
}

function VersionRow({ version, pageId, canEdit }: VersionRowProps) {
  const downloadMutation = useKbFileDownloadUrl();
  const restoreMutation = useRestoreKbFileVersion(pageId);

  const handleDownload = useCallback(async () => {
    try {
      const result = await downloadMutation.mutateAsync({
        pageId,
        versionId: version.id,
      });
      window.open(result.url, "_blank", "noopener,noreferrer");
    } catch (err) {
      toast.error(getErrorMessage(err));
    }
  }, [downloadMutation, pageId, version.id]);

  const handleRestore = useCallback(() => {
    restoreMutation.mutate(
      { versionId: version.id },
      {
        onError: (err) => toast.error(getErrorMessage(err)),
        onSuccess: () => toast.success(`Restored to version ${version.versionNumber}`),
      },
    );
  }, [restoreMutation, version.id, version.versionNumber]);

  return (
    <div className="flex items-start gap-3 rounded-xl border bg-card p-3">
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-foreground">
          v{version.versionNumber} · {version.fileName}
        </p>
        <p className="mt-0.5 text-xs text-muted-foreground">
          {formatBytes(version.byteSize)} · {formatDate(version.createdAt)}
        </p>
        {version.extractionState === "failed" && (
          <p className="mt-0.5 text-xs text-status-warning-ink">
            Content extraction failed
          </p>
        )}
      </div>
      <div className="flex shrink-0 gap-1.5">
        <LoadingButton
          size="sm"
          variant="ghost"
          isPending={downloadMutation.isPending}
          aria-label="Download this version"
          onClick={() => void handleDownload()}
        >
          <KbDownloadIcon className="h-4 w-4" />
        </LoadingButton>
        {canEdit && (
          <LoadingButton
            size="sm"
            variant="ghost"
            isPending={restoreMutation.isPending}
            aria-label={`Restore version ${version.versionNumber}`}
            onClick={handleRestore}
          >
            <KbRotateCcwIcon className="h-4 w-4" />
          </LoadingButton>
        )}
      </div>
    </div>
  );
}

interface KbFileVersionSheetProps {
  pageId: number;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function KbFileVersionSheet({
  pageId,
  open,
  onOpenChange,
}: KbFileVersionSheetProps) {
  const {
    data,
    isLoading,
    isError,
    error,
    refetch,
    hasNextPage,
    isFetchingNextPage,
    fetchNextPage,
  } = useKbFileVersions(pageId);
  const canEdit = useCan("kb:pages:update");

  const handleRetry = useCallback(() => void refetch(), [refetch]);
  const handleLoadMore = useCallback(() => void fetchNextPage(), [fetchNextPage]);

  const versions = data?.pages.flatMap((p) => p.data) ?? [];

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="flex w-full flex-col gap-0 p-0 sm:max-w-md">
        <SheetHeader className="border-b px-6 py-4">
          <SheetTitle>Version history</SheetTitle>
        </SheetHeader>

        <div className="flex flex-1 flex-col gap-3 overflow-y-auto p-6">
          {isLoading && (
            <>
              <Skeleton className="h-16 w-full rounded-xl" />
              <Skeleton className="h-16 w-full rounded-xl" />
              <Skeleton className="h-16 w-full rounded-xl" />
            </>
          )}

          {isError && (
            <div className="flex flex-col items-center gap-3 py-8 text-sm text-muted-foreground">
              <KbAlertCircleIcon className="h-5 w-5" />
              <span>{getErrorMessage(error)}</span>
              <Button size="sm" variant="outline" onClick={handleRetry}>
                Retry
              </Button>
            </div>
          )}

          {!isLoading && !isError && versions.length === 0 && (
            <p className="py-8 text-center text-sm text-muted-foreground">
              No versions yet.
            </p>
          )}

          {versions.map((version) => (
            <VersionRow
              key={version.id}
              version={version}
              pageId={pageId}
              canEdit={canEdit}
            />
          ))}

          <InfiniteScrollSentinel
            hasNextPage={hasNextPage}
            isFetchingNextPage={isFetchingNextPage}
            onLoadMore={handleLoadMore}
            label="Loading more versions"
            pending={
              <Skeleton className="h-16 w-full rounded-xl" />
            }
          />
        </div>
      </SheetContent>
    </Sheet>
  );
}
