"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import { History, RotateCcw, ChevronRight, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { EmptyState } from "@/components/ui/empty-state";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { useKbPageVersions, useKbPageVersion, useRestoreKbPageVersion } from "@/hooks/api/kb";
import type { KbPageVersion } from "@/hooks/api/kb/pages";

const TiptapEditor = dynamic(
  () =>
    import("@/components/editor/tiptap-editor").then((m) => ({
      default: m.TiptapEditor,
    })),
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
  const { data: versions = [], isLoading } = useKbPageVersions(pageId);
  const { data: versionDetail, isLoading: detailLoading } = useKbPageVersion(
    pageId,
    selectedVersion ?? 0
  );
  const restoreVersion = useRestoreKbPageVersion();

  function handleSelectVersion(v: KbPageVersion) {
    setSelectedVersion(v.versionNumber);
  }

  function handleRestore() {
    if (!selectedVersion) return;
    if (!window.confirm("Restore this version? The current content will be saved as a new version.")) return;
    restoreVersion.mutate(
      { pageId, versionNumber: selectedVersion },
      {
        onSuccess: () => {
          toast.success("Version restored");
          onOpenChange(false);
        },
        onError: () => toast.error("Failed to restore version"),
      }
    );
  }

  function handleBackToList() {
    setSelectedVersion(null);
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-lg p-0 flex flex-col">
        <SheetHeader className="px-6 py-4 border-b shrink-0">
          <div className="flex items-center justify-between">
            <SheetTitle className="flex items-center gap-2">
              <History className="h-4 w-4" />
              {selectedVersion ? `Version ${selectedVersion}` : "Page history"}
            </SheetTitle>
            {selectedVersion && (
              <Button variant="ghost" size="sm" onClick={handleBackToList} className="text-xs">
                ← All versions
              </Button>
            )}
          </div>
        </SheetHeader>

        {!selectedVersion ? (
          <ScrollArea className="flex-1 min-h-0 px-6 py-4">
            {isLoading && (
              <div className="space-y-3">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Skeleton key={i} className="h-14 w-full rounded-lg" />
                ))}
              </div>
            )}
            {!isLoading && versions.length === 0 && (
              <EmptyState
                title="No versions yet"
                description="Content changes will be saved as versions automatically."
                compact
                className="min-h-[120px]"
              />
            )}
            <div className="space-y-2">
              {versions.map((v) => (
                <button
                  key={v.versionNumber}
                  className="w-full text-left p-3 rounded-lg border border-border hover:bg-muted transition-colors group"
                  onClick={() => handleSelectVersion(v)}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium">Version {v.versionNumber}</p>
                      <p className="text-xs text-muted-foreground">
                        {formatRelativeTime(v.createdAt)}
                      </p>
                    </div>
                    <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:text-foreground" />
                  </div>
                </button>
              ))}
            </div>
          </ScrollArea>
        ) : (
          <div className="flex-1 flex flex-col min-h-0">
            <div className="flex-1 overflow-y-auto px-6 py-4">
              {detailLoading ? (
                <Skeleton className="h-64 w-full" />
              ) : versionDetail?.content ? (
                <TiptapEditor
                  content={versionDetail.content}
                  contentKey={`${pageId}-v${selectedVersion}`}
                  variant="document"
                  editable={false}
                  minHeightClassName="min-h-[200px]"
                />
              ) : (
                <EmptyState
                  title="Empty version"
                  description="No content was saved in this version."
                  compact
                  className="min-h-[120px]"
                />
              )}
            </div>
            <div className="shrink-0 border-t px-6 py-4">
              <Button
                onClick={handleRestore}
                disabled={restoreVersion.isPending}
                className="w-full gap-2"
              >
                {restoreVersion.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <RotateCcw className="h-4 w-4" />
                )}
                Restore this version
              </Button>
            </div>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}
