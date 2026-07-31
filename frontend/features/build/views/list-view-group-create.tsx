"use client";

import { useState } from "react";
import { Input } from "@/components/ui/input";
import { useAnimatedIcon } from "@/hooks/common/use-animated-icon";
import { PlusIcon, XIcon } from "@animateicons/react/lucide";
import { useCreateTicket } from "@/hooks/api";
import { getErrorMessage } from "@/lib/get-error-message";
import { toast } from "sonner";
import type { InlineGroupCreateProps } from "./list-view-shared";

export function InlineGroupCreate({ groupKey, projectId, status }: InlineGroupCreateProps) {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const { iconRef: plusIconRef, hoverHandlers: plusHoverHandlers } = useAnimatedIcon();
  const { iconRef: cancelIconRef, hoverHandlers: cancelHoverHandlers } = useAnimatedIcon();
  const createTicket = useCreateTicket({
    onSuccess: () => { setTitle(""); setOpen(false); },
    onError: (e) => toast.error(getErrorMessage(e)),
  });

  function handleOpenCreate() { setOpen(true); }
  function handleCancel() { setOpen(false); setTitle(""); }

  function handleTitleChange(e: React.ChangeEvent<HTMLInputElement>) {
    setTitle(e.target.value);
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter" && title.trim()) {
      createTicket.mutate({ projectId, title: title.trim(), status, type: "TASK" });
    }
    if (e.key === "Escape") handleCancel();
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={handleOpenCreate}
        className="flex h-6 w-6 items-center justify-center rounded hover:bg-muted/60 transition-colors text-muted-foreground hover:text-foreground"
        aria-label={`Add ticket to ${groupKey}`}
        {...plusHoverHandlers}
      >
        <PlusIcon ref={plusIconRef} size={14} />
      </button>
    );
  }

  return (
    <div className="flex items-center gap-1.5 border-t border-border px-3 py-1.5">
      <Input
        autoFocus
        value={title}
        onChange={handleTitleChange}
        onKeyDown={handleKeyDown}
        placeholder="New ticket title... (Enter to create)"
        className="flex-1 text-xs"
        disabled={createTicket.isPending}
      />
      <button
        type="button"
        onClick={handleCancel}
        className="flex h-6 w-6 items-center justify-center rounded text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-colors"
        aria-label="Cancel"
        {...cancelHoverHandlers}
      >
        <XIcon ref={cancelIconRef} size={14} />
      </button>
    </div>
  );
}
