"use client";

import { useState } from "react";

import { Button } from "@/components/ui/button";
import { UnsavedChangesDialog } from "@/components/ui/unsaved-changes-dialog";
import { KbAlertCircleIcon } from "@/features/wiki/lib/kb-icons";
import type { KbPageEditConflict } from "@/features/wiki/lib/wiki-schema";
import { formatDateTime, formatRelativeTime } from "@/lib/date-utils";

interface PageEditConflictProps {
  conflict: KbPageEditConflict;
  isReloading: boolean;
  pendingFields?: readonly string[];
  localTitle: string;
  localBody: string;
  onKeepMine: () => void;
  onDiscardMine: () => void;
  onCompare: () => Promise<{ title: string; body: string }>;
}

function describePendingFields(fields: readonly string[]): string {
  const labels: Record<string, string> = {
    title: "title",
    content: "body",
    contentText: "body",
  };
  const unique = Array.from(
    new Set(fields.map((f) => labels[f] ?? f)),
  );
  if (unique.length === 0) return "";
  if (unique.length === 1) return unique[0] ?? "";
  return `${unique.slice(0, -1).join(", ")} and ${unique[unique.length - 1]}`;
}

export default function PageEditConflict({
  conflict,
  isReloading,
  pendingFields,
  localTitle,
  localBody,
  onKeepMine,
  onDiscardMine,
  onCompare,
}: PageEditConflictProps) {
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [isComparing, setIsComparing] = useState(false);
  const [compareError, setCompareError] = useState(false);
  const [comparison, setComparison] = useState<{
    title: string;
    body: string;
  } | null>(null);

  function handleOpenConfirm() {
    setConfirmOpen(true);
  }

  async function handleCompare() {
    setIsComparing(true);
    setCompareError(false);
    setComparison(null);
    try {
      setComparison(await onCompare());
    } catch {
      setCompareError(true);
    } finally {
      setIsComparing(false);
    }
  }

  const editor = conflict.lastEditedByName ?? "Someone else";
  const when = formatRelativeTime(conflict.lastEditedAt);
  const exactly = formatDateTime(conflict.lastEditedAt);
  const localSummary =
    pendingFields && pendingFields.length > 0
      ? describePendingFields(pendingFields)
      : null;
  const titlePending = pendingFields?.includes("title") ?? false;
  const bodyPending =
    pendingFields?.some(
      (field) => field === "content" || field === "contentText",
    ) ?? false;

  return (
    <>
      <div
        role="alert"
        className="mb-4 flex flex-wrap items-center gap-x-3 gap-y-2 rounded-lg border border-status-danger-rule bg-status-danger-surface px-3 py-2.5"
      >
        <KbAlertCircleIcon className="h-4 w-4 shrink-0 text-status-danger-ink" />
        <div className="flex-1 min-w-0 text-sm text-status-danger-ink space-y-0.5">
          <span>
            {editor} saved a newer version of this file
            {when ? (
              <>
                {" "}
                <time dateTime={conflict.lastEditedAt ?? undefined} title={exactly}>
                  {when}
                </time>
              </>
            ) : null}
            . Autosave is paused — nothing you typed has been lost or overwritten.
          </span>
          {localSummary && (
            <p className="text-xs text-status-danger-ink opacity-80">
              Your local changes: {localSummary}
            </p>
          )}
          {conflict.currentContentRevision === null && (
            <p className="text-xs text-status-danger-ink opacity-80">
              The latest revision could not be confirmed, so your version cannot be saved yet.
            </p>
          )}
        </div>
        <div className="ml-auto flex shrink-0 items-center gap-2">
          <Button
            size="sm"
            variant="outline"
            className="h-7"
            onClick={handleCompare}
            disabled={isComparing || (!titlePending && !bodyPending)}
          >
            {isComparing ? "Comparing…" : "Compare versions"}
          </Button>
          <Button size="sm" className="h-7" onClick={onKeepMine} disabled={conflict.currentContentRevision === null}>
            Keep my version
          </Button>
          <Button size="sm" variant="outline" className="h-7" onClick={handleOpenConfirm}>
            Load theirs
          </Button>
        </div>
      </div>

      {compareError && (
        <p role="alert" className="mb-4 text-sm text-status-danger-ink">
          Couldn&apos;t compare versions. Try again.
        </p>
      )}
      {comparison && (
        <section
          aria-label="Version comparison"
          className="mb-4 space-y-3 rounded-lg border border-border bg-muted/40 p-3"
        >
          <p className="text-xs text-muted-foreground">
            Only fields in your pending save are compared. Review both versions
            before choosing one.
          </p>
          {titlePending && (
            <div className="space-y-2">
              <h4 className="text-sm font-medium">Title</h4>
              <div className="grid gap-2 sm:grid-cols-2">
                <div className="min-w-0 rounded border border-border bg-background p-2">
                  <p className="text-xs font-medium">Mine</p>
                  <p className="break-words text-sm">{localTitle || "Untitled"}</p>
                </div>
                <div className="min-w-0 rounded border border-border bg-background p-2">
                  <p className="text-xs font-medium">Latest</p>
                  <p className="break-words text-sm">
                    {comparison.title || "Untitled"}
                  </p>
                </div>
              </div>
            </div>
          )}
          {bodyPending && (
            <div className="space-y-2">
              <h4 className="text-sm font-medium">Body text</h4>
              <p className="text-xs text-muted-foreground">
                Formatting and media are not shown in this text comparison.
              </p>
              <div className="grid gap-2 sm:grid-cols-2">
                <div className="min-w-0 rounded border border-border bg-background p-2">
                  <p className="text-xs font-medium">Mine</p>
                  <pre className="max-h-48 overflow-auto whitespace-pre-wrap break-words text-sm">
                    {localBody || "Empty"}
                  </pre>
                </div>
                <div className="min-w-0 rounded border border-border bg-background p-2">
                  <p className="text-xs font-medium">Latest</p>
                  <pre className="max-h-48 overflow-auto whitespace-pre-wrap break-words text-sm">
                    {comparison.body || "Empty"}
                  </pre>
                </div>
              </div>
            </div>
          )}
        </section>
      )}

      <UnsavedChangesDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        title="Load their version?"
        description={`Everything you have typed since ${editor} saved will be discarded and replaced by their version. This cannot be undone.`}
        keepEditingLabel="Keep editing"
        discardLabel="Discard mine and load theirs"
        onDiscard={onDiscardMine}
        isSaving={isReloading}
      />
    </>
  );
}
