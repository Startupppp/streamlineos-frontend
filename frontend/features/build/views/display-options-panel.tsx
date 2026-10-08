"use client";

import { memo } from "react";
import { SettingsIcon } from "@animateicons/react/lucide";
import { AnimatedIconButton } from "@/components/ui/animated-icon-button";
import {
  ResponsivePopover,
  ResponsivePopoverContent,
  ResponsivePopoverTrigger,
} from "@/components/ui/responsive-popover";
import {
  MobileOnlyLabelTooltip,
  RESPONSIVE_ICON_LABEL_TRIGGER_CLASS,
  ResponsiveIconLabelText,
} from "@/components/ui/responsive-icon-label";
import type { ViewType } from "./view-switcher";
import type { DisplayOptions } from "../shared/types";
import { DisplayOptionsContent } from "./display-options-content";

interface DisplayOptionsPanelProps {
  viewType: ViewType;
  options: DisplayOptions;
  onChange: (opts: DisplayOptions) => void;
  onOptionsChange?: (opts: DisplayOptions) => void;
  iconOnly?: boolean;
}

export const DisplayOptionsPanel = memo(function DisplayOptionsPanel({
  viewType,
  options,
  onChange,
  onOptionsChange,
  iconOnly = false,
}: DisplayOptionsPanelProps) {
  return (
    <ResponsivePopover>
      <MobileOnlyLabelTooltip label="Display options" always={iconOnly}>
        <ResponsivePopoverTrigger asChild>
          <AnimatedIconButton
            type="button"
            icon={SettingsIcon}
            iconSize={14}
            variant="outline"
            size="sm"
            className={
              iconOnly
                ? "size-9 shrink-0 p-0"
                : RESPONSIVE_ICON_LABEL_TRIGGER_CLASS
            }
            aria-label="Display options"
          >
            {!iconOnly ? (
              <ResponsiveIconLabelText>Display</ResponsiveIconLabelText>
            ) : null}
          </AnimatedIconButton>
        </ResponsivePopoverTrigger>
      </MobileOnlyLabelTooltip>
      <ResponsivePopoverContent
        align="start"
        collisionPadding={16}
        title="Display options"
        className="w-72 space-y-3 p-3"
      >
        <DisplayOptionsContent
          viewType={viewType}
          options={options}
          onChange={onChange}
          onOptionsChange={onOptionsChange}
        />
      </ResponsivePopoverContent>
    </ResponsivePopover>
  );
});
