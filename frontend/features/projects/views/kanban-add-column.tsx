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

const MAX_NAME_LENGTH = 50;

function validateColumnName(name: string, existingNames: string[]): string | null {
  if (!name) return "Name is required";
  if (!/[a-zA-Z0-9]/.test(name)) return "Name must contain at least one letter or number";
  if (name.length > MAX_NAME_LENGTH) return `Name must be ${MAX_NAME_LENGTH} characters or fewer`;
  const lower = name.toLowerCase();
  if (existingNames.some((n) => n.toLowerCase() === lower)) return "A column with this name already exists";
  return null;
}

interface AddColumnProps {
  projectId: number;
  existingNames?: string[];
}

export function AddColumn({ projectId, existingNames = [] }: AddColumnProps) {
  const canManage = useCan("projects:manage");
  const [value, setValue] = useState("");
  const [color, setColor] = useState<string>(DEFAULT_COLUMN_COLOR);
  const [isAdding, setIsAdding] = useState(false);
  const [nameError, setNameError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const createState = useCreateCustomState(projectId);

  const handleSubmit = useCallback(() => {
    const name = value.trim();
    const error = validateColumnName(name, existingNames);
    if (error) {
      setNameError(error);
      return;
    }
    if (createState.isPending) return;
    setNameError(null);
    createState.mutate(
      { name, color },
      {
        onSuccess: () => {
          setValue("");
          setColor(DEFAULT_COLUMN_COLOR);
          setIsAdding(false);
          toast.success(`Column "${name}" added`);
        },
        onError: (err) => toast.error(getErrorMessage(err)),
      },
    );
  }, [value, color, existingNames, createState]);

  const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setValue(e.target.value);
    setNameError(null);
  }, []);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === "Enter") handleSubmit();
      if (e.key === "Escape") {
        setIsAdding(false);
        setValue("");
        setColor(DEFAULT_COLUMN_COLOR);
        setNameError(null);
      }
    },
    [handleSubmit],
  );

  const handleCancel = useCallback(() => {
    setIsAdding(false);
    setValue("");
    setColor(DEFAULT_COLUMN_COLOR);
    setNameError(null);
  }, []);

  const handleAddClick = useCallback(() => {
    setIsAdding(true);
    setNameError(null);
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
          <div className="space-y-1">
            <Input
              ref={inputRef}
              value={value}
              onChange={handleChange}
              placeholder="Column name..."
              className="text-sm"
              onKeyDown={handleKeyDown}
              disabled={createState.isPending}
              maxLength={MAX_NAME_LENGTH}
              aria-invalid={!!nameError}
            />
            {nameError && (
              <p className="text-[11px] text-destructive leading-tight">{nameError}</p>
            )}
          </div>
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
