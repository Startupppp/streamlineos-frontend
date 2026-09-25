"use client";

import { PageWrapper } from "@/components/ui/page-wrapper";
import { useState, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import {
  KbArrowRightIcon,
  KbClockIcon,
  KbRotateCcwIcon,
} from "@/features/wiki/lib/kb-icons";
import { GitCompare } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { LoadingButton } from "@/components/ui/loading-button";
import { TruncatedText } from "@/components/ui/truncated-text";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { useKbPage } from "@/hooks/api/kb/pages";
import {
  useKbPageVersionsInfinite,
  useKbPageVersionDetail,
  useRestoreKbVersion,
} from "@/hooks/api/kb/page-versions";
import type { KbPageVersion } from "@/hooks/api/kb/page-types";
import { getErrorMessage } from "@/lib/get-error-message";
import { computeVersionDiff } from "@/features/wiki/lib/version-diff";
import { pageHref, KNOWLEDGE_BASE } from "@/lib/knowledge-routes";
import { kbTimeAgo } from "@/features/wiki/lib/kb-date-utils";

interface BlockDiffViewProps {
  versionContent: Record<string, unknown> | Record<string, unknown>[] | null;
  currentContent: Record<string, unknown> | Record<string, unknown>[] | null;
  versionTitle: string;
  currentTitle: string;
}

function BlockDiffView({
  versionContent,
  currentContent,
  versionTitle,
  currentTitle,
}: BlockDiffViewProps) {
  const diff = computeVersionDiff(versionTitle, versionContent, currentTitle, currentContent);
  const hasChanges =
    diff.titleChanged || diff.addedCount > 0 || diff.removedCount > 0 || diff.changedCount > 0;

  return (
    <div className="rounded-lg border border-border bg-muted/40 px-4 py-3 space-y-2">
      <div className="flex items-center gap-2 flex-wrap">
        <p className="text-xs font-semibold text-foreground">Block diff vs current</p>
        {diff.addedCount > 0 && (
          <Badge variant="outline" className="text-status-success-ink border-status-success-ink text-xs px-1.5 py-0">
            +{diff.addedCount} added
          </Badge>
        )}
        {diff.removedCount > 0 && (
          <Badge variant="outline" className="text-status-danger-ink border-status-danger-ink text-xs px-1.5 py-0">
            -{diff.removedCount} removed
          </Badge>
        )}
        {diff.changedCount > 0 && (
          <Badge variant="outline" className="text-status-warning-ink border-status-warning-ink text-xs px-1.5 py-0">
            {diff.changedCount} changed
          </Badge>
        )}
      </div>
      {!hasChanges && (
        <p className="text-xs text-muted-foreground">Identical to the current page.</p>
      )}
      {diff.titleChanged && (
        <p className="text-xs text-muted-foreground">
          Title:{" "}
          <span className="line-through text-status-danger-ink">{diff.oldTitle}</span>
          {" → "}
          <span className="text-status-success-ink">{diff.newTitle}</span>
        </p>
      )}
      <div className="space-y-1 max-h-48 overflow-y-auto">
        {diff.blocks
          .filter((b) => b.kind !== "unchanged")
          .map((b, idx) => (
            <div
              key={idx}
              className={`text-xs px-2 py-1 rounded font-mono break-words ${
                b.kind === "added"
                  ? "bg-status-success-muted text-status-success-ink"
                  : b.kind === "removed"
                    ? "bg-status-danger-muted text-status-danger-ink line-through"
                    : "bg-status-warning-muted text-status-warning-ink"
              }`}
            >
              <span className="font-semibold uppercase tracking-wide mr-1 opacity-60">{b.type}</span>
              {b.kind === "changed" && b.altText ? (
                <>
                  <span className="line-through opacity-60">{b.altText}</span>
                  {" → "}
                  <span>{b.text}</span>
                </>
              ) : (
                <span>{b.text || "(empty)"}</span>
              )}
            </div>
          ))}
      </div>
    </div>
  );
}

interface TwoVersionDiffViewProps {
  versionA: KbPageVersion;
  versionB: KbPageVersion;
}

function TwoVersionDiffView({ versionA, versionB }: TwoVersionDiffViewProps) {
  const diff = computeVersionDiff(
    versionA.title,
    versionA.content,
    versionB.title,
    versionB.content,
  );

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between text-xs text-muted-foreground px-1">
        <span>Version {versionA.versionNumber} → Version {versionB.versionNumber}</span>
        <div className="flex gap-2">
          {diff.addedCount > 0 && (
            <span className="text-status-success-ink font-medium">+{diff.addedCount}</span>
          )}
          {diff.removedCount > 0 && (
            <span className="text-status-danger-ink font-medium">-{diff.removedCount}</span>
          )}
          {diff.changedCount > 0 && (
            <span className="text-status-warning-ink font-medium">~{diff.changedCount}</span>
          )}
        </div>
      </div>
      {diff.titleChanged && (
        <div className="text-xs px-3 py-2 rounded border border-border">
          <span className="font-semibold text-foreground">Title: </span>
          <span className="line-through text-status-danger-ink">{diff.oldTitle}</span>
          {" → "}
          <span className="text-status-success-ink">{diff.newTitle}</span>
        </div>
      )}
      <div className="space-y-1">
        {diff.blocks.map((b, idx) => (
          <div
            key={idx}
            className={`text-xs px-2 py-1 rounded font-mono break-words ${
              b.kind === "unchanged"
                ? "text-muted-foreground"
                : b.kind === "added"
                  ? "bg-status-success-muted text-status-success-ink"
                  : b.kind === "removed"
                    ? "bg-status-danger-muted text-status-danger-ink"
                    : "bg-status-warning-muted text-status-warning-ink"
            }`}
          >
            <span className="font-semibold uppercase tracking-wide mr-1 opacity-60">{b.type}</span>
            {b.kind === "changed" && b.altText ? (
              <>
                <span className="line-through opacity-60">{b.altText}</span>
                {" → "}
                <span>{b.text}</span>
              </>
            ) : (
              b.text || "(empty)"
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

interface PageHistoryPageProps {
  pageId: number;
  initialVersion?: number;
  initialCompare?: number;
}

export default function PageHistoryPage({
  pageId,
  initialVersion,
  initialCompare,
}: PageHistoryPageProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const versionParam = searchParams.get("version");
  const compareParam = searchParams.get("compare");

  const [selectedA, setSelectedA] = useState<number | null>(
    versionParam ? parseInt(versionParam, 10) : (initialVersion ?? null),
  );
  const [selectedB, setSelectedB] = useState<number | null>(
    compareParam ? parseInt(compareParam, 10) : (initialCompare ?? null),
  );
  const [compareMode, setCompareMode] = useState(Boolean(selectedB));
  const [restoreAlertOpen, setRestoreAlertOpen] = useState(false);

  const { data: currentPage, isLoading: pageLoading, isError: pageError } = useKbPage(pageId);
  const {
    data: versionsData,
    isLoading: versionsLoading,
    hasNextPage,
    fetchNextPage,
    isFetchingNextPage,
  } = useKbPageVersionsInfinite(pageId);

  const versions = versionsData?.pages.flatMap((p) => p.data) ?? [];
  const currentVersionNumber = versions[0]?.versionNumber ?? null;

  const { data: versionADetail, isLoading: detailALoading } = useKbPageVersionDetail(
    pageId,
    selectedA ?? 0,
  );
  const { data: versionBDetail, isLoading: detailBLoading } = useKbPageVersionDetail(
    pageId,
    selectedB ?? 0,
  );
  const restoreVersion = useRestoreKbVersion();

  function syncUrl(a: number | null, b: number | null) {
    const params = new URLSearchParams();
    if (a) params.set("version", String(a));
    if (b) params.set("compare", String(b));
    const qs = params.toString();
    router.replace(`${window.location.pathname}${qs ? `?${qs}` : ""}`, { scroll: false });
  }

  function handleVersionSelect(e: React.MouseEvent<HTMLButtonElement>) {
    const vn = e.currentTarget.dataset.versionNumber;
    if (!vn) return;
    const num = Number(vn);
    if (compareMode) {
      if (selectedA === num) return;
      setSelectedB(num);
      syncUrl(selectedA, num);
    } else {
      setSelectedA(num);
      setSelectedB(null);
      syncUrl(num, null);
    }
  }

  function handleVersionKeyDown(e: React.KeyboardEvent<HTMLButtonElement>) {
    if (e.key === "Enter" || e.key === " ") {
      e.currentTarget.click();
    }
  }

  function handleToggleCompare() {
    const next = !compareMode;
    setCompareMode(next);
    if (!next) {
      setSelectedB(null);
      syncUrl(selectedA, null);
    }
  }

  function handleRestoreClick() {
    setRestoreAlertOpen(true);
  }

  function handleRestoreAlertOpenChange(open: boolean) {
    setRestoreAlertOpen(open);
  }

  function handleLoadMore() {
    void fetchNextPage();
  }

  const handleConfirmRestore = useCallback(() => {
    if (!selectedA) return;
    restoreVersion.mutate(
      { pageId, versionNumber: selectedA },
      {
        onSuccess: () => {
          toast.success("Version restored");
          router.push(pageHref(pageId));
        },
        onError: (err) => toast.error(getErrorMessage(err)),
      },
    );
  }, [selectedA, pageId, restoreVersion, router]);

  const backHref = pageLoading || pageError ? KNOWLEDGE_BASE : pageHref(pageId);

  if (pageLoading) {
    return (
      <PageWrapper title="Page history" backHref={backHref}>
        <div className="space-y-3">
          {Array.from({ length: 10 }).map((_, i) => (
            <Skeleton key={i} className="h-14 w-full rounded-lg" />
          ))}
        </div>
      </PageWrapper>
    );
  }

  if (pageError || !currentPage) {
    return (
      <PageWrapper title="Page history" backHref={backHref}>
        <div className="flex flex-col items-center justify-center flex-1 min-h-[40dvh] gap-3">
          <p className="text-sm text-muted-foreground">Failed to load page.</p>
          <Button variant="outline" size="sm" onClick={() => router.refresh()}>
            Retry
          </Button>
        </div>
      </PageWrapper>
    );
  }

  const showingCompare = compareMode && selectedA !== null && selectedB !== null;
  const showingDetail = !showingCompare && selectedA !== null;

  return (
    <>
      <PageWrapper
        title="Page history"
        subtitle={currentPage.title || "Untitled"}
        backHref={pageHref(pageId)}
        noInternalScroll
      >
        <div className="h-full flex flex-col md:flex-row gap-4">
          <div className="w-full md:w-72 lg:w-80 shrink-0 flex flex-col">
            <div className="h-56 md:h-full border border-border rounded-xl bg-card flex flex-col overflow-hidden">
              <div className="px-4 py-3 border-b border-border shrink-0 flex items-center justify-between gap-2">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                  Versions{versions.length > 0 ? ` (${versions.length})` : ""}
                </p>
                <button
                  type="button"
                  onClick={handleToggleCompare}
                  aria-label={compareMode ? "Exit compare mode" : "Enter compare mode"}
                  aria-pressed={compareMode}
                  className={`inline-flex items-center gap-1 text-xs rounded-md px-2 py-1 transition-colors ${
                    compareMode
                      ? "bg-primary/10 text-primary"
                      : "text-muted-foreground hover:text-foreground hover:bg-muted"
                  }`}
                >
                  <GitCompare className="h-3 w-3" />
                  Compare
                </button>
              </div>
              {compareMode && (
                <div className="px-3 py-1.5 bg-muted/60 border-b border-border text-xs text-muted-foreground">
                  {selectedA ? (
                    <span>
                      Base: v{selectedA}
                      {selectedB ? ` · Compare: v${selectedB}` : " · Pick a compare version"}
                    </span>
                  ) : (
                    "Select base version"
                  )}
                </div>
              )}
              <ScrollArea fill className="flex-1 min-h-0">
                <div className="p-2">
                  {versionsLoading && (
                    <div className="space-y-2 p-2">
                      {Array.from({ length: 5 }).map((_, i) => (
                        <Skeleton key={i} className="h-14 w-full rounded-lg" />
                      ))}
                    </div>
                  )}
                  {!versionsLoading && versions.length === 0 && (
                    <EmptyState
                      title="No versions yet"
                      description="Changes will be saved as versions automatically."
                      compact
                      className="min-h-[8rem]"
                    />
                  )}
                  {versions.map((v: KbPageVersion) => {
                    const isCurrentVersion = v.versionNumber === currentVersionNumber;
                    const isSelectedA = selectedA === v.versionNumber;
                    const isSelectedB = selectedB === v.versionNumber;
                    const isSelected = isSelectedA || isSelectedB;
                    return (
                      <button
                        key={v.versionNumber}
                        type="button"
                        data-version-number={String(v.versionNumber)}
                        onClick={handleVersionSelect}
                        onKeyDown={handleVersionKeyDown}
                        aria-label={`Select version ${v.versionNumber}${isCurrentVersion ? " (current)" : ""}`}
                        aria-pressed={isSelected}
                        className={`w-full text-left px-3 py-2.5 rounded-lg transition-colors mb-1 ${
                          isSelected
                            ? "bg-primary/10 border border-primary/20"
                            : "hover:bg-muted border border-transparent"
                        }`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-1.5">
                              <p className="text-sm font-medium text-foreground">
                                Version {v.versionNumber}
                              </p>
                              {isCurrentVersion && (
                                <Badge
                                  variant="secondary"
                                  className="text-xs px-1.5 py-0 h-4 leading-none shrink-0"
                                >
                                  Current
                                </Badge>
                              )}
                              {compareMode && isSelectedA && !isSelectedB && (
                                <Badge
                                  variant="outline"
                                  className="text-xs px-1.5 py-0 h-4 leading-none shrink-0 text-primary border-primary/30"
                                >
                                  Base
                                </Badge>
                              )}
                              {compareMode && isSelectedB && (
                                <Badge
                                  variant="outline"
                                  className="text-xs px-1.5 py-0 h-4 leading-none shrink-0 text-secondary-foreground"
                                >
                                  Compare
                                </Badge>
                              )}
                            </div>
                            <p className="text-xs text-muted-foreground mt-0.5">
                              {v.authorName ? `${v.authorName} · ` : ""}{kbTimeAgo(v.createdAt)}
                            </p>
                            {v.changeSummary && (
                              <TruncatedText
                                text={v.changeSummary}
                                className="text-xs text-muted-foreground mt-0.5"
                              />
                            )}
                          </div>
                          {isSelected && !compareMode && (
                            <KbArrowRightIcon className="h-3.5 w-3.5 text-primary shrink-0 mt-1" />
                          )}
                        </div>
                      </button>
                    );
                  })}
                  {hasNextPage && (
                    <LoadingButton
                      variant="ghost"
                      size="sm"
                      onClick={handleLoadMore}
                      isPending={isFetchingNextPage}
                      loadingText="Loading…"
                      className="w-full text-xs h-8 text-muted-foreground"
                    >
                      Load more versions
                    </LoadingButton>
                  )}
                </div>
              </ScrollArea>
            </div>
          </div>

          <div className="flex-1 min-w-0 flex flex-col min-h-0">
            {!selectedA ? (
              <div className="flex flex-col items-center justify-center h-full min-h-[20rem] border border-dashed border-border rounded-xl bg-card gap-3">
                <KbClockIcon className="w-8 text-muted-foreground" />
                <p className="text-sm text-muted-foreground">Select a version to preview</p>
                {compareMode && (
                  <p className="text-xs text-muted-foreground">Select two versions to compare</p>
                )}
              </div>
            ) : showingCompare && versionADetail && versionBDetail ? (
              <div className="border border-border rounded-xl bg-card flex flex-col h-full overflow-hidden">
                <div className="px-6 py-4 border-b border-border shrink-0">
                  <div className="flex items-center gap-2">
                    <GitCompare className="h-4 w-4 text-muted-foreground shrink-0" />
                    <span className="text-sm font-semibold text-foreground">
                      Version {selectedA} vs Version {selectedB}
                    </span>
                  </div>
                </div>
                <ScrollArea fill hideScrollbar className="min-h-0 flex-1">
                  <div className="px-6 py-4 overscroll-contain">
                    {detailALoading || detailBLoading ? (
                      <div className="space-y-3">
                        <Skeleton className="h-5 w-3/4" />
                        <Skeleton className="h-4 w-full" />
                        <Skeleton className="h-4 w-5/6" />
                      </div>
                    ) : (
                      <TwoVersionDiffView versionA={versionADetail} versionB={versionBDetail} />
                    )}
                  </div>
                </ScrollArea>
              </div>
            ) : showingDetail ? (
              <div className="border border-border rounded-xl bg-card flex flex-col h-full overflow-hidden">
                <div className="px-6 py-4 border-b border-border shrink-0">
                  <div className="flex items-center justify-between gap-4">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <TruncatedText
                          text={detailALoading ? "Loading…" : versionADetail?.title ?? "Untitled"}
                          className="text-sm font-semibold text-foreground"
                        />
                        {selectedA === currentVersionNumber && (
                          <Badge variant="secondary" className="text-xs px-1.5 py-0 h-4 leading-none shrink-0">
                            Current
                          </Badge>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        Version {selectedA}
                        {versionADetail?.authorName ? ` · ${versionADetail.authorName}` : ""}
                      </p>
                      {versionADetail?.changeSummary && (
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {versionADetail.changeSummary}
                        </p>
                      )}
                    </div>
                    <LoadingButton
                      size="sm"
                      onClick={handleRestoreClick}
                      disabled={detailALoading || !versionADetail?.content || selectedA === currentVersionNumber}
                      isPending={restoreVersion.isPending}
                      loadingText="Restoring…"
                      className="shrink-0 gap-1.5 h-7 text-xs"
                    >
                      <KbRotateCcwIcon className="h-3 w-3" />
                      Restore
                    </LoadingButton>
                  </div>
                </div>

                <ScrollArea fill hideScrollbar className="min-h-0 flex-1">
                  <div className="overscroll-contain">
                    {detailALoading ? (
                      <div className="px-6 py-4 space-y-3">
                        <Skeleton className="h-5 w-3/4" />
                        <Skeleton className="h-4 w-full" />
                        <Skeleton className="h-4 w-5/6" />
                        <Skeleton className="h-4 w-4/6" />
                        <Skeleton className="h-4 w-full" />
                      </div>
                    ) : (
                      <div className="px-6 py-4 space-y-4">
                        {versionADetail && (
                          <BlockDiffView
                            versionContent={versionADetail.content}
                            currentContent={currentPage.content}
                            versionTitle={versionADetail.title}
                            currentTitle={currentPage.title}
                          />
                        )}
                      </div>
                    )}
                  </div>
                </ScrollArea>
              </div>
            ) : compareMode && selectedA && !selectedB ? (
              <div className="flex flex-col items-center justify-center h-full min-h-[20rem] border border-dashed border-border rounded-xl bg-card gap-3">
                <GitCompare className="w-8 text-muted-foreground" />
                <p className="text-sm text-muted-foreground">
                  Now select a second version to compare
                </p>
              </div>
            ) : null}
          </div>
        </div>
      </PageWrapper>

      <ConfirmDialog
        open={restoreAlertOpen}
        onOpenChange={handleRestoreAlertOpenChange}
        title={`Restore version ${selectedA}?`}
        description="The current content will be saved as a new version before restoring."
        confirmLabel="Restore"
        isPending={restoreVersion.isPending}
        onConfirm={handleConfirmRestore}
      />
    </>
  );
}
