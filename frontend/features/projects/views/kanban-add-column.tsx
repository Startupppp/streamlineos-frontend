"use client";

import { useState, useRef, useCallback } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { LoadingButton } from "@/components/ui/loading-button";
import { Plus } from "lucide-react";
import { toast } from "sonner";
import { getErrorMessage } from "@/lib/get-error-message";
import { useCreateCustomState } from "@/hooks/api/projects/custom-states";
import { useCan } from "@/hooks/api/access";
import { ColumnColorPicker } from "../shared/column-color-picker";
import { DEFAULT_COLUMN_COLOR } from "../shared/column-colors";

interface AddColumnProps {
  projectId: number;
}

export function AddColumn({ projectId }: AddColumnProps) {
  const canManage = useCan("projects:manage");
  const [value, setValue] = useState("");
  const [color, setColor] = useState<string>(DEFAULT_COLUMN_COLOR);
  const [isAdding, setIsAdding] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const createState = useCreateCustomState(projectId);

  const handleSubmit = useCallback(() => {
    const name = value.trim();
    if (!name || createState.isPending) return;
    createState.mutate(
      { name, color },
      {
        onSuccess: () => {
          setValue("");
          setColor(DEFAULT_COLUMN_COLOR);
          setIsAdding(false);
          toast.success(`Column "${name}" added`);
        },
        onError: (error) => toast.error(getErrorMessage(error)),
      },
    );
  }, [value, color, createState]);

  const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => setValue(e.target.value), []);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === "Enter") handleSubmit();
      if (e.key === "Escape") {
        setIsAdding(false);
        setValue("");
        setColor(DEFAULT_COLUMN_COLOR);
      }
    },
    [handleSubmit],
  );

  const handleCancel = useCallback(() => {
    setIsAdding(false);
    setValue("");
    setColor(DEFAULT_COLUMN_COLOR);
  }, []);

  const handleAddClick = useCallback(() => {
    setIsAdding(true);
    setTimeout(() => inputRef.current?.focus(), 50);
  }, []);

  const handleColorChange = useCallback((nextColor: string) => {
    setColor(nextColor);
  }, []);

  if (!canManage) return null;

  return (
    <div className="w-72 min-w-[280px] shrink-0">
      {isAdding ? (
        <div className="rounded-lg border bg-muted/20 p-2 space-y-2">
          <Input
            ref={inputRef}
            value={value}
            onChange={handleChange}
            placeholder="Column name..."
            className="h-8 text-sm"
            onKeyDown={handleKeyDown}
            disabled={createState.isPending}
          />
          <ColumnColorPicker value={color} onChange={handleColorChange} showLabel={false} />
          <div className="flex gap-1.5">
            <LoadingButton
              size="sm"
              onClick={handleSubmit}
              disabled={!value.trim()}
              isPending={createState.isPending}
              loadingText="Adding…"
              className="h-7 text-xs flex-1"
            >
              Add
            </LoadingButton>
            <Button
              size="sm"
              variant="ghost"
              onClick={handleCancel}
              disabled={createState.isPending}
              className="h-7 text-xs"
            >
              Cancel
            </Button>
          </div>
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
