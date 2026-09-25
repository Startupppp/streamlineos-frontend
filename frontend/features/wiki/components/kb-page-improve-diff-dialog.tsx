"use client";

import { useMemo } from "react";
import { Button } from "@/components/ui/button";
import { LoadingButton } from "@/components/ui/loading-button";
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { statusToneClasses } from "@/lib/design-tokens";
import { cn } from "@/lib/utils";

type DiffKind = "unchanged" | "removed" | "added";

interface DiffLine {
  kind: DiffKind;
  text: string;
}

const MAX_LINES_EACH = 250;

const ADDED_CLASSES = cn(
  statusToneClasses("success").surface,
  statusToneClasses("success").ink,
);
const REMOVED_CLASSES = cn(
  statusToneClasses("danger").surface,
  statusToneClasses("danger").ink,
);

function computeLineDiff(before: string, after: string): DiffLine[] | null {
  const beforeLines = before.split("\n");
  const afterLines = after.split("\n");
  if (beforeLines.length > MAX_LINES_EACH || afterLines.length > MAX_LINES_EACH) {
    return null;
  }

  const m = beforeLines.length;
  const n = afterLines.length;
  const dp: number[][] = Array.from({ length: m + 1 }, () =>
    new Array<number>(n + 1).fill(0),
  );

  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      dp[i][j] =
        beforeLines[i - 1] === afterLines[j - 1]
          ? dp[i - 1][j - 1] + 1
          : Math.max(dp[i - 1][j], dp[i][j - 1]);
    }
  }

  const lines: DiffLine[] = [];
  let i = m;
  let j = n;
  while (i > 0 || j > 0) {
    if (i > 0 && j > 0 && beforeLines[i - 1] === afterLines[j - 1]) {
      lines.unshift({ kind: "unchanged", text: beforeLines[i - 1] });
      i--;
      j--;
    } else if (j > 0 && (i === 0 || dp[i][j - 1] >= dp[i - 1][j])) {
      lines.unshift({ kind: "added", text: afterLines[j - 1] });
      j--;
    } else {
      lines.unshift({ kind: "removed", text: beforeLines[i - 1] });
      i--;
    }
  }

  return lines;
}

interface KbPageImproveDiffDialogProps {
  open: boolean;
  proposedText: string;
  currentContent?: string;
  onApply: () => void;
  onDiscard: () => void;
}

export function KbPageImproveDiffDialog({
  open,
  proposedText,
  currentContent,
  onApply,
  onDiscard,
}: KbPageImproveDiffDialogProps) {
  const diff = useMemo(
    () => (currentContent ? computeLineDiff(currentContent, proposedText) : null),
    [currentContent, proposedText],
  );

  function handleOpenChange(nextOpen: boolean) {
    if (!nextOpen) onDiscard();
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Review proposed changes</DialogTitle>
          <DialogDescription>
            {diff
              ? "Lines in red will be removed; lines in green will be added."
              : "Review the proposed replacement before applying."}
          </DialogDescription>
        </DialogHeader>
        <DialogBody>
          {diff ? (
            <div
              className="overflow-hidden rounded-md border border-border font-mono text-xs leading-relaxed"
              role="region"
              aria-label="Content diff"
            >
              {diff.map((line, idx) => (
                <div
                  key={idx}
                  className={cn(
                    "px-3 py-0.5",
                    line.kind === "added" && ADDED_CLASSES,
                    line.kind === "removed" && REMOVED_CLASSES,
                    line.kind === "unchanged" && "text-muted-foreground",
                  )}
                >
                  <span aria-hidden className="mr-2 select-none opacity-60">
                    {line.kind === "added" ? "+" : line.kind === "removed" ? "-" : " "}
                  </span>
                  {line.text || " "}
                </div>
              ))}
            </div>
          ) : (
            <p className="whitespace-pre-wrap text-sm leading-relaxed text-foreground">
              {proposedText}
            </p>
          )}
        </DialogBody>
        <DialogFooter>
          <Button type="button" variant="ghost" onClick={onDiscard}>
            Discard
          </Button>
          <LoadingButton type="button" onClick={onApply}>
            Apply changes
          </LoadingButton>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
