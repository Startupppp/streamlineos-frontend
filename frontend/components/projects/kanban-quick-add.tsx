"use client";

import { useState, useRef, useCallback } from "react";
import { Input } from "@/components/ui/input";
import { Plus } from "lucide-react";
import { useCreateTicket } from "@/lib/api/hooks";
import { queryKeys } from "@/lib/query-keys";
import { toast } from "sonner";
import { getErrorMessage } from "@/lib/get-error-message";
import { useQueryClient } from "@tanstack/react-query";

type TicketStatus = "TODO" | "IN_PROGRESS" | "IN_REVIEW" | "DONE";

export function QuickAddInput({ columnId, projectId }: { columnId: string; projectId: number }) {
  const [value, setValue] = useState("");
  const [isAdding, setIsAdding] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const queryClient = useQueryClient();

  const createTicket = useCreateTicket({
    onSuccess: () => {
      setValue("");
      setIsAdding(false);
      queryClient.invalidateQueries({ queryKey: queryKeys.projects.detail(projectId) });
    },
    onError: (error) => {
      toast.error(getErrorMessage(error));
    },
  });

  const handleSubmit = useCallback(() => {
    if (!value.trim()) return;
    createTicket.mutate({
      projectId,
      title: value.trim(),
      type: "TASK",
      status: columnId as TicketStatus,
    });
  }, [value, projectId, columnId, createTicket]);

  const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setValue(e.target.value);
  }, []);

  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") handleSubmit();
    if (e.key === "Escape") { setIsAdding(false); setValue(""); }
  }, [handleSubmit]);

  const handleBlur = useCallback(() => {
    if (!value.trim()) { setIsAdding(false); setValue(""); }
  }, [value]);

  const handleAddClick = useCallback(() => {
    setIsAdding(true);
    setTimeout(() => inputRef.current?.focus(), 50);
  }, []);

  if (!isAdding) {
    return (
      <button
        onClick={handleAddClick}
        className="flex items-center gap-1.5 w-full p-2 text-xs text-muted-foreground hover:text-foreground hover:bg-muted/50 rounded-lg transition-colors"
      >
        <Plus className="h-3.5 w-3.5" />
        Add ticket
      </button>
    );
  }

  return (
    <div className="p-1.5">
      <Input
        ref={inputRef}
        value={value}
        onChange={handleChange}
        placeholder="Ticket title..."
        className="h-8 text-sm capitalize"
        onKeyDown={handleKeyDown}
        onBlur={handleBlur}
        disabled={createTicket.isPending}
      />
    </div>
  );
}
