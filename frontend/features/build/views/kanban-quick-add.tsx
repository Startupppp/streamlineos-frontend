"use client";

import { useState, useRef, useCallback } from "react";
import { Input } from "@/components/ui/input";
import { PlusIcon } from "@animateicons/react/lucide";
import { useAnimatedIcon } from "@/hooks/common/use-animated-icon";
import { useCreateTicket } from "@/hooks/api/build/tickets";
import { buildWorkQueryKeys } from "@/lib/query-keys/build-work";
import { toast } from "sonner";
import { TICKET_TITLE_MAX } from "@/lib/validation/projects";
import { getErrorMessage } from "@/lib/get-error-message";
import { useQueryClient } from "@tanstack/react-query";
import { useCan } from "@/hooks/api/access";

interface QuickAddInputProps {
  columnId: string;
  projectId: number;
}

export function QuickAddInput({ columnId, projectId }: QuickAddInputProps) {
  const canCreate = useCan("build:tickets:create");
  if (!canCreate) return null;
  return <QuickAddInputContent columnId={columnId} projectId={projectId} />;
}

function QuickAddInputContent({ columnId, projectId }: QuickAddInputProps) {
  const [value, setValue] = useState("");
  const [isAdding, setIsAdding] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const { iconRef: addIconRef, hoverHandlers: addHoverHandlers } = useAnimatedIcon();
  const queryClient = useQueryClient();

  const createTicket = useCreateTicket({
    onSuccess: () => {
      setValue("");
      setIsAdding(false);
      queryClient.invalidateQueries({
        queryKey: buildWorkQueryKeys.projects.detail(projectId),
      });
    },
    onError: (error) => {
      toast.error(getErrorMessage(error));
    },
  });

  const handleSubmit = useCallback(() => {
    if (!value.trim()) return;
    if (value.trim().length > TICKET_TITLE_MAX) {
      toast.error(`Title must be ${TICKET_TITLE_MAX} characters or fewer`);
      return;
    }
    createTicket.mutate({
      projectId,
      title: value.trim(),
      type: "TASK",
      status: columnId,
    });
  }, [value, projectId, columnId, createTicket]);

  const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setValue(e.target.value);
  }, []);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === "Enter") handleSubmit();
      if (e.key === "Escape") {
        setIsAdding(false);
        setValue("");
      }
    },
    [handleSubmit],
  );

  const handleBlur = useCallback(() => {
    if (!value.trim()) {
      setIsAdding(false);
      setValue("");
    }
  }, [value]);

  const handleAddClick = useCallback(() => {
    setIsAdding(true);
    setTimeout(() => inputRef.current?.focus(), 50);
  }, []);

  if (!isAdding)
    return (
      <button
        type="button"
        onClick={handleAddClick}
        className="flex h-6 w-6 items-center justify-center rounded hover:bg-muted/70 transition-colors text-muted-foreground hover:text-foreground shrink-0"
        aria-label="Add ticket to column"
        {...addHoverHandlers}
      >
        <PlusIcon ref={addIconRef} size={14} />
      </button>
    );
  

  return (
    <div className="absolute top-full left-0 right-0 z-50 p-1.5 bg-muted border-x border-b border-border rounded-b-lg shadow-md">
      <Input
        ref={inputRef}
        value={value}
        className="text-sm"
        onBlur={handleBlur}
        onChange={handleChange}
        placeholder="Ticket title..."
        onKeyDown={handleKeyDown}
        disabled={createTicket.isPending}
      />
    </div>
  );
}
