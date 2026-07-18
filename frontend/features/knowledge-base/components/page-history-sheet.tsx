"use client";

import { useState } from "react";
import Link from "next/link";
import dynamic from "next/dynamic";
import {
  KbChevronRightIcon,
  KbHistoryIcon,
  KbLoader2Icon,
  KbRotateCcwIcon,
} from "@/features/knowledge-base/lib/kb-icons";
import { toast } from "sonner";
import { Sheet, SheetBody, SheetContent, SheetFooter, SheetHeader, SheetTitle } from "@/components/ui/sheet";
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
import { EmptyState } from "@/components/ui/empty-state";
import { TruncatedText } from "@/components/ui/truncated-text";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useKbPageVersions, useKbPageVersion, useRestoreKbPageVersion } from "@/hooks/api/kb";
import type { KbPageVersion } from "@/hooks/api/kb/pages";
import { pageHistoryHref } from "@/features/knowledge-base/lib/knowledge-routes";
import { getErrorMessage } from "@/lib/get-error-message";

const PlateDocumentEditor = dynamic(
  () => import("@/components/editor/plate/plate-document-editor"),
  { ssr: false, loading: () => <Skeleton className="h-32 w-full" /> }
);

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

interface PageHistorySheetProps {
  pageId: number;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function PageHistorySheet({ pageId, open, onOpenChange }: PageHistorySheetProps) {
  const [selectedVersion, setSelectedVersion] = useState<number | null>(null);
  const [restoreAlertOpen, setRestoreAlertOpen] = useState(false);
  const { data: versions = [], isLoading } = useKbPageVersions(pageId);
  const { data: versionDetail, isLoading: detailLoading } = useKbPageVersion(
    pageId,
    selectedVersion ?? 0
  );
  const restoreVersion = useRestoreKbPageVersion();

  const hasContent = Boolean(versionDetail?.content);

  function handleVersionButtonClick(e: React.MouseEvent<HTMLButtonElement>) {
    const vn = e.currentTarget.dataset.versionNumber;
    if (!vn) return;
    setSelectedVersion(Number(vn));
  }

  function handleRestore() {
    if (!selectedVersion || !hasContent) return;
    setRestoreAlertOpen(true);
  }

  function handleConfirmRestore() {
    if (!selectedVersion) return;
    restoreVersion.mutate(
      { pageId, versionNumber: selectedVersion },
      {
        onSuccess: () => {
          toast.success("Version restored");
          onOpenChange(false);
        },
        onError: (err) => toast.error(getErrorMessage(err)),
      }
    );
  }

  function handleRestoreAlertOpenChange(open: boolean) {
    setRestoreAlertOpen(open);
  }

  function handleBackToList() {
    setSelectedVersion(null);
  }

  return (
    <>
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
        </SheetHeader>

        {!selectedVersion ? (
          <>
            <SheetBody className="px-6 py-4">
                {isLoading && (
                  <div className="space-y-3">
                    {Array.from({ length: 12 }).map((_, i) => (
                      <Skeleton key={i} className="h-16 w-full rounded-lg" />
                    ))}
                  </div>
                )}
                {!isLoading && versions.length === 0 && (
                  <EmptyState
                    title="No versions yet"
                    description="Content changes will be saved as versions automatically."
                    compact
                    className="flex-1 min-h-[40dvh]"
                  />
                )}
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
                          <p className="text-sm font-medium">Version {v.versionNumber}</p>
                          <p className="text-xs text-muted-foreground">
                            {v.authorName ? `${v.authorName} · ` : ""}{formatRelativeTime(v.createdAt)}
                          </p>
                          {v.changeSummary && (
                            <TruncatedText text={v.changeSummary ?? ""} className="text-xs text-muted-foreground mt-0.5" />
                          )}
                        </div>
                        <KbChevronRightIcon className="h-4 w-4 text-muted-foreground group-hover:text-foreground shrink-0" />
                      </div>
                    </button>
                  ))}
                </div>
            </SheetBody>
            <SheetFooter className="border-t px-6 py-3 flex items-center justify-end">
              <Link
                href={pageHistoryHref(pageId)}
                className="text-xs text-muted-foreground hover:text-foreground transition-colors"
                onClick={() => onOpenChange(false)}
              >
                Open full history →
              </Link>
            </SheetFooter>
          </>
        ) : (
          <div className="flex-1 flex flex-col min-h-0">
            {versionDetail && !detailLoading && (
              <div className="shrink-0 px-6 py-3 border-b bg-muted/30">
                {versionDetail.authorName && (
                  <p className="text-xs text-muted-foreground">
                    By <span className="font-medium text-foreground">{versionDetail.authorName}</span>
                    {" · "}{formatRelativeTime(versionDetail.createdAt)}
                  </p>
                )}
                {!versionDetail.authorName && (
                  <p className="text-xs text-muted-foreground">{formatRelativeTime(versionDetail.createdAt)}</p>
                )}
                {versionDetail.changeSummary && (
                  <p className="text-xs text-muted-foreground mt-0.5">{versionDetail.changeSummary}</p>
                )}
              </div>
            )}
            <SheetBody className="px-6 py-4">
              {detailLoading ? (
                <Skeleton className="h-64 w-full" />
              ) : hasContent ? (
                <PlateDocumentEditor
                  value={versionDetail!.content}
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
            </SheetBody>
            <SheetFooter className="border-t px-6 py-4">
              <Button
                onClick={handleRestore}
                disabled={restoreVersion.isPending || detailLoading || !hasContent}
                className="w-full gap-2 h-9"
                size="sm"
              >
                {restoreVersion.isPending ? (
                  <KbLoader2Icon className="h-4 w-4 animate-spin" />
                ) : (
                  <KbRotateCcwIcon className="h-4 w-4" />
                )}
                {hasContent ? "Restore this version" : "No content to restore"}
              </Button>
            </SheetFooter>
          </div>
        )}
      </SheetContent>
    </Sheet>

    <AlertDialog open={restoreAlertOpen} onOpenChange={handleRestoreAlertOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Restore this version?</AlertDialogTitle>
          <AlertDialogDescription>
            The current content will be saved as a new version before restoring.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
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
