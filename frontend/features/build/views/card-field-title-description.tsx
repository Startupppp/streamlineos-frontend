"use client";

import { useState, memo } from "react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { LoadingButton } from "@/components/ui/loading-button";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { getErrorMessage } from "@/lib/get-error-message";
import { useUpdateTicket } from "@/hooks/api/build/tickets";
import { InlineFieldWrapper } from "./card-field-wrapper";

interface InlineTitleProps {
  ticketId: number;
  projectId: number;
  currentTitle: string;
  className?: string;
}

export const InlineTitle = memo(function InlineTitle({
  ticketId,
  projectId,
  currentTitle,
  className,
}: InlineTitleProps) {
  const [open, setOpen] = useState(false);
  const [value, setValue] = useState(currentTitle);
  const updateTicket = useUpdateTicket(projectId, {
    onError: (e) => toast.error(getErrorMessage(e)),
  });

  function handleOpen(next: boolean) {
    if (next) setValue(currentTitle);
    setOpen(next);
  }

  function handleSave() {
    const trimmed = value.trim();
    if (trimmed.length < 1 || trimmed === currentTitle) {
      setOpen(false);
      return;
    }
    updateTicket.mutate(
      { ticketId, title: trimmed },
      { onSuccess: () => setOpen(false) },
    );
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter") handleSave();
    if (e.key === "Escape") setOpen(false);
  }

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    setValue(e.target.value);
  }

  return (
    <InlineFieldWrapper>
      <Popover open={open} onOpenChange={handleOpen}>
        <PopoverTrigger asChild>
          <button
            type="button"
            className={cn(
              "min-w-0 max-w-full truncate text-left text-sm font-semibold transition-colors hover:text-primary [overflow-wrap:anywhere]",
              className,
            )}
            aria-label="Edit title"
            title={currentTitle}
          >
            {currentTitle}
          </button>
        </PopoverTrigger>
        <PopoverContent
          className="p-2 min-w-[var(--radix-popover-trigger-width)]"
          align="start"
        >
          <Input
            autoFocus
            value={value}
            onChange={handleChange}
            onKeyDown={handleKeyDown}
            className="text-sm"
            placeholder="Title"
          />
          <LoadingButton
            size="sm"
            className="mt-2 w-full"
            isPending={updateTicket.isPending}
            loadingText="Saving…"
            onClick={handleSave}
            disabled={value.trim().length < 1}
          >
            Save
          </LoadingButton>
        </PopoverContent>
      </Popover>
    </InlineFieldWrapper>
  );
});

interface InlineDescriptionProps {
  ticketId: number;
  projectId: number;
  currentDescription: string | null;
}

export const InlineDescription = memo(function InlineDescription({
  ticketId,
  projectId,
  currentDescription,
}: InlineDescriptionProps) {
  const [open, setOpen] = useState(false);
  const [value, setValue] = useState(currentDescription ?? "");
  const updateTicket = useUpdateTicket(projectId, {
    onError: (e) => toast.error(getErrorMessage(e)),
  });

  function handleOpen(next: boolean) {
    if (next) setValue(currentDescription ?? "");
    setOpen(next);
  }

  function handleSave() {
    const trimmed = value.trim();
    if (trimmed === (currentDescription ?? "")) {
      setOpen(false);
      return;
    }
    updateTicket.mutate(
      { ticketId, description: trimmed || undefined },
      { onSuccess: () => setOpen(false) },
    );
  }

  function handleChange(e: React.ChangeEvent<HTMLTextAreaElement>) {
    setValue(e.target.value);
  }

  const preview = currentDescription?.trim();

  return (
    <InlineFieldWrapper>
      <Popover open={open} onOpenChange={handleOpen}>
        <PopoverTrigger asChild>
          <button
            type="button"
            className={cn(
              "line-clamp-1 text-left text-xs transition-colors",
              preview
                ? "text-muted-foreground hover:text-foreground"
                : "text-muted-foreground hover:text-muted-foreground",
            )}
            aria-label="Edit description"
          >
            {preview || "Add description…"}
          </button>
        </PopoverTrigger>
        <PopoverContent
          className="p-2 min-w-[var(--radix-popover-trigger-width)]"
          align="start"
        >
          <Textarea
            autoFocus
            value={value}
            onChange={handleChange}
            placeholder="Description"
            className="min-h-[72px] resize-none text-xs"
            rows={3}
          />
          <LoadingButton
            size="sm"
            className="mt-2 w-full"
            isPending={updateTicket.isPending}
            loadingText="Saving…"
            onClick={handleSave}
          >
            Save
          </LoadingButton>
        </PopoverContent>
      </Popover>
    </InlineFieldWrapper>
  );
});
