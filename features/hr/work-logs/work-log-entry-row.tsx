"use client";

import { useState } from "react";
import { format, isWeekend } from "date-fns";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Loader2, Save, Check, XCircle, Link2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { WorkLogRejectDialog } from "./work-log-editor";

interface WorkLogEntryRowProps {
  date: Date;
  initialContent: string;
  onSave: (content: string) => void;
  isSaving: boolean;
  searchTerm: string;
  readOnly?: boolean;
  status?: string;
  showApprovalActions?: boolean;
  onApprove?: () => void;
  onReject?: (reason?: string) => void;
  isUpdatingStatus?: boolean;
}

export function WorkLogEntryRow({
  date,
  initialContent,
  onSave,
  isSaving,
  searchTerm,
  readOnly = false,
  status,
  showApprovalActions = false,
  onApprove,
  onReject,
  isUpdatingStatus = false,
}: WorkLogEntryRowProps) {
  const [content, setContent] = useState(initialContent);
  const [prevInitial, setPrevInitial] = useState(initialContent);
  const [isDirty, setIsDirty] = useState(false);
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false);

  if (initialContent !== prevInitial) {
    setPrevInitial(initialContent);
    if (!isDirty) {
      setContent(initialContent);
    }
  }

  const hasUnsavedChanges = content !== initialContent;

  const handleSave = () => {
    if (hasUnsavedChanges) {
      onSave(content);
      setIsDirty(false);
    }
  };

  const handleDiscard = () => {
    setContent(initialContent);
    setIsDirty(false);
  };

  const isWeekendDay = isWeekend(date);
  const dateLabel = format(date, "EEEE, MMMM d");
  const statusLabel = hasUnsavedChanges
    ? "Unsaved draft — click Save to submit"
    : content
      ? "Logged — entry saved"
      : "Empty — no entry yet";

  // Highlight matching text in description
  const highlightMatch = (text: string) => {
    if (!searchTerm.trim() || !text) return null;
    const term = searchTerm.trim();
    const splitRegex = new RegExp(`(${term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")})`, "gi");
    const testRegex = new RegExp(`^${term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`, "i");
    const parts = text.split(splitRegex);
    if (parts.length === 1) return null;
    return parts.map((part, i) =>
      testRegex.test(part) ? (
        <mark key={i} className="bg-yellow-200 dark:bg-yellow-800 rounded px-0.5">
          {part}
        </mark>
      ) : (
        <span key={i}>{part}</span>
      ),
    );
  };

  const highlighted = highlightMatch(content);

  return (
    <>
      <div
        title={statusLabel}
        className={cn(
          "flex flex-col sm:flex-row gap-3 sm:gap-4 p-3 sm:p-4 rounded-lg border shadow-sm hover:shadow-md transition-all",
          isWeekendDay ? "bg-gold/[0.03] dark:bg-gold/[0.05]" : "bg-card",
          hasUnsavedChanges
            ? "border-l-4 border-l-amber-500"
            : content
              ? "border-l-4 border-l-green-500"
              : "border-l-4 border-l-slate-200 dark:border-l-slate-700",
        )}
      >
        <div className="sm:w-32 md:w-36 flex-shrink-0 flex sm:flex-col items-center sm:items-start gap-1.5">
          <span className="font-bold text-lg sm:text-xl text-foreground leading-none">{format(date, "dd")}</span>
          <span className="text-muted-foreground text-xs font-medium">{format(date, "MMM, EEEE")}</span>
          <div className="flex items-center gap-1.5">
            {isWeekendDay && (
              <span className="text-[10px] bg-gold/10 dark:bg-gold/20 px-1.5 py-0.5 rounded font-medium text-gold inline-block">
                Weekend
              </span>
            )}
            {hasUnsavedChanges && (
              <span className="text-[10px] bg-amber-100 dark:bg-amber-900/30 px-1.5 py-0.5 rounded font-medium text-amber-700 dark:text-amber-400 inline-block">
                Draft
              </span>
            )}
            {status === "PENDING" && initialContent && (
              <span className="text-[10px] bg-amber-100 dark:bg-amber-900/30 px-1.5 py-0.5 rounded font-medium text-amber-700 dark:text-amber-400 inline-block">
                Pending
              </span>
            )}
            {status === "APPROVED" && (
              <span className="text-[10px] bg-green-100 dark:bg-green-900/30 px-1.5 py-0.5 rounded font-medium text-green-700 dark:text-green-400 inline-block">
                Approved
              </span>
            )}
            {status === "REJECTED" && (
              <span className="text-[10px] bg-red-100 dark:bg-red-900/30 px-1.5 py-0.5 rounded font-medium text-red-700 dark:text-red-400 inline-block">
                Rejected
              </span>
            )}
          </div>
        </div>

        <div className="flex-1 min-w-0 space-y-2">
          <Textarea
            value={content}
            onChange={(e) => {
              if (readOnly) return;
              setContent(e.target.value);
              setIsDirty(true);
            }}
            readOnly={readOnly}
            placeholder={isWeekendDay ? "Weekend..." : readOnly ? "No entry" : "What did you work on today?"}
            aria-label={`Work log for ${dateLabel}`}
            className={cn(
              "resize-none focus-visible:ring-1 focus-visible:ring-offset-0 text-sm",
              isWeekendDay && !content ? "min-h-[36px] opacity-50" : "min-h-[60px]",
              readOnly && "cursor-default opacity-75",
            )}
          />
          {/* Attachment link */}
          {!readOnly && (
            <div className="flex items-center gap-2">
              <Link2 className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
              <Input
                placeholder="Attachment link (optional) — paste URL to doc, sheet, or file"
                className="h-7 text-xs"
                type="url"
              />
            </div>
          )}
          {/* Highlighted search match preview */}
          {highlighted && !hasUnsavedChanges && (
            <p className="text-xs text-muted-foreground px-1 truncate">
              {highlighted}
            </p>
          )}
          {/* Approve / Reject buttons for admin viewing other's logs */}
          {showApprovalActions && (
            <div className="flex items-center gap-2">
              <Button
                size="sm"
                className="h-7 text-xs gap-1.5 bg-green-600 hover:bg-green-700 text-white"
                onClick={onApprove}
                disabled={isUpdatingStatus}
              >
                {isUpdatingStatus ? (
                  <Loader2 className="h-3 w-3 animate-spin" />
                ) : (
                  <Check className="h-3 w-3" />
                )}
                Approve
              </Button>
              <Button
                size="sm"
                variant="destructive"
                className="h-7 text-xs gap-1.5"
                onClick={() => setRejectDialogOpen(true)}
                disabled={isUpdatingStatus}
              >
                {isUpdatingStatus ? (
                  <Loader2 className="h-3 w-3 animate-spin" />
                ) : (
                  <XCircle className="h-3 w-3" />
                )}
                Reject
              </Button>
            </div>
          )}
          {/* Save / Discard buttons */}
          {hasUnsavedChanges && !readOnly && (
            <div className="flex items-center gap-2">
              <Button
                size="sm"
                className="h-7 text-xs gap-1.5"
                onClick={handleSave}
                disabled={isSaving}
              >
                {isSaving ? (
                  <Loader2 className="h-3 w-3 animate-spin" />
                ) : (
                  <Save className="h-3 w-3" />
                )}
                Save
              </Button>
              <Button
                size="sm"
                variant="ghost"
                className="h-7 text-xs text-muted-foreground"
                onClick={handleDiscard}
                disabled={isSaving}
              >
                Discard
              </Button>
            </div>
          )}
        </div>
      </div>

      <WorkLogRejectDialog
        open={rejectDialogOpen}
        onClose={() => setRejectDialogOpen(false)}
        onReject={(reason) => onReject?.(reason)}
      />
    </>
  );
}
