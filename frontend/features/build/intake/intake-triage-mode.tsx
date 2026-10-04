"use client";

import { useState, useCallback, useEffect } from "react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { PriorityBadge } from "@/features/build/shared/priority-badge";
import { PM_PANEL } from "@/components/pm-chrome";
import { formatShortDate } from "@/lib/date-utils";
import { ChevronUp, ChevronDown, Check, X, Copy } from "lucide-react";

const STATUS_BADGE_VARIANT: Record<
  string,
  "default" | "secondary" | "destructive" | "outline"
> = {
  pending: "secondary",
  accepted: "default",
  declined: "destructive",
  duplicate: "outline",
};

const REQUEST_TYPE_LABEL: Record<string, string> = {
  bug: "Bug",
  feature: "Feature",
  task: "Task",
  question: "Question",
  other: "Other",
};

interface TriageItem {
  id: number;
  title: string;
  description?: unknown;
  status: string;
  createdAt?: string | Date | null;
  submitterEmail?: string | null;
  submitterName?: string | null;
  priority?: string | null;
  requestType?: string | null;
}

interface IntakeTriageModeProps {
  items: TriageItem[];
  onAccept: (id: number) => void;
  onDecline: (id: number) => void;
  onDuplicate: (id: number) => void;
  onExit: () => void;
}

export function IntakeTriageMode({
  items,
  onAccept,
  onDecline,
  onDuplicate,
  onExit,
}: IntakeTriageModeProps) {
  const [index, setIndex] = useState(0);
  const total = items.length;
  const safeIndex = Math.min(index, Math.max(0, total - 1));
  const currentItem = items[safeIndex];

  useEffect(() => {
    setIndex((i) => Math.min(i, Math.max(0, total - 1)));
  }, [total]);

  const handlePrev = useCallback(
    () => setIndex((i) => Math.max(0, i - 1)),
    [],
  );
  const handleNext = useCallback(
    () => setIndex((i) => Math.min(total - 1, i + 1)),
    [total],
  );
  const handleAccept = useCallback(
    () => {
      if (currentItem) onAccept(currentItem.id);
    },
    [currentItem, onAccept],
  );
  const handleDecline = useCallback(
    () => {
      if (currentItem) onDecline(currentItem.id);
    },
    [currentItem, onDecline],
  );
  const handleDuplicate = useCallback(
    () => {
      if (currentItem) onDuplicate(currentItem.id);
    },
    [currentItem, onDuplicate],
  );

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      const target = e.target as HTMLElement;
      if (
        target.tagName === "INPUT" ||
        target.tagName === "TEXTAREA" ||
        target.isContentEditable
      )
        return;
      if (e.key === "ArrowUp" || e.key === "k") {
        e.preventDefault();
        handlePrev();
      }
      if (e.key === "ArrowDown" || e.key === "j") {
        e.preventDefault();
        handleNext();
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [handlePrev, handleNext]);

  if (total === 0) {
    return (
      <div
        className="flex flex-col items-center justify-center gap-4 py-16 text-center"
        data-testid="intake-triage-mode"
      >
        <p className="text-sm text-muted-foreground">
          No pending items to triage.
        </p>
        <Button type="button" variant="outline" size="sm" onClick={onExit}>
          Exit triage
        </Button>
      </div>
    );
  }

  const submitterDisplay = currentItem
    ? (currentItem.submitterName ?? currentItem.submitterEmail ?? null)
    : null;

  return (
    <div className="flex flex-col gap-4" data-testid="intake-triage-mode">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex gap-1">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handlePrev}
              disabled={safeIndex === 0}
              aria-label="Previous item"
              className="h-8 w-8 p-0"
            >
              <ChevronUp className="h-4 w-4" />
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleNext}
              disabled={safeIndex >= total - 1}
              aria-label="Next item"
              className="h-8 w-8 p-0"
            >
              <ChevronDown className="h-4 w-4" />
            </Button>
          </div>
          <p className="text-xs text-muted-foreground tabular-nums">
            Item {safeIndex + 1} of {total}
          </p>
        </div>
        <Button type="button" variant="ghost" size="sm" onClick={onExit}>
          Exit triage
        </Button>
      </div>

      {currentItem ? (
        <>
          <div className={cn(PM_PANEL, "overflow-hidden")}>
            <div className="px-4 py-4">
              <div className="mb-2 flex flex-wrap items-start gap-2">
                <span className="text-base font-semibold">
                  {currentItem.title}
                </span>
                <Badge
                  variant={
                    STATUS_BADGE_VARIANT[currentItem.status] ?? "outline"
                  }
                  className="text-xs font-medium px-1.5 py-0.5 rounded-md"
                >
                  {currentItem.status.charAt(0).toUpperCase() +
                    currentItem.status.slice(1)}
                </Badge>
                {currentItem.requestType ? (
                  <Badge
                    variant="outline"
                    className="text-xs font-normal px-1.5 py-0.5 rounded-md"
                  >
                    {REQUEST_TYPE_LABEL[currentItem.requestType] ??
                      currentItem.requestType}
                  </Badge>
                ) : null}
                {currentItem.priority ? (
                  <PriorityBadge
                    priority={currentItem.priority}
                    showLabel
                    size="sm"
                  />
                ) : null}
              </div>
              {currentItem.description != null ? (
                <p className="text-sm text-muted-foreground mb-3">
                  {typeof currentItem.description === "string"
                    ? currentItem.description
                    : JSON.stringify(currentItem.description)}
                </p>
              ) : null}
              <p className="text-xs text-muted-foreground">
                {currentItem.createdAt
                  ? formatShortDate(currentItem.createdAt)
                  : ""}
                {submitterDisplay ? ` · ${submitterDisplay}` : ""}
              </p>
            </div>
          </div>

          <div className="flex gap-2">
            <Button
              type="button"
              size="sm"
              onClick={handleAccept}
              aria-label="Accept — move to work queue"
            >
              <Check className="h-4 w-4 mr-1" /> Accept
            </Button>
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={handleDecline}
              aria-label="Decline — remove from intake"
            >
              <X className="h-4 w-4 mr-1" /> Decline
            </Button>
            <Button
              type="button"
              size="sm"
              variant="ghost"
              onClick={handleDuplicate}
              aria-label="Link or mark as duplicate"
            >
              <Copy className="h-4 w-4 mr-1" /> Link / Duplicate
            </Button>
          </div>
        </>
      ) : null}
    </div>
  );
}
