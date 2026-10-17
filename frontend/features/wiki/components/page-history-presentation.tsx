import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { KbClockIcon } from "@/features/wiki/lib/kb-icons";
import { GitCompare } from "lucide-react";
import { computeVersionDiff } from "@/features/wiki/lib/version-diff";
import type { KbPageVersion } from "@/hooks/api/kb/page-types";

interface BlockDiffViewProps {
  heading: string;
  identicalLabel: string;
  beforeContent: Record<string, unknown> | Record<string, unknown>[] | null;
  afterContent: Record<string, unknown> | Record<string, unknown>[] | null;
  beforeTitle: string;
  afterTitle: string;
}

export function BlockDiffView({
  heading,
  identicalLabel,
  beforeContent,
  afterContent,
  beforeTitle,
  afterTitle,
}: BlockDiffViewProps) {
  const diff = computeVersionDiff(
    beforeTitle,
    beforeContent,
    afterTitle,
    afterContent,
  );
  const hasChanges =
    diff.titleChanged ||
    diff.addedCount > 0 ||
    diff.removedCount > 0 ||
    diff.changedCount > 0;

  return (
    <div className="rounded-lg border border-border bg-muted/40 px-4 py-3 space-y-2">
      <div className="flex items-center gap-2 flex-wrap">
        <p className="text-xs font-semibold text-foreground">{heading}</p>
        {diff.addedCount > 0 && (
          <Badge
            variant="outline"
            className="text-status-success-ink border-status-success-ink text-xs px-1.5 py-0"
          >
            +{diff.addedCount} added
          </Badge>
        )}
        {diff.removedCount > 0 && (
          <Badge
            variant="outline"
            className="text-status-danger-ink border-status-danger-ink text-xs px-1.5 py-0"
          >
            -{diff.removedCount} removed
          </Badge>
        )}
        {diff.changedCount > 0 && (
          <Badge
            variant="outline"
            className="text-status-warning-ink border-status-warning-ink text-xs px-1.5 py-0"
          >
            {diff.changedCount} changed
          </Badge>
        )}
      </div>
      {!hasChanges && (
        <p className="text-xs text-muted-foreground">{identicalLabel}</p>
      )}
      {diff.titleChanged && (
        <p className="text-xs text-muted-foreground">
          Title:{" "}
          <span className="line-through text-status-danger-ink">
            {diff.oldTitle}
          </span>
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
              <span className="font-semibold uppercase tracking-wide mr-1 opacity-60">
                {b.type}
              </span>
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
        <span>
          Version {versionA.versionNumber} → Version {versionB.versionNumber}
        </span>
        <div className="flex gap-2">
          {diff.addedCount > 0 && (
            <span className="text-status-success-ink font-medium">
              +{diff.addedCount}
            </span>
          )}
          {diff.removedCount > 0 && (
            <span className="text-status-danger-ink font-medium">
              -{diff.removedCount}
            </span>
          )}
          {diff.changedCount > 0 && (
            <span className="text-status-warning-ink font-medium">
              ~{diff.changedCount}
            </span>
          )}
        </div>
      </div>
      {diff.titleChanged && (
        <div className="text-xs px-3 py-2 rounded border border-border">
          <span className="font-semibold text-foreground">Title: </span>
          <span className="line-through text-status-danger-ink">
            {diff.oldTitle}
          </span>
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
            <span className="font-semibold uppercase tracking-wide mr-1 opacity-60">
              {b.type}
            </span>
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

export function PageHistorySelectPrompt({ compareMode }: { compareMode: boolean }) {
  return (
    <div className="flex flex-col items-center justify-center h-full min-h-[20rem] border border-dashed border-border rounded-xl bg-card gap-3">
      <KbClockIcon className="w-8 text-muted-foreground" />
      <p className="text-sm text-muted-foreground">
        Select a version to preview
      </p>
      {compareMode && (
        <p className="text-xs text-muted-foreground">
          Select two versions to compare
        </p>
      )}
    </div>
  );
}

interface PageHistoryCompareDetailProps {
  versionA: KbPageVersion;
  versionB: KbPageVersion;
  selectedA: number | null;
  selectedB: number | null;
  isLoading: boolean;
}

export function PageHistoryCompareDetail({
  versionA,
  versionB,
  selectedA,
  selectedB,
  isLoading,
}: PageHistoryCompareDetailProps) {
  return (
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
          {isLoading ? (
            <div className="space-y-3">
              <Skeleton className="h-5 w-3/4" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-5/6" />
            </div>
          ) : (
            <TwoVersionDiffView
              versionA={versionA}
              versionB={versionB}
            />
          )}
        </div>
      </ScrollArea>
    </div>
  );
}
