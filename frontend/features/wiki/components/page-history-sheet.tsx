"use client";

import { useState } from "react";
import Link from "next/link";
import dynamic from "next/dynamic";
import {
  KbChevronRightIcon,
  KbHistoryIcon,
  KbRotateCcwIcon,
} from "@/features/wiki/lib/kb-icons";
import { kbTimeAgo } from "@/features/wiki/lib/kb-date-utils";
import { Badge } from "@/components/ui/badge";
import { Sheet, SheetBody, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { EmptyState } from "@/components/ui/empty-state";
import { TruncatedText } from "@/components/ui/truncated-text";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { PageState } from "@/components/shared/page-state";
import { ErrorReference } from "@/components/shared/error-reference";
import { InfiniteScrollSentinel } from "@/components/ui/infinite-scroll-sentinel";
import { usePageState } from "@/hooks/api/use-page-state";
import { useKbPageVersionsInfinite, useKbPageVersionDetail } from "@/hooks/api/kb";
import type { KbPageVersion } from "@/hooks/api/kb/page-types";
import { pageHistoryHref } from "@/lib/knowledge-routes";
import { isApiError } from "@/lib/api-envelope";

const PlateDocumentEditor = dynamic(
  () => import("@/components/editor/plate/plate-document-editor"),
  { ssr: false, loading: () => <Skeleton className="h-32 w-full" /> }
);

interface PageHistorySheetProps {
  pageId: number;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectId?: number;
}

export default function PageHistorySheet({ pageId, open, onOpenChange, projectId }: PageHistorySheetProps) {
  const isProjectScoped = projectId !== undefined && projectId > 0;
  const [selectedVersion, setSelectedVersion] = useState<number | null>(null);
  const { data: versionsData, isLoading, isError, isFetchNextPageError, error, refetch, hasNextPage, fetchNextPage, isFetchingNextPage } = useKbPageVersionsInfinite(pageId);
  const allVersions = versionsData?.pages.flatMap((p) => p.data) ?? [];
  const currentVersionNumber = allVersions[0]?.versionNumber ?? null;
  const versions = allVersions;
  const { data: versionDetail, isLoading: detailLoading, isError: detailError, error: detailReadError, refetch: refetchDetail } = useKbPageVersionDetail(
    pageId,
    selectedVersion ?? 0
  );
  const hasContent = Boolean(versionDetail?.content);
  const listAccessLost = isApiError(error) && (error.status === 401 || error.status === 403 || error.status === 404);
  const listState = usePageState({
    permission: "kb:pages:view",
    isLoading,
    isError: isError && (versions.length === 0 || listAccessLost),
    error,
    isEmpty: !isLoading && !isError && versions.length === 0,
  });
  const detailState = usePageState({
    permission: "kb:pages:view",
    isLoading: detailLoading,
    isError: detailError || listAccessLost,
    error: listAccessLost ? error : detailReadError,
  });
  const historyHref = isProjectScoped
    ? `/build/${projectId}/wiki/${pageId}/history`
    : pageHistoryHref(pageId);

  function handleVersionButtonClick(e: React.MouseEvent<HTMLButtonElement>) {
    const vn = e.currentTarget.dataset.versionNumber;
    if (!vn) return;
    setSelectedVersion(Number(vn));
  }

  function handleCloseSheet() {
    onOpenChange(false);
  }

  function handleBackToList() {
    setSelectedVersion(null);
  }

  function handleLoadMore() {
    void fetchNextPage();
  }

  function handleRetryList() {
    void refetch();
  }

  function handleRetryDetail() {
    void refetchDetail();
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="p-0 flex flex-col gap-0 overflow-hidden sm:max-w-md">
        <SheetHeader className="shrink-0 px-6 py-4 border-b">
          <div className="flex items-center justify-between">
            <SheetTitle className="flex items-center gap-2">
              <KbHistoryIcon className="h-4 w-4" />
              {selectedVersion ? `Version ${selectedVersion}` : "Page history"}
            </SheetTitle>
            {selectedVersion && (
              <Button variant="ghost" size="sm" onClick={handleBackToList} className="text-xs h-7">
                ← All versions
              </Button>
            )}
          </div>
          <SheetDescription className="text-xs mt-0.5">
            Earlier saved versions of this page, newest first.
          </SheetDescription>
        </SheetHeader>

        {!selectedVersion ? (
          <>
            <SheetBody className="px-6 py-4">
              <PageState
                resolution={listState}
                compact
                onRetry={handleRetryList}
                loading={
                  <div className="space-y-3">
                    {Array.from({ length: 12 }).map((_, i) => (
                      <Skeleton key={i} className="h-16 w-full rounded-lg" />
                    ))}
                  </div>
                }
                empty={
                  <EmptyState
                    title="No versions yet"
                    description="Content changes will be saved as versions automatically."
                    compact
                    className="flex-1 min-h-[40dvh]"
                  />
                }
              >
                <div className="space-y-2">
                  {versions.map((v: KbPageVersion) => (
                    <button
                      key={v.versionNumber}
                      data-version-number={String(v.versionNumber)}
                      className="w-full text-left p-3 rounded-lg border border-border hover:bg-muted transition-colors group"
                      onClick={handleVersionButtonClick}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5">
                            <p className="text-sm font-medium">Version {v.versionNumber}</p>
                            {v.versionNumber === currentVersionNumber && (
                              <Badge variant="secondary" className="text-xs px-1.5 py-0 h-4 leading-none shrink-0">
                                Current
                              </Badge>
                            )}
                          </div>
                          <p className="text-xs text-muted-foreground">
                            {v.authorName ? `${v.authorName} · ` : ""}{kbTimeAgo(v.createdAt)}
                          </p>
                          {v.changeSummary && (
                            <TruncatedText text={v.changeSummary ?? ""} className="text-xs text-muted-foreground mt-0.5" />
                          )}
                        </div>
                        <KbChevronRightIcon className="h-4 w-4 text-muted-foreground group-hover:text-foreground shrink-0" />
                      </div>
                    </button>
                  ))}
                  <InfiniteScrollSentinel
                    hasNextPage={!isFetchNextPageError && (hasNextPage ?? false)}
                    isFetchingNextPage={isFetchingNextPage}
                    onLoadMore={handleLoadMore}
                    label="Load more versions"
                  />
                  {isFetchNextPageError && (
                    <div role="alert" className="space-y-2 text-sm text-destructive">
                      <p>Could not load more versions.</p>
                      <ErrorReference error={error} />
                      <Button type="button" variant="outline" size="sm" onClick={handleLoadMore}>Retry loading versions</Button>
                    </div>
                  )}
                </div>
              </PageState>
            </SheetBody>
            {!isProjectScoped && (
              <SheetFooter className="border-t px-6 py-3 flex items-center justify-end">
                <Link
                  href={historyHref}
                  className="text-xs text-muted-foreground hover:text-foreground transition-colors"
                  onClick={handleCloseSheet}
                >
                  Open full history →
                </Link>
              </SheetFooter>
            )}
          </>
        ) : (
          <div className="flex-1 flex flex-col min-h-0">
            {versionDetail && !detailLoading && !detailError && !listAccessLost && (
              <div className="shrink-0 px-6 py-3 border-b bg-muted/30">
                {versionDetail.authorName && (
                  <p className="text-xs text-muted-foreground">
                    By <span className="font-medium text-foreground">{versionDetail.authorName}</span>
                    {" · "}{kbTimeAgo(versionDetail.createdAt)}
                  </p>
                )}
                {!versionDetail.authorName && (
                  <p className="text-xs text-muted-foreground">{kbTimeAgo(versionDetail.createdAt)}</p>
                )}
                {versionDetail.changeSummary && (
                  <p className="text-xs text-muted-foreground mt-0.5">{versionDetail.changeSummary}</p>
                )}
              </div>
            )}
            <SheetBody className="px-6 py-4">
              <PageState resolution={detailState} compact onRetry={listAccessLost ? handleRetryList : handleRetryDetail} loading={<Skeleton className="h-64 w-full" />}>
                {hasContent && versionDetail ? (
                  <PlateDocumentEditor
                    value={versionDetail.content}
                    contentKey={`${pageId}-v${selectedVersion}`}
                    editable={false}
                  />
                ) : (
                  <EmptyState
                    title="Empty version"
                    description="No content was saved in this version."
                    compact
                    className="flex-1 min-h-[40dvh]"
                  />
                )}
              </PageState>
            </SheetBody>
            {!detailError && !listAccessLost && <SheetFooter className="border-t px-6 py-4">
              {hasContent ? (
                <Link
                  href={`${historyHref}?version=${selectedVersion}`}
                  onClick={handleCloseSheet}
                  className="inline-flex w-full h-9 items-center justify-center gap-2 rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground hover:bg-primary/90"
                >
                  <KbRotateCcwIcon className="h-4 w-4" />
                  {selectedVersion === currentVersionNumber
                    ? `View current version ${selectedVersion}`
                    : `Preview and restore version ${selectedVersion}`}
                </Link>
              ) : (
                <Button disabled className="w-full gap-2 h-9" size="sm">
                  No content to restore
                </Button>
              )}
            </SheetFooter>}
          </div>
        )}
      </SheetContent>
    </Sheet>

  );
}
