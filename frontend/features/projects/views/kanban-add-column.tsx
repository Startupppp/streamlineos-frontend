"use client";

import { useState, useRef, useCallback } from "react";
import { Input } from "@/components/ui/input";
import { Plus } from "lucide-react";
import { toast } from "sonner";
import { getErrorMessage } from "@/lib/get-error-message";
import { useCreateCustomState } from "@/hooks/api/projects/custom-states";
import { useCan } from "@/hooks/api/access";

const DEFAULT_COLUMN_COLOR = "#94a3b8";

interface AddColumnProps {
  projectId: number;
}

export function AddColumn({ projectId }: AddColumnProps) {
  const canManage = useCan("projects:workflow:manage");
  const [value, setValue] = useState("");
  const [isAdding, setIsAdding] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const createState = useCreateCustomState(projectId);

  const handleSubmit = useCallback(() => {
    const name = value.trim();
    if (!name || createState.isPending) return;
    createState.mutate(
      { name, color: DEFAULT_COLUMN_COLOR },
      {
        onSuccess: () => {
          setValue("");
          setIsAdding(false);
          toast.success(`Column "${name}" added`);
        },
        onError: (error) => toast.error(getErrorMessage(error)),
      },
    );
  }, [value, createState]);

  const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => setValue(e.target.value), []);

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

  if (!canManage) return null;

  return (
    <div className="w-72 min-w-[280px] shrink-0">
      {isAdding ? (
        <div className="rounded-lg border bg-muted/20 p-2">
          <Input
            ref={inputRef}
            value={value}
            onChange={handleChange}
            placeholder="Column name..."
            className="h-8 text-sm"
            onKeyDown={handleKeyDown}
            onBlur={handleBlur}
            disabled={createState.isPending}
          />
        </div>
      ) : (
        <button
          type="button"
          onClick={handleAddClick}
          className="flex h-10 w-full items-center justify-center gap-1.5 rounded-lg border border-dashed text-xs text-muted-foreground transition-colors hover:bg-muted/40 hover:text-foreground"
        >
          <Plus className="h-3.5 w-3.5" />
          Add column
        </button>
      )}
    </div>
  );
}
