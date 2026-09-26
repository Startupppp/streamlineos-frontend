"use client";

import * as React from "react";
import { SparklesIcon } from "@animateicons/react/lucide";
import { useAnimatedIcon } from "@/hooks/common/use-animated-icon";
import { useIsMobile } from "@/hooks/common/use-mobile";
import { Button } from "@/components/ui/button";
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "@/components/ui/drawer";
import {
  DropdownMenu,
  DropdownMenuContent,
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
import { AiActionResultBody, AiActionResultFooter } from "./ai-action-result-body";
import {
  AiDrawerActionButton,
  AiMenuActionItem,
  AiMenuHeader,
} from "./ai-actions-menu-items";
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
  iconOnly?: boolean;
}

const MENU_CONTENT_CLASS = "min-w-72 p-1.5";
const RESULT_CONTENT_CLASS =
  "flex w-[min(28rem,calc(100vw-1.5rem))] max-h-[min(32rem,80vh)] flex-col overflow-hidden p-0";

export function AiActionsMenu({
  actions,
  triggerLabel = "AI",
  menuLabel = "AI assist",
  align = "end",
  disabled = false,
  className,
  asSubmenu = false,
  defaultSurface,
  iconOnly = false,
}: AiActionsMenuProps) {
  const isMobile = useIsMobile();
  const { iconRef, hoverHandlers } = useAnimatedIcon();
  const [pickerOpen, setPickerOpen] = React.useState(false);
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

  function handleActionSelect(action: AiAction) {
    setPickerOpen(false);
    void runAction(action);
  }

  function handlePickerOpenChange(open: boolean) {
    setPickerOpen(open);
  }

  function handleDirectRun() {
    const onlyAction = actions[0];
    if (!onlyAction || onlyAction.disabledReason) return;
    void runAction(onlyAction);
  }

  const overlayBody = (
    <AiActionResultBody
      state={state}
      onApply={active?.onApply ? handleApply : undefined}
      applyLabel={active?.applyLabel ?? "Apply"}
      onRetry={handleRetry}
      onCancel={cancelRun}
      expectsCitations={active?.expectsCitations ?? false}
    />
  );

  const resultPanel = (
    <div className="flex min-h-0 min-w-0 flex-1 flex-col">
      <div className="shrink-0 border-b border-border px-4 py-3">
        <p className="text-sm font-semibold text-foreground">
          {active?.label ?? "AI assist"}
        </p>
        <p className="mt-1 text-dense text-muted-foreground">
          Review the draft, then apply it if you want it.
        </p>
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto px-4 py-3">
        <AiActionResultBody
          state={state}
          onApply={active?.onApply ? handleApply : undefined}
          applyLabel={active?.applyLabel ?? "Apply"}
          onRetry={handleRetry}
          onCancel={cancelRun}
          expectsCitations={active?.expectsCitations ?? false}
          contentOnly
        />
      </div>
      <AiActionResultFooter
        state={state}
        onApply={active?.onApply ? handleApply : undefined}
        applyLabel={active?.applyLabel ?? "Apply"}
        onRetry={handleRetry}
        onCancel={cancelRun}
      />
    </div>
  );

  const menuItems = (
    <>
      <AiMenuHeader label={menuLabel} />
      <DropdownMenuSeparator className="my-1" />
      {actions.map((action) => (
        <AiMenuActionItem
          key={action.key}
          action={action}
          disabled={disabled}
          onRun={handleActionSelect}
        />
      ))}
    </>
  );

  const overlays = (
    <AiResultOverlays
      title={active?.label ?? "AI assist"}
      surface={activeSurface}
      open={overlayOpen}
      onOpenChange={handleOverlayOpenChange}
    >
      {overlayBody}
    </AiResultOverlays>
  );

  const popoverResult =
    activeSurface === "popover" && popoverOpen ? (
      <ResponsivePopoverContent
        title={active?.label ?? "AI assist"}
        align={align}
        stickyFooter
        className={RESULT_CONTENT_CLASS}
      >
        {resultPanel}
      </ResponsivePopoverContent>
    ) : null;

  const triggerButton = (
    <Button
      type="button"
      variant="outline"
      size="sm"
      disabled={disabled}
      aria-label={iconOnly ? triggerLabel : undefined}
      className={cn("h-8 gap-1.5 text-xs", iconOnly && "h-9 w-9 px-0", className)}
      {...hoverHandlers}
    >
      <SparklesIcon ref={iconRef} className="h-3.5 w-3.5 text-primary" />
      {iconOnly ? null : triggerLabel}
    </Button>
  );

  if (actions.length === 1 && !asSubmenu) {
    const onlyAction = actions[0];
    return (
      <>
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={disabled || Boolean(onlyAction?.disabledReason)}
          aria-label={
            iconOnly || !onlyAction ? triggerLabel : `${triggerLabel}, ${onlyAction.label}`
          }
          onClick={handleDirectRun}
          className={cn("h-8 gap-1.5 text-xs", iconOnly && "h-9 w-9 px-0", className)}
          {...hoverHandlers}
        >
          <SparklesIcon ref={iconRef} className="h-3.5 w-3.5 text-primary" />
          {iconOnly ? null : triggerLabel}
        </Button>
        <ResponsivePopover open={popoverOpen} onOpenChange={handlePopoverOpenChange}>
          {popoverResult}
        </ResponsivePopover>
        {overlays}
      </>
    );
  }

  if (asSubmenu) {
    return (
      <>
        <ResponsivePopover open={popoverOpen} onOpenChange={handlePopoverOpenChange}>
          <DropdownMenuSub>
            <ResponsivePopoverTrigger asChild>
              <DropdownMenuSubTrigger
                disabled={disabled}
                className={className}
                aria-label={iconOnly ? triggerLabel : undefined}
              >
                <SparklesIcon ref={iconRef} className="h-3.5 w-3.5 text-primary" />
                {iconOnly ? null : triggerLabel}
              </DropdownMenuSubTrigger>
            </ResponsivePopoverTrigger>
            <DropdownMenuSubContent className={MENU_CONTENT_CLASS}>
              {menuItems}
            </DropdownMenuSubContent>
          </DropdownMenuSub>
          {popoverResult}
        </ResponsivePopover>
        {overlays}
      </>
    );
  }

  if (isMobile) {
    return (
      <>
        <Drawer open={pickerOpen} onOpenChange={handlePickerOpenChange}>
          <DrawerTrigger asChild>{triggerButton}</DrawerTrigger>
          <DrawerContent className="z-[110] gap-0 p-0 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
            <DrawerHeader className="border-b border-border px-4 py-3 text-left">
              <DrawerTitle className="text-sm font-semibold">{menuLabel}</DrawerTitle>
            </DrawerHeader>
            <div className="px-1 py-1">
              {actions.map((action) => (
                <AiDrawerActionButton
                  key={action.key}
                  action={action}
                  disabled={disabled}
                  onRun={handleActionSelect}
                />
              ))}
            </div>
          </DrawerContent>
        </Drawer>
        <ResponsivePopover open={popoverOpen} onOpenChange={handlePopoverOpenChange}>
          {popoverResult}
        </ResponsivePopover>
        {overlays}
      </>
    );
  }

  return (
    <>
      <ResponsivePopover open={popoverOpen} onOpenChange={handlePopoverOpenChange}>
        <DropdownMenu>
          <ResponsivePopoverTrigger asChild>
            <DropdownMenuTrigger asChild>{triggerButton}</DropdownMenuTrigger>
          </ResponsivePopoverTrigger>
          <DropdownMenuContent align={align} className={MENU_CONTENT_CLASS}>
            {menuItems}
          </DropdownMenuContent>
        </DropdownMenu>
        {popoverResult}
      </ResponsivePopover>
      {overlays}
    </>
  );
}
