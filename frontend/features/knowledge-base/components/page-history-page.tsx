"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  KbArrowRightIcon,
  KbClockIcon,
  KbLoader2Icon,
  KbRotateCcwIcon,
} from "@/features/knowledge-base/lib/kb-icons";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { Button } from "@/components/ui/button";
import { TruncatedText } from "@/components/ui/truncated-text";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
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
import { useKbPage, useKbPageVersions, useKbPageVersion, useRestoreKbPageVersion } from "@/hooks/api/kb";
import type { KbPageVersion } from "@/hooks/api/kb/pages";
import { getErrorMessage } from "@/lib/get-error-message";
import PublicPageContent from "./public-page-content";
import { computeVersionDiff } from "@/features/knowledge-base/lib/version-diff";
import { pageHref, KNOWLEDGE_BASE } from "@/features/knowledge-base/lib/knowledge-routes";

function formatRelativeTime(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);
  if (days > 0) return `${days}d ago`;
  if (hours > 0) return `${hours}h ago`;
  if (minutes > 0) return `${minutes}m ago`;
  return "just now";
}

interface DiffSummaryProps {
  versionTitle: string;
  versionContent: Record<string, unknown> | Record<string, unknown>[] | null;
  currentTitle: string;
  currentContentText: string | null;
}

function DiffSummary({ versionTitle, versionContent, currentTitle, currentContentText }: DiffSummaryProps) {
  const diff = computeVersionDiff(versionTitle, versionContent, currentTitle, currentContentText);
  const hasChanges = diff.titleChanged || diff.wordCountDelta !== 0 || diff.excerpt !== null;

  return (
    <div className="rounded-lg border border-border bg-muted/40 px-4 py-3 space-y-2">
      <p className="text-xs font-semibold text-foreground">Diff vs current</p>
      {!hasChanges && (
        <p className="text-xs text-muted-foreground">Identical to the current page.</p>
      )}
      {diff.titleChanged && (
        <p className="text-xs text-muted-foreground">
          Title changed:{" "}
          <span className="text-foreground font-medium">&ldquo;{diff.oldTitle}&rdquo;</span>
          {" → "}
          <span className="text-foreground font-medium">&ldquo;{diff.newTitle}&rdquo;</span>
        </p>
      )}
      {diff.wordCountDelta !== 0 && (
        <p className="text-xs text-muted-foreground">
          Word count:{" "}
          <span className={diff.wordCountDelta > 0 ? "text-emerald-600 dark:text-emerald-400 font-medium" : "text-red-600 dark:text-red-400 font-medium"}>
            {diff.wordCountDelta > 0 ? `+${diff.wordCountDelta}` : diff.wordCountDelta} vs current
          </span>{" "}
          ({diff.versionWordCount} in this version, {diff.currentWordCount} now)
        </p>
      )}
      {diff.excerpt && (
        <div>
          <p className="text-xs text-muted-foreground mb-1">First difference (from this version):</p>
          <p className="text-[11px] text-foreground bg-muted rounded px-2 py-1.5 font-mono break-all line-clamp-3">
            &hellip;{diff.excerpt}&hellip;
          </p>
        </div>
      )}
    </div>
  );
}

interface PageHistoryPageProps {
  pageId: number;
}

export default function PageHistoryPage({ pageId }: PageHistoryPageProps) {
  const router = useRouter();
  const [selectedVersionNumber, setSelectedVersionNumber] = useState<number | null>(null);
  const [restoreAlertOpen, setRestoreAlertOpen] = useState(false);

  const { data: currentPage, isLoading: pageLoading, isError: pageError } = useKbPage(pageId);
  const { data: versions = [], isLoading: versionsLoading } = useKbPageVersions(pageId);
  const { data: versionDetail, isLoading: detailLoading } = useKbPageVersion(
    pageId,
    selectedVersionNumber ?? 0,
  );
  const restoreVersion = useRestoreKbPageVersion();

  function handleVersionSelect(e: React.MouseEvent<HTMLButtonElement>) {
    const vn = e.currentTarget.dataset.versionNumber;
    if (!vn) return;
    setSelectedVersionNumber(Number(vn));
  }

  function handleRestoreClick() {
    setRestoreAlertOpen(true);
  }

  function handleRestoreAlertOpenChange(open: boolean) {
    setRestoreAlertOpen(open);
  }

  function handleConfirmRestore() {
    if (!selectedVersionNumber) return;
    restoreVersion.mutate(
      { pageId, versionNumber: selectedVersionNumber },
      {
        onSuccess: () => {
          toast.success("Version restored");
          router.push(pageHref(pageId));
        },
        onError: (err) => toast.error(getErrorMessage(err)),
      },
    );
  }

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
              <div className="px-4 py-3 border-b border-border shrink-0">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                  Versions{versions.length > 0 ? ` (${versions.length})` : ""}
                </p>
              </div>
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
                  {versions.map((v: KbPageVersion) => (
                    <button
                      key={v.versionNumber}
                      data-version-number={String(v.versionNumber)}
                      onClick={handleVersionSelect}
                      className={`w-full text-left px-3 py-2.5 rounded-lg transition-colors mb-1 ${
                        selectedVersionNumber === v.versionNumber
                          ? "bg-primary/10 border border-primary/20"
                          : "hover:bg-muted border border-transparent"
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-foreground">
                            Version {v.versionNumber}
                          </p>
                          <p className="text-xs text-muted-foreground mt-0.5">
                            {v.authorName ? `${v.authorName} · ` : ""}{formatRelativeTime(v.createdAt)}
                          </p>
                          {v.changeSummary && (
                            <TruncatedText text={v.changeSummary} className="text-xs text-muted-foreground mt-0.5" />
                          )}
                        </div>
                        {selectedVersionNumber === v.versionNumber && (
                          <KbArrowRightIcon className="h-3.5 w-3.5 text-primary shrink-0" />
                        )}
                      </div>
                    </button>
                  ))}
                </div>
              </ScrollArea>
            </div>
          </div>

          <div className="flex-1 min-w-0 flex flex-col min-h-0">
            {!selectedVersionNumber ? (
              <div className="flex flex-col items-center justify-center h-full min-h-[20rem] border border-dashed border-border rounded-xl bg-card gap-3">
                <KbClockIcon className="w-8 text-muted-foreground/40" />
                <p className="text-sm text-muted-foreground">Select a version to preview</p>
              </div>
            ) : (
              <div className="border border-border rounded-xl bg-card flex flex-col h-full overflow-hidden">
                <div className="px-6 py-4 border-b border-border shrink-0">
                  <div className="flex items-center justify-between gap-4">
                    <div className="min-w-0">
                      <TruncatedText text={detailLoading ? "Loading…" : versionDetail?.title || "Untitled"} className="text-sm font-semibold text-foreground" />
                      <p className="text-xs text-muted-foreground mt-0.5">
                        Version {selectedVersionNumber}
                        {versionDetail?.authorName ? ` · ${versionDetail.authorName}` : ""}
                      </p>
                      {versionDetail?.changeSummary && (
                        <p className="text-xs text-muted-foreground mt-0.5">{versionDetail.changeSummary}</p>
                      )}
                    </div>
                    <Button
                      size="sm"
                      onClick={handleRestoreClick}
                      disabled={restoreVersion.isPending || detailLoading || !versionDetail?.content}
                      className="shrink-0 gap-1.5 h-7 text-xs"
                    >
                      {restoreVersion.isPending ? (
                        <KbLoader2Icon className="h-3 w-3 animate-spin" />
                      ) : (
                        <KbRotateCcwIcon className="h-3 w-3" />
                      )}
                      Restore
                    </Button>
                  </div>
                </div>

                <ScrollArea fill hideScrollbar className="min-h-0 flex-1">
                  <div className="overscroll-contain">
                  {detailLoading ? (
                    <div className="px-6 py-4 space-y-3">
                      <Skeleton className="h-5 w-3/4" />
                      <Skeleton className="h-4 w-full" />
                      <Skeleton className="h-4 w-5/6" />
                      <Skeleton className="h-4 w-4/6" />
                      <Skeleton className="h-4 w-full" />
                    </div>
                  ) : (
                    <div className="px-6 py-4 space-y-4">
                      <PublicPageContent content={versionDetail?.content ?? null} />
                      {versionDetail && (
                        <DiffSummary
                          versionTitle={versionDetail.title}
                          versionContent={versionDetail.content}
                          currentTitle={currentPage.title}
                          currentContentText={currentPage.contentText}
                        />
                      )}
                    </div>
                  )}
                  </div>
                </ScrollArea>
              </div>
            )}
          </div>
        </div>
      </PageWrapper>

      <AlertDialog open={restoreAlertOpen} onOpenChange={handleRestoreAlertOpenChange}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Restore version {selectedVersionNumber}?</AlertDialogTitle>
            <AlertDialogDescription>
              The current content will be saved as a new version before restoring.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmRestore}
              disabled={restoreVersion.isPending}
            >
              Restore
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
