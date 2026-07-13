"use client";

import { useCallback } from "react";
import { Input } from "@/components/ui/input";
import { LoadingButton } from "@/components/ui/loading-button";
import { cn } from "@/lib/utils";
import { LabelColorPicker } from "./label-color-picker";

export interface LabelCreateFormProps {
  name: string;
  color: string;
  onNameChange: (name: string) => void;
  onColorChange: (color: string) => void;
  onSubmit: () => void;
  isPending?: boolean;
  submitLabel?: string;
  loadingText?: string;
  showPreview?: boolean;
  showHeading?: boolean;
  fullWidthSubmit?: boolean;
  className?: string;
  autoFocus?: boolean;
}

export function LabelCreateForm({
  name,
  color,
  onNameChange,
  onColorChange,
  onSubmit,
  isPending = false,
  submitLabel = "Create",
  loadingText = "Creating…",
  showPreview = true,
  showHeading = false,
  fullWidthSubmit = true,
  className,
  autoFocus = false,
}: LabelCreateFormProps) {
  const trimmedName = name.trim();
  const canSubmit = trimmedName.length > 0 && !isPending;

  const handleNameChange = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      onNameChange(event.target.value);
    },
    [onNameChange],
  );

  const handleNameKeyDown = useCallback(
    (event: React.KeyboardEvent<HTMLInputElement>) => {
      if (event.key === "Enter" && trimmedName) {
        onSubmit();
      }
    },
    [onSubmit, trimmedName],
  );

  const handleSubmit = useCallback(() => {
    if (canSubmit) {
      onSubmit();
    }
  }, [canSubmit, onSubmit]);

  return (
    <div className={cn("space-y-3", className)}>
      {showHeading ? (
        <p className="text-xs font-medium text-muted-foreground">Create new label</p>
      ) : null}

      {showPreview ? (
        <div className="flex items-center gap-2 rounded-lg border border-border bg-muted/30 px-2.5 py-1.5">
          <span
            className="h-2.5 w-2.5 shrink-0 rounded-full"
            style={{ backgroundColor: color }}
          />
          <span
            className={cn(
              "truncate text-sm font-medium",
              trimmedName ? "text-foreground" : "text-muted-foreground",
            )}
          >
            {trimmedName || "Label preview"}
          </span>
        </div>
      ) : null}

      <div className="flex items-center gap-2">
        <div
          className="h-6 w-6 shrink-0 rounded-full border-2 border-background shadow-sm"
          style={{ backgroundColor: color }}
          aria-hidden
        />
        <Input
          value={name}
          onChange={handleNameChange}
          onKeyDown={handleNameKeyDown}
          placeholder="Label name"
          className="h-8 flex-1 text-sm"
          autoFocus={autoFocus}
        />
      </div>

      <LabelColorPicker value={color} onChange={onColorChange} />

      <LoadingButton
        type="button"
        size="sm"
        onClick={handleSubmit}
        disabled={!trimmedName}
        isPending={isPending}
        loadingText={loadingText}
        className={cn("h-8 text-xs", fullWidthSubmit && "w-full")}
      >
        {submitLabel}
      </LoadingButton>
    </div>
  );
}
