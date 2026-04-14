"use client";

import { useState } from "react";
import { format, isWeekend } from "date-fns";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Loader2, Save, Link2, ExternalLink, Ticket } from "lucide-react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";

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
    if (hasUnsavedChanges) {
      onSave(content, workLink);
      setIsDirty(false);
    }
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
          {!hasUnsavedChanges && initialContent && (
            <span className="text-[10px] bg-green-100 dark:bg-green-900/30 px-1.5 py-0.5 rounded font-medium text-green-700 dark:text-green-400 inline-block">
              Saved
            </span>
          )}
        </div>
      </div>

      <div className="flex-1 min-w-0 space-y-2">
        {ticket && (
          <div className="flex items-center gap-2 flex-wrap">
            <Badge variant="outline" className="flex items-center gap-1.5 text-xs font-mono px-2 py-0.5 border-blue-300 text-blue-700 dark:border-blue-700 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/30">
              <Ticket className="h-3 w-3" />
              #{ticket.ticketNumber}
            </Badge>
            <span className="text-sm font-medium text-foreground truncate">{ticket.title}</span>
            {ticket.project && (
              <span className="text-xs text-muted-foreground">— {ticket.project.name}</span>
            )}
          </div>
        )}

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

        {/* Link field — editable for own logs, display-only for readOnly */}
        {!readOnly && (
          <div className="flex items-center gap-2">
            <Link2 className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
            <Input
              placeholder="Link (optional) — paste URL to doc, PR, sheet, or file"
              className="h-7 text-xs"
              type="url"
              value={workLink}
              onChange={(e) => {
                setWorkLink(e.target.value);
                setIsDirty(true);
              }}
            />
          </div>
        )}

        {/* Show link in read-only mode */}
        {readOnly && initialWorkLink && (
          <a
            href={initialWorkLink}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 text-xs text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300"
          >
            <ExternalLink className="h-3 w-3" />
            {initialWorkLink}
          </a>
        )}

        {highlighted && !hasUnsavedChanges && (
          <p className="text-xs text-muted-foreground px-1 truncate">
            {highlighted}
          </p>
        )}

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
  );
}
