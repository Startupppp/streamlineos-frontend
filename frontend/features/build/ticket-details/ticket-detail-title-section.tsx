"use client";

import { useState, useRef, useEffect } from "react";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { TICKET_TITLE_MAX } from "@/lib/validation/projects";

interface TicketDetailTitleSectionProps {
  ticketId: number;
  localTitle: string;
  canUpdate: boolean;
  isPreview: boolean;
  onTitleChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => void;
  onCommitTitle: (nextTitle: string) => string | null;
  onRevertTitle: () => void;
}

export function TicketDetailTitleSection({
  ticketId,
  localTitle,
  canUpdate,
  isPreview,
  onTitleChange,
  onCommitTitle,
  onRevertTitle,
}: TicketDetailTitleSectionProps) {
  const [editingTitle, setEditingTitle] = useState(false);
  const [titleError, setTitleError] = useState<string | null>(null);
  const skipTitleBlurRef = useRef(false);
  const titleInputRef = useRef<HTMLTextAreaElement | null>(null);
  const titleAtEditStartRef = useRef(localTitle);

  useEffect(() => {
    if (!editingTitle) return;
    const id = requestAnimationFrame(() => {
      const el = titleInputRef.current;
      if (!el) return;
      el.focus({ preventScroll: true });
      const end = el.value.length;
      el.setSelectionRange(end, end);
    });
    return () => cancelAnimationFrame(id);
  }, [editingTitle]);

  useEffect(() => {
    if (!editingTitle) return;
    function handleBeforeUnload(e: BeforeUnloadEvent) {
      if (localTitle !== titleAtEditStartRef.current) {
        e.preventDefault();
      }
    }
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [editingTitle, localTitle]);

  function finishTitleEdit(commit: boolean) {
    if (commit) {
      const error = onCommitTitle(localTitle);
      if (error) {
        setTitleError(error);
        return;
      }
    } else {
      skipTitleBlurRef.current = true;
      onRevertTitle();
    }
    setTitleError(null);
    setEditingTitle(false);
  }

  function handleTitleKeyDown(event: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === "Escape") {
      event.preventDefault();
      finishTitleEdit(false);
      return;
    }
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      finishTitleEdit(true);
    }
  }

  return (
    <>
      {canUpdate && editingTitle && !isPreview ? (
        <div className="flex justify-start">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-8 px-2 text-xs text-muted-foreground hover:bg-transparent hover:text-foreground"
            aria-expanded={editingTitle}
            aria-controls={`ticket-title-${ticketId}`}
            onMouseDown={() => {
              skipTitleBlurRef.current = true;
            }}
            onClick={() => finishTitleEdit(true)}
          >
            Done editing
          </Button>
        </div>
      ) : null}
      {editingTitle && canUpdate ? (
        <div className="flex min-w-0 flex-col gap-2">
          <label htmlFor={`ticket-title-${ticketId}`} className="sr-only">
            Title
          </label>
          <Textarea
            id={`ticket-title-${ticketId}`}
            ref={titleInputRef}
            value={localTitle}
            onChange={(event) => {
              setTitleError(null);
              onTitleChange(event);
            }}
            rows={2}
            maxLength={TICKET_TITLE_MAX}
            aria-invalid={titleError ? true : undefined}
            aria-describedby={
              titleError ? `ticket-title-error-${ticketId}` : undefined
            }
            className="h-auto min-h-12 w-full max-w-full resize-none break-words rounded-md border-border bg-card px-3 py-2 text-base font-medium leading-snug shadow-none transition-colors duration-200 [overflow-wrap:anywhere] [word-break:break-word] hover:border-foreground/30 focus-visible:ring-1"
            placeholder="Ticket title"
            onKeyDown={handleTitleKeyDown}
            onBlur={(event) => {
              if (skipTitleBlurRef.current) {
                skipTitleBlurRef.current = false;
                return;
              }
              const next = event.relatedTarget;
              if (
                next instanceof Node &&
                event.currentTarget.parentElement?.contains(next)
              ) {
                return;
              }
              if (localTitle === titleAtEditStartRef.current) {
                setEditingTitle(false);
                setTitleError(null);
                return;
              }
              finishTitleEdit(true);
            }}
          />
          {titleError ? (
            <p
              id={`ticket-title-error-${ticketId}`}
              className="text-xs text-status-danger-ink"
              role="alert"
            >
              {titleError}
            </p>
          ) : null}
        </div>
      ) : canUpdate ? (
        <button
          type="button"
          className="group min-w-0 text-left"
          aria-label="Edit title"
          onClick={() => {
            titleAtEditStartRef.current = localTitle;
            setEditingTitle(true);
          }}
        >
          <h2 className="break-words text-xl font-semibold leading-snug text-foreground [overflow-wrap:anywhere] group-hover:text-foreground/90">
            {localTitle || "Untitled"}
          </h2>
        </button>
      ) : (
        <h2 className="break-words text-xl font-semibold leading-snug text-foreground [overflow-wrap:anywhere]">
          {localTitle || "Untitled"}
        </h2>
      )}
    </>
  );
}
