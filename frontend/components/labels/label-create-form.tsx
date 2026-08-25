"use client";

import { useCallback } from "react";
import { CheckIcon, XIcon } from "@animateicons/react/lucide";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { LoadingButton } from "@/components/ui/loading-button";
import { useAnimatedIcon } from "@/hooks/common/use-animated-icon";
import { cn } from "@/lib/utils";
import { LabelColorPicker } from "./label-color-picker";
import { resolveLabelColor } from "./label-colors";

export interface LabelCreateFormProps {
  name: string;
  color: string;
  onNameChange: (name: string) => void;
  onColorChange: (color: string) => void;
  onSubmit: () => void;
  onCancel?: () => void;
  isPending?: boolean;
  submitLabel?: string;
  loadingText?: string;
  showPreview?: boolean;
  showHeading?: boolean;
  fullWidthSubmit?: boolean;
  className?: string;
  autoFocus?: boolean;
}

function SubmitLabelButton({
  disabled,
  isPending,
  loadingText,
  submitLabel,
  fullWidth,
  onClick,
}: {
  disabled: boolean;
  isPending: boolean;
  loadingText: string;
  submitLabel: string;
  fullWidth: boolean;
  onClick: () => void;
}) {
  const { iconRef, hoverHandlers } = useAnimatedIcon();

  return (
    <LoadingButton
      type="button"
      size="sm"
      onClick={onClick}
      disabled={disabled}
      isPending={isPending}
      loadingText={loadingText}
      className={cn("gap-1.5 text-xs", fullWidth && "w-full")}
      {...hoverHandlers}
    >
      <CheckIcon ref={iconRef} size={14} />
      {submitLabel}
    </LoadingButton>
  );
}

function CancelCreateButton({ onClick }: { onClick: () => void }) {
  const { iconRef, hoverHandlers } = useAnimatedIcon();

  return (
    <Button
      type="button"
      size="sm"
      variant="outline"
      className="gap-1.5 text-xs"
      onClick={onClick}
      {...hoverHandlers}
    >
      <XIcon ref={iconRef} size={14} />
      Cancel
    </Button>
  );
}

export function LabelCreateForm({
  name,
  color,
  onNameChange,
  onColorChange,
  onSubmit,
  onCancel,
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
  const resolvedColor = resolveLabelColor(color);
  const canSubmit = trimmedName.length > 0 && !isPending;

  const handleNameChange = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      onNameChange(event.target.value);
    },
    [onNameChange],
  );

  const handleNameKeyDown = useCallback(
    (event: React.KeyboardEvent<HTMLInputElement>) => {
      if (event.key === "Enter" && canSubmit) {
        onSubmit();
      }
      if (event.key === "Escape" && onCancel) {
        onCancel();
      }
    },
    [canSubmit, onSubmit, onCancel],
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
        <div className="flex items-center gap-2.5">
          <span
            className={cn(
              "inline-flex max-w-full items-center gap-1.5 rounded-md border px-2.5 py-1 text-xs font-medium",
              "bg-primary/5 border-primary/15 text-foreground",
            )}
          >
            <span
              className="h-2 w-2 shrink-0 rounded-full shadow-sm ring-1 ring-background"
              style={{ backgroundColor: resolvedColor }}
            />
            <span className={cn("truncate", !trimmedName && "text-muted-foreground")}>
              {trimmedName || "Label preview"}
            </span>
          </span>
          <span className="font-mono text-micro uppercase text-muted-foreground">
            {resolvedColor}
          </span>
        </div>
      ) : null}

      <div className="space-y-1.5">
        <label htmlFor="label-create-name" className="text-xs text-muted-foreground">
          Name
        </label>
        <Input
          id="label-create-name"
          value={name}
          onChange={handleNameChange}
          onKeyDown={handleNameKeyDown}
          placeholder="Label name"
          className="text-sm"
          autoFocus={autoFocus}
          aria-label="Label name"
        />
      </div>

      <LabelColorPicker value={resolvedColor} onChange={onColorChange} swatchSize="md" />

      <div
        className={cn(
          "flex items-center gap-2 pt-0.5",
          onCancel || !fullWidthSubmit ? "justify-end" : "",
        )}
      >
        {onCancel ? <CancelCreateButton onClick={onCancel} /> : null}
        <SubmitLabelButton
          disabled={!trimmedName}
          isPending={isPending}
          loadingText={loadingText}
          submitLabel={submitLabel}
          fullWidth={fullWidthSubmit && !onCancel}
          onClick={handleSubmit}
        />
      </div>
    </div>
  );
}
