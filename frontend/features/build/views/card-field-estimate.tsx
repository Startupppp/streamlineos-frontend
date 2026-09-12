"use client";

import { useState, memo } from "react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { getErrorMessage } from "@/lib/get-error-message";
import { useUpdateTicket } from "@/hooks/api/build/tickets";
import { Gauge } from "lucide-react";
import { InlineFieldWrapper } from "./card-field-wrapper";

interface InlineEstimateProps {
  ticketId: number;
  projectId: number;
  currentPoints?: number | null;
}

export const InlineEstimate = memo(function InlineEstimate({
  ticketId,
  projectId,
  currentPoints,
}: InlineEstimateProps) {
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(
    currentPoints != null ? String(currentPoints) : "",
  );
  const updateTicket = useUpdateTicket(projectId, {
    onError: (e) => toast.error(getErrorMessage(e)),
  });

  function handleStartEdit() {
    setValue(currentPoints != null ? String(currentPoints) : "");
    setEditing(true);
  }

  function handleSubmit() {
    const trimmed = value.trim();
    const parsed = trimmed === "" ? null : parseInt(trimmed, 10);
    if (
      trimmed !== "" &&
      (Number.isNaN(parsed) || (parsed !== null && parsed < 0))
    ) {
      setEditing(false);
      return;
    }
    const next = parsed ?? undefined;
    const prev = currentPoints ?? undefined;
    if (next !== prev) {
      updateTicket.mutate({ ticketId, points: next });
    }
    setEditing(false);
  }

  function handleCancel() {
    setValue(currentPoints != null ? String(currentPoints) : "");
    setEditing(false);
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter") {
      e.preventDefault();
      handleSubmit();
    }
    if (e.key === "Escape") {
      e.preventDefault();
      handleCancel();
    }
  }

  function handleValueChange(e: React.ChangeEvent<HTMLInputElement>) {
    setValue(e.target.value);
  }

  function handleInputRef(el: HTMLInputElement | null) {
    el?.focus();
    el?.select();
  }

  const display = currentPoints != null && currentPoints > 0 ? currentPoints : null;

  if (editing) {
    return (
      <InlineFieldWrapper>
        <span className="inline-flex h-6 max-w-full items-center gap-1 rounded px-1">
          <Gauge className="h-3 w-3 shrink-0 text-foreground" />
          <Input
            ref={handleInputRef}
            type="number"
            min={0}
            inputMode="numeric"
            aria-label="Story points"
            value={value}
            onChange={handleValueChange}
            onBlur={handleSubmit}
            onKeyDown={handleKeyDown}
            className="h-6 w-12 border-border bg-background px-1.5 py-0 text-dense font-mono tabular-nums shadow-none"
          />
          <span className="shrink-0 text-micro font-mono text-muted-foreground">
            pts
          </span>
        </span>
      </InlineFieldWrapper>
    );
  }

  return (
    <InlineFieldWrapper>
      <button
        type="button"
        className="inline-flex items-center gap-1 rounded px-1 py-0.5 transition-colors hover:bg-muted/60"
        aria-label="Change estimate"
        onClick={handleStartEdit}
      >
        <Gauge
          className={cn(
            "h-3 w-3 shrink-0",
            display != null ? "text-foreground" : "text-muted-foreground",
          )}
        />
        <span
          className={cn(
            "font-mono text-micro",
            display != null ? "text-foreground" : "text-muted-foreground",
          )}
        >
          {display != null ? `${display} pts` : "pts"}
        </span>
      </button>
    </InlineFieldWrapper>
  );
});
