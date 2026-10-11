"use client";

import { useCallback } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { CheckIcon, XIcon } from "@animateicons/react/lucide";
import { AnimatedIconButton } from "@/components/ui/animated-icon-button";
import { Input } from "@/components/ui/input";
import { LoadingButton } from "@/components/ui/loading-button";
import { LabelColorPicker } from "@/components/labels";
import { resolveLabelColor } from "@/components/labels/label-colors";
import { useAnimatedIcon } from "@/hooks/common/use-animated-icon";
import { cn } from "@/lib/utils";

interface LabelEditRowProps {
  name: string;
  color: string;
  isPending?: boolean;
  onNameChange: (name: string) => void;
  onColorChange: (color: string) => void;
  onSave: () => void;
  onCancel: () => void;
}

export function LabelEditRow({
  name,
  color,
  isPending = false,
  onNameChange,
  onColorChange,
  onSave,
  onCancel,
}: LabelEditRowProps) {
  const { iconRef: saveIconRef, hoverHandlers: saveHoverHandlers } = useAnimatedIcon();
  const reduceMotion = useReducedMotion();
  const resolvedColor = resolveLabelColor(color);
  const trimmedName = name.trim();
  const previewLabel = trimmedName || "Label preview";
  const canSave = trimmedName.length > 0 && !isPending;

  const handleNameChange = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      onNameChange(event.target.value);
    },
    [onNameChange],
  );

  const handleNameKeyDown = useCallback(
    (event: React.KeyboardEvent<HTMLInputElement>) => {
      if (event.key === "Enter" && canSave) {
        onSave();
      }
      if (event.key === "Escape") {
        onCancel();
      }
    },
    [canSave, onSave, onCancel],
  );

  return (
    <motion.div
      initial={reduceMotion ? false : { opacity: 0, y: -6 }}
      animate={{ opacity: 1, y: 0 }}
      exit={reduceMotion ? undefined : { opacity: 0, y: -4 }}
      transition={{ duration: 0.18, ease: "easeOut" }}
      className="w-full space-y-3 rounded-xl border border-border bg-card p-3 shadow-sm"
    >
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
            {previewLabel}
          </span>
        </span>
        <span className="font-mono text-micro uppercase text-muted-foreground">
          {resolvedColor}
        </span>
      </div>

      <div className="space-y-1.5">
        <label htmlFor="label-edit-name" className="text-xs text-muted-foreground">
          Name
        </label>
        <Input
          id="label-edit-name"
          value={name}
          onChange={handleNameChange}
          onKeyDown={handleNameKeyDown}
          className="text-sm"
          placeholder="Label name"
          autoFocus
          aria-label="Label name"
        />
      </div>

      <LabelColorPicker
        value={resolvedColor}
        onChange={onColorChange}
        showLabel
        swatchSize="md"
      />

      <div className="flex items-center justify-end gap-2 pt-0.5">
        <AnimatedIconButton
          type="button"
          icon={XIcon}
          iconSize={14}
          size="sm"
          variant="outline"
          className="gap-1.5 text-xs"
          onClick={onCancel}
        >
          Cancel
        </AnimatedIconButton>
        <LoadingButton
          type="button"
          size="sm"
          className="gap-1.5 text-xs"
          onClick={onSave}
          disabled={!canSave}
          isPending={isPending}
          loadingText="Saving…"
          {...saveHoverHandlers}
        >
          <CheckIcon ref={saveIconRef} size={14} />
          Save
        </LoadingButton>
      </div>
    </motion.div>
  );
}
