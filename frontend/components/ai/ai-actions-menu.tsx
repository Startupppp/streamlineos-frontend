"use client";

import * as React from "react";
import { SparklesIcon } from "@animateicons/react/lucide";
import { useAnimatedIcon } from "@/hooks/common/use-animated-icon";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  ResponsivePopover,
  ResponsivePopoverContent,
  ResponsivePopoverTrigger,
} from "@/components/ui/responsive-popover";
import { AiActionResultBody } from "./ai-action-result-body";
import { AiResultOverlays } from "./ai-result-overlays";
import { useAiActionRunner } from "./use-ai-action-runner";
import { resolveSurface, type AiAction, type AiResultSurface } from "./ai-action-types";
import { cn } from "@/lib/utils";

export type { AiActionResult } from "./ai-action-result-body";
export type { AiAction } from "./ai-action-types";

interface AiActionsMenuProps {
  actions: AiAction[];
  triggerLabel?: string;
  menuLabel?: string;
  align?: "start" | "end";
  disabled?: boolean;
  className?: string;
  asSubmenu?: boolean;
  defaultSurface?: AiResultSurface;
}

export function AiActionsMenu({
  actions,
  triggerLabel = "AI",
  menuLabel = "AI assist",
  align = "end",
  disabled = false,
  className,
  asSubmenu = false,
  defaultSurface,
}: AiActionsMenuProps) {
  const { iconRef, hoverHandlers } = useAnimatedIcon();
  const {
    active,
    state,
    overlayOpen,
    popoverOpen,
    runAction,
    cancelRun,
    handleRetry,
    handleApply,
    handleOverlayOpenChange,
    handlePopoverOpenChange,
  } = useAiActionRunner({ defaultSurface });

  if (actions.length === 0) return null;

  const activeSurface = active ? resolveSurface(active, defaultSurface) : null;

  const resultBody = (
    <AiActionResultBody
      state={state}
      onApply={active?.onApply ? handleApply : undefined}
      applyLabel={active?.applyLabel ?? "Apply"}
      onRetry={handleRetry}
      onCancel={cancelRun}
      expectsCitations={active?.expectsCitations ?? false}
    />
  );

  const actionItems = actions.map((action) => {
    const itemDisabled = disabled || Boolean(action.disabledReason);
    const secondaryText = action.disabledReason ?? action.description;
    return (
      <DropdownMenuItem
        key={action.key}
        disabled={itemDisabled}
        onSelect={() => {
          if (action.disabledReason) return;
          void runAction(action);
        }}
        className="flex flex-col items-start gap-0.5"
      >
        <span className="text-label">{action.label}</span>
        {secondaryText ? (
          <span className="text-dense text-muted-foreground">
            {secondaryText}
          </span>
        ) : null}
      </DropdownMenuItem>
    );
  });

  const menuContent = (
    <>
      <DropdownMenuLabel className="text-dense font-medium text-muted-foreground">
        {menuLabel}
      </DropdownMenuLabel>
      <DropdownMenuSeparator />
      {actionItems}
    </>
  );

  const overlays = (
    <AiResultOverlays
      title={active?.label ?? "AI assist"}
      surface={activeSurface}
      open={overlayOpen}
      onOpenChange={handleOverlayOpenChange}
    >
      {resultBody}
    </AiResultOverlays>
  );

  const popoverResult =
    activeSurface === "popover" && popoverOpen ? (
      <ResponsivePopoverContent
        title={active?.label ?? "AI assist"}
        align={align}
        className="w-[min(24rem,calc(100vw-2rem))] max-h-[min(24rem,70vh)] overflow-y-auto p-4"
      >
        {resultBody}
      </ResponsivePopoverContent>
    ) : null;

  if (asSubmenu) {
    return (
      <>
        <ResponsivePopover
          open={popoverOpen}
          onOpenChange={handlePopoverOpenChange}
        >
          <DropdownMenuSub>
            <ResponsivePopoverTrigger asChild>
              <DropdownMenuSubTrigger disabled={disabled} className={className}>
                <SparklesIcon
                  ref={iconRef}
                  className="h-3.5 w-3.5 text-primary"
                />
                {triggerLabel}
              </DropdownMenuSubTrigger>
            </ResponsivePopoverTrigger>
            <DropdownMenuSubContent className="w-56">
              {menuContent}
            </DropdownMenuSubContent>
          </DropdownMenuSub>
          {popoverResult}
        </ResponsivePopover>

        {overlays}
      </>
    );
  }

  return (
    <>
      <ResponsivePopover
        open={popoverOpen}
        onOpenChange={handlePopoverOpenChange}
      >
        <DropdownMenu>
          <ResponsivePopoverTrigger asChild>
            <DropdownMenuTrigger asChild>
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={disabled}
                className={cn("h-8 gap-1.5 text-xs", className)}
                {...hoverHandlers}
              >
                <SparklesIcon
                  ref={iconRef}
                  className="h-3.5 w-3.5 text-primary"
                />
                {triggerLabel}
              </Button>
            </DropdownMenuTrigger>
          </ResponsivePopoverTrigger>
          <DropdownMenuContent align={align} className="w-56">
            {menuContent}
          </DropdownMenuContent>
        </DropdownMenu>
        {popoverResult}
      </ResponsivePopover>

      {overlays}
    </>
  );
}
