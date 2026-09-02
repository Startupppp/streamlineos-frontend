"use client";

import { useCallback } from "react";
import { AiFieldTrigger } from "./ai-field-trigger";
import {
  AiActionResultBody,
  AiActionResultFooter,
  type AiActionResult,
} from "./ai-action-result-body";
import { useAiPopoverAction } from "./use-ai-popover-action";
import {
  AI_FIELD_POPOVER_CONTENT_CLASS,
  AiFieldPopoverLayout,
  AiFieldPopoverScrollBody,
} from "./ai-field-popover-layout";
import {
  ResponsivePopover,
  ResponsivePopoverContent,
  ResponsivePopoverTrigger,
} from "@/components/ui/responsive-popover";

export const AI_FIELD_POPOVER_COLLISION_PADDING = 16;

interface AiFieldPopoverActionProps {
  label: string;
  showLabel?: boolean;
  popoverTitle?: string;
  disabledReason?: string;
  disabled?: boolean;
  run: (signal?: AbortSignal) => Promise<AiActionResult>;
  onApply?: () => void;
  applyLabel?: string;
  align?: "start" | "end" | "center";
  className?: string;
}

export function AiFieldPopoverAction({
  label,
  showLabel = false,
  popoverTitle,
  disabledReason,
  disabled = false,
  run,
  onApply,
  applyLabel,
  align = "end",
  className,
}: AiFieldPopoverActionProps) {
  const popover = useAiPopoverAction({ run });

  const handleTriggerClick = useCallback(() => {
    if (disabled || disabledReason || popover.isPending) return;
    void popover.execute();
  }, [disabled, disabledReason, popover]);

  const handleApply = useCallback(() => {
    onApply?.();
    popover.handleOpenChange(false);
  }, [onApply, popover]);

  return (
    <ResponsivePopover open={popover.open} onOpenChange={popover.handleOpenChange}>
      <ResponsivePopoverTrigger asChild>
        <span className="inline-flex shrink-0">
          <AiFieldTrigger
            label={label}
            showLabel={showLabel}
            disabledReason={disabledReason}
            disabled={disabled}
            isPending={popover.isPending}
            onClick={handleTriggerClick}
            className={className}
          />
        </span>
      </ResponsivePopoverTrigger>
      <ResponsivePopoverContent
        title={popoverTitle ?? label}
        align={align}
        collisionPadding={AI_FIELD_POPOVER_COLLISION_PADDING}
        className={AI_FIELD_POPOVER_CONTENT_CLASS}
        stickyFooter
      >
        <AiFieldPopoverLayout>
          <AiFieldPopoverScrollBody>
            <AiActionResultBody
              state={popover.state}
              compact
              contentOnly
            />
          </AiFieldPopoverScrollBody>
          <AiActionResultFooter
            state={popover.state}
            onApply={onApply ? handleApply : undefined}
            applyLabel={applyLabel}
            onRetry={popover.retry}
            onCancel={popover.cancel}
          />
        </AiFieldPopoverLayout>
      </ResponsivePopoverContent>
    </ResponsivePopover>
  );
}
