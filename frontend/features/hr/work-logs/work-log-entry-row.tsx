"use client";

import { useState } from "react";
import { format, isWeekend } from "date-fns";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Loader2, Save, Link2, ExternalLink, Ticket } from "lucide-react";
import { cn } from "@/lib/utils";
import { TruncatedText } from "@/components/ui/truncated-text";
interface WorkLogEntryRowProps {
  date: Date;
  initialContent: string;
  initialWorkLink?: string;
  ticket?: {
    id: number;
    title: string;
    ticketNumber: number;
    project?: { id: number; name: string; key: string } | null;
  } | null;
  onSave: (content: string, workLink: string) => void;
  isSaving: boolean;
  searchTerm: string;
  readOnly?: boolean;
  status?: string;
}

const statusPillClass: Record<string, string> = {
  APPROVED: "bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-800",
  PENDING: "bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-400 dark:border-amber-800",
  REJECTED: "bg-rose-100 text-rose-700 border-rose-200 dark:bg-rose-950/40 dark:text-rose-400 dark:border-rose-800",
};

export function WorkLogEntryRow({
  date,
  initialContent,
  initialWorkLink = "",
  ticket,
  onSave,
  isSaving,
  searchTerm,
  readOnly = false,
  status,
}: WorkLogEntryRowProps) {
  const [content, setContent] = useState(initialContent);
  const [workLink, setWorkLink] = useState(initialWorkLink);
  const [prevInitial, setPrevInitial] = useState(initialContent);
  const [prevInitialLink, setPrevInitialLink] = useState(initialWorkLink);
  const [isDirty, setIsDirty] = useState(false);
  const [linkError, setLinkError] = useState("");

  if (initialContent !== prevInitial) {
    setPrevInitial(initialContent);
    if (!isDirty) setContent(initialContent);
  }
  if (initialWorkLink !== prevInitialLink) {
    setPrevInitialLink(initialWorkLink);
    if (!isDirty) setWorkLink(initialWorkLink);
  }

  const hasUnsavedChanges = content !== initialContent || workLink !== initialWorkLink;

  const handleSave = () => {
    if (!hasUnsavedChanges) return;
    if (workLink.trim()) {
      try {
        new URL(workLink.trim());
        setLinkError("");
      } catch {
        setLinkError("Invalid URL. Please enter a valid link (e.g. https://example.com)");
        return;
      }
    } else {
      setLinkError("");
    }
    onSave(content, workLink);
    setIsDirty(false);
  };

  const handleDiscard = () => {
    setContent(initialContent);
    setWorkLink(initialWorkLink);
    setIsDirty(false);
  };

  const isWeekendDay = isWeekend(date);
  const dateLabel = format(date, "EEEE, MMMM d");
  const statusLabel = hasUnsavedChanges
    ? "Unsaved — click Save"
    : content
      ? "Saved"
      : "Empty — no entry yet";

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
    <div
      title={statusLabel}
      className={cn(
        "flex flex-col sm:flex-row rounded-2xl border border-border/70 bg-card/90 backdrop-blur-sm shadow-[0_1px_2px_rgba(15,23,42,0.04),0_12px_32px_-14px_rgba(15,23,42,0.12)] overflow-hidden hover:shadow-md transition-shadow duration-200",
        isWeekendDay ? "bg-blue-500/[0.02] dark:bg-blue-500/[0.04]" : "bg-card",
        hasUnsavedChanges
          ? "border-l-4 border-l-amber-500"
          : content
            ? "border-l-4 border-l-emerald-500"
            : "border-l-4 border-l-border",
      )}
    >
      <div className="sm:w-28 md:w-32 flex-shrink-0 flex sm:flex-col items-start gap-1.5 p-3 sm:p-4 border-b sm:border-b-0 sm:border-r border-border/60">
        <div className="flex sm:flex-col items-baseline sm:items-start gap-2 sm:gap-0.5">
          <span
            className={cn(
              "font-bold text-2xl sm:text-3xl tabular-nums leading-none",
              isWeekendDay ? "text-blue-600 dark:text-blue-400" : "text-foreground",
            )}
          >
            {format(date, "dd")}
          </span>
          <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
            {format(date, "MMM, EEE")}
          </span>
        </div>
        <div className="flex flex-wrap gap-1 mt-0.5">
          {isWeekendDay && (
            <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full border bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-950/40 dark:text-blue-400 dark:border-blue-800">
              Weekend
            </span>
          )}
          {hasUnsavedChanges && (
            <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full border bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-400 dark:border-amber-800">
              Draft
            </span>
          )}
          {!hasUnsavedChanges && initialContent && (
            <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full border bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-800">
              Saved
            </span>
          )}
          {status && !hasUnsavedChanges && (
            <span
              className={cn(
                "inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full border",
                statusPillClass[status] ??
                  "bg-muted text-muted-foreground border-border dark:bg-slate-900/40 dark:text-slate-400 dark:border-slate-700",
              )}
            >
              {status}
            </span>
          )}
        </div>
      </div>

      <div className="flex-1 min-w-0 space-y-2 p-3 sm:p-4">
        {ticket && (
          <div className="flex items-center gap-2 flex-wrap">
            <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full border bg-primary/10 text-primary border-primary/30 font-mono">
              <Ticket className="h-3 w-3" />
              #{ticket.ticketNumber}
            </span>
            {ticket.project && (
              <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full border bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-950/40 dark:text-blue-400 dark:border-blue-800">
                {ticket.project.key}
              </span>
            )}
            <TruncatedText text={ticket.title} className="text-sm font-medium text-foreground" />
            {ticket.project && (
              <span className="text-xs text-muted-foreground">— {ticket.project.name}</span>
            )}
          </div>
        )}

        <div className="flex items-start gap-2">
          <div className="flex-1 min-w-0">
            <Textarea
              value={content}
              onChange={(e) => {
                if (readOnly) return;
                setContent(e.target.value);
                setIsDirty(true);
              }}
              readOnly={readOnly}
              maxLength={2000}
              placeholder={isWeekendDay ? "Weekend..." : readOnly ? "No entry" : "What did you work on today?"}
              aria-label={`Work log for ${dateLabel}`}
              className={cn(
                "resize-none focus-visible:ring-1 focus-visible:ring-offset-0 text-sm",
                isWeekendDay && !content ? "min-h-[36px] opacity-50" : "min-h-[60px]",
                readOnly && "cursor-default opacity-75",
              )}
            />
          </div>
          {!hasUnsavedChanges && content && (
            <span className="font-mono text-[11px] font-semibold text-muted-foreground tabular-nums mt-2 shrink-0">
              8h
            </span>
          )}
        </div>

        {!readOnly && (
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <Link2 className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
              <Input
                placeholder="Link (optional) — paste URL to doc, PR, sheet, or file"
                className={cn("text-xs", linkError && "border-destructive focus-visible:ring-destructive")}
                type="url"
                value={workLink}
                onChange={(e) => {
                  setWorkLink(e.target.value);
                  setIsDirty(true);
                  if (linkError) setLinkError("");
                }}
              />
            </div>
            {linkError && <p className="text-xs text-destructive pl-5">{linkError}</p>}
          </div>
        )}

        {readOnly && initialWorkLink && (
          <a
            href={initialWorkLink}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 text-xs text-primary hover:text-primary/80 transition-colors duration-200"
          >
            <ExternalLink className="h-3 w-3" />
            {initialWorkLink}
          </a>
        )}

        {highlighted && !hasUnsavedChanges && (
          <span className="line-clamp-2 text-xs text-muted-foreground px-1" title={content}>
            {highlighted}
          </span>
        )}

        {hasUnsavedChanges && !readOnly && (
          <div className="flex items-center gap-2">
            <Button size="sm" className="text-xs gap-1.5" onClick={handleSave} disabled={isSaving}>
              {isSaving ? <Loader2 className="h-3 w-3 animate-spin" /> : <Save className="h-3 w-3" />}
              Save
            </Button>
            <Button
              size="sm"
              variant="ghost"
              className="text-xs text-muted-foreground"
              onClick={handleDiscard}
              disabled={isSaving}
            >
              Discard
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
