"use client";

import { useState } from "react";
import { format, isWeekend, isToday as isDateToday } from "date-fns";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Loader2, Save, Link2, ExternalLink, Ticket, Plus, X } from "lucide-react";
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
  lockedSaved?: boolean;
  status?: string;
}

const MAX_LINKS = 5;

const statusPillClass: Record<string, string> = {
  APPROVED:
    "bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-800",
  PENDING:
    "bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-400 dark:border-amber-800",
  REJECTED:
    "bg-rose-100 text-rose-700 border-rose-200 dark:bg-rose-950/40 dark:text-rose-400 dark:border-rose-800",
};

function parseLinks(raw: string | undefined): string[] {
  if (!raw?.trim()) return [""];
  const links = raw
    .split(/\n+/)
    .map((l) => l.trim())
    .filter(Boolean);
  return links.length > 0 ? links : [""];
}

function serializeLinks(links: string[]): string {
  return links
    .map((l) => l.trim())
    .filter(Boolean)
    .join("\n");
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
  lockedSaved = false,
  status,
}: WorkLogEntryRowProps) {
  const [content, setContent] = useState(initialContent);
  const [links, setLinks] = useState<string[]>(() => parseLinks(initialWorkLink));
  const [prevInitial, setPrevInitial] = useState(initialContent);
  const [prevInitialLink, setPrevInitialLink] = useState(initialWorkLink);
  const [isDirty, setIsDirty] = useState(false);
  const [linkError, setLinkError] = useState("");
  const [expanded, setExpanded] = useState(
    Boolean(initialContent) || Boolean(initialWorkLink.trim()),
  );

  if (initialContent !== prevInitial) {
    setPrevInitial(initialContent);
    if (!isDirty) setContent(initialContent);
  }
  if (initialWorkLink !== prevInitialLink) {
    setPrevInitialLink(initialWorkLink);
    if (!isDirty) setLinks(parseLinks(initialWorkLink));
  }

  const serializedLinks = serializeLinks(links);
  const initialSerialized = serializeLinks(parseLinks(initialWorkLink));
  const hasUnsavedChanges = content !== initialContent || serializedLinks !== initialSerialized;
  const isWeekendDay = isWeekend(date);
  const today = isDateToday(date);
  const dateLabel = format(date, "EEEE, MMMM d");
  const isEmpty = !content && !hasUnsavedChanges;
  const showEditor =
    expanded ||
    hasUnsavedChanges ||
    Boolean(content) ||
    Boolean(ticket) ||
    lockedSaved;

  const handleSave = () => {
    if (!hasUnsavedChanges) return;
    const trimmed = links.map((l) => l.trim()).filter(Boolean);
    for (const link of trimmed) {
      try {
        new URL(link);
      } catch {
        setLinkError(`Invalid URL: ${link}`);
        return;
      }
    }
    setLinkError("");
    onSave(content, serializeLinks(trimmed));
    setIsDirty(false);
  };

  const handleDiscard = () => {
    setContent(initialContent);
    setLinks(parseLinks(initialWorkLink));
    setLinkError("");
    setIsDirty(false);
    if (!initialContent && !initialWorkLink.trim()) setExpanded(false);
  };

  function updateLink(index: number, value: string) {
    setLinks((prev) => prev.map((l, i) => (i === index ? value : l)));
    setIsDirty(true);
    if (linkError) setLinkError("");
  }

  function addLink() {
    if (links.length >= MAX_LINKS) return;
    setLinks((prev) => [...prev, ""]);
    setIsDirty(true);
  }

  function removeLink(index: number) {
    setLinks((prev) => {
      const next = prev.filter((_, i) => i !== index);
      return next.length > 0 ? next : [""];
    });
    setIsDirty(true);
    if (linkError) setLinkError("");
  }

  const highlightMatch = (text: string) => {
    if (!searchTerm.trim() || !text) return null;
    const term = searchTerm.trim();
    const splitRegex = new RegExp(`(${term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")})`, "gi");
    const testRegex = new RegExp(`^${term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`, "i");
    const parts = text.split(splitRegex);
    if (parts.length === 1) return null;
    return parts.map((part, i) =>
      testRegex.test(part) ? (
        <mark key={i} className="rounded bg-yellow-200 px-0.5 dark:bg-yellow-800">
          {part}
        </mark>
      ) : (
        <span key={i}>{part}</span>
      ),
    );
  };

  const highlighted = highlightMatch(content);
  const savedLinks = parseLinks(initialWorkLink).filter(Boolean);

  return (
    <div
      className={cn(
        "group relative overflow-hidden rounded-xl border transition-colors duration-150",
        today && "ring-1 ring-primary/30",
        isWeekendDay
          ? "border-border/50 bg-muted/20"
          : "border-border/70 bg-card hover:border-border",
        hasUnsavedChanges
          ? "border-l-[3px] border-l-amber-500"
          : content
            ? "border-l-[3px] border-l-emerald-500"
            : "border-l-[3px] border-l-transparent",
      )}
    >
      <div className="flex items-stretch gap-0">
        <div
          className={cn(
            "flex w-[4.5rem] shrink-0 flex-col items-center justify-center gap-0.5 border-r border-border/50 px-2 py-2.5 sm:w-20",
            isWeekendDay && "bg-muted/30",
            today && "bg-primary/5",
          )}
        >
          <span
            className={cn(
              "text-xl font-bold tabular-nums leading-none sm:text-2xl",
              today
                ? "text-primary"
                : isWeekendDay
                  ? "text-muted-foreground"
                  : "text-foreground",
            )}
          >
            {format(date, "dd")}
          </span>
          <span className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
            {format(date, "EEE")}
          </span>
          {today && (
            <span className="mt-0.5 rounded bg-primary/10 px-1.5 py-px text-[9px] font-bold uppercase tracking-wide text-primary">
              Today
            </span>
          )}
          {isWeekendDay && !today && (
            <span className="mt-0.5 text-[9px] font-semibold uppercase tracking-wide text-muted-foreground/80">
              Wknd
            </span>
          )}
        </div>

        <div className="min-w-0 flex-1 px-3 py-2 sm:px-3.5 sm:py-2.5">
          {ticket && (
            <div className="mb-1.5 flex flex-wrap items-center gap-1.5">
              <span className="inline-flex items-center gap-1 rounded-md border border-primary/30 bg-primary/10 px-1.5 py-0.5 font-mono text-[10px] font-semibold text-primary">
                <Ticket className="h-3 w-3" />
                #{ticket.ticketNumber}
              </span>
              {ticket.project && (
                <span className="rounded-md border border-border bg-muted/50 px-1.5 py-0.5 text-[10px] font-semibold text-muted-foreground">
                  {ticket.project.key}
                </span>
              )}
              <TruncatedText text={ticket.title} className="text-xs font-medium text-foreground" />
            </div>
          )}

          {!showEditor ? (
            <button
              type="button"
              disabled={readOnly}
              onClick={() => {
                if (!readOnly) setExpanded(true);
              }}
              className={cn(
                "flex w-full items-center justify-between gap-2 rounded-lg border border-dashed px-3 py-2 text-left text-sm transition-colors",
                readOnly
                  ? "cursor-default border-transparent bg-transparent text-muted-foreground"
                  : "border-border/70 bg-muted/20 text-muted-foreground hover:border-primary/40 hover:bg-muted/40 hover:text-foreground",
                isEmpty && isWeekendDay && "opacity-60",
              )}
            >
              <span>
                {readOnly
                  ? isWeekendDay
                    ? "Weekend — no entry"
                    : "No entry"
                  : isWeekendDay
                    ? "Optional weekend note…"
                    : "Add today’s work log…"}
              </span>
              <div className="flex items-center gap-1.5">
                {status && (
                  <span
                    className={cn(
                      "rounded-full border px-1.5 py-px text-[9px] font-semibold uppercase",
                      statusPillClass[status] ??
                        "border-border bg-muted text-muted-foreground",
                    )}
                  >
                    {status}
                  </span>
                )}
                {!readOnly && (
                  <span className="text-[10px] font-semibold uppercase tracking-wide text-primary/70 opacity-0 transition-opacity group-hover:opacity-100">
                    Write
                  </span>
                )}
              </div>
            </button>
          ) : (
            <div className="space-y-2">
              {lockedSaved && (
                <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-300">
                  This log is saved and locked. Ask HR or a manager with attendance access to edit it.
                </div>
              )}
              <div className="flex items-start gap-2">
                <Textarea
                  value={content}
                  onChange={(e) => {
                    if (readOnly) return;
                    setContent(e.target.value);
                    setIsDirty(true);
                  }}
                  autoFocus={!readOnly && !initialContent}
                  readOnly={readOnly}
                  maxLength={2000}
                  placeholder={
                    isWeekendDay
                      ? "Optional weekend note…"
                      : readOnly
                        ? "No entry"
                        : "What did you work on today?"
                  }
                  aria-label={`Work log for ${dateLabel}`}
                  className={cn(
                    "min-h-[52px] resize-none text-sm focus-visible:ring-1 focus-visible:ring-offset-0",
                    readOnly && "cursor-default opacity-80",
                  )}
                />
                {!hasUnsavedChanges && content && (
                  <span className="mt-1.5 shrink-0 font-mono text-[11px] font-semibold tabular-nums text-muted-foreground">
                    8h
                  </span>
                )}
              </div>

              {!readOnly && (
                <div className="space-y-1.5">
                  {links.map((link, index) => (
                    <div key={index} className="flex items-center gap-2">
                      <Link2 className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                      <Input
                        placeholder={
                          index === 0
                            ? "Optional link — PR, doc, or ticket URL"
                            : `Link ${index + 1}`
                        }
                        className={cn(
                          "h-8 text-xs",
                          linkError && "border-destructive focus-visible:ring-destructive",
                        )}
                        type="url"
                        value={link}
                        onChange={(e) => updateLink(index, e.target.value)}
                      />
                      {(links.length > 1 || link.trim()) && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 shrink-0 text-muted-foreground hover:text-destructive"
                          onClick={() => removeLink(index)}
                          aria-label={`Remove link ${index + 1}`}
                        >
                          <X className="h-3.5 w-3.5" />
                        </Button>
                      )}
                    </div>
                  ))}
                  {links.length < MAX_LINKS && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="h-7 gap-1 px-2 text-xs text-muted-foreground"
                      onClick={addLink}
                    >
                      <Plus className="h-3 w-3" />
                      Add link
                    </Button>
                  )}
                  {linkError && (
                    <p className="pl-5 text-xs text-destructive">{linkError}</p>
                  )}
                </div>
              )}

              {readOnly && savedLinks.length > 0 && (
                <div className="flex flex-col gap-1">
                  {savedLinks.map((link) => (
                    <a
                      key={link}
                      href={link}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex max-w-full items-center gap-1.5 text-xs text-primary transition-colors hover:text-primary/80"
                    >
                      <ExternalLink className="h-3 w-3 shrink-0" />
                      <TruncatedText text={link} className="max-w-md text-xs" />
                    </a>
                  ))}
                </div>
              )}

              {highlighted && !hasUnsavedChanges && (
                <span className="line-clamp-2 px-0.5 text-xs text-muted-foreground" title={content}>
                  {highlighted}
                </span>
              )}

              <div className="flex items-center gap-2">
                {hasUnsavedChanges && !readOnly && (
                  <>
                    <Button
                      size="sm"
                      className="h-7 gap-1.5 text-xs"
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
                  </>
                )}
                {!hasUnsavedChanges && !readOnly && !content && (
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-7 text-xs text-muted-foreground"
                    onClick={() => setExpanded(false)}
                  >
                    Collapse
                  </Button>
                )}
                {status && !hasUnsavedChanges && (
                  <span
                    className={cn(
                      "ml-auto rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase",
                      statusPillClass[status] ??
                        "border-border bg-muted text-muted-foreground",
                    )}
                  >
                    {status}
                  </span>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
