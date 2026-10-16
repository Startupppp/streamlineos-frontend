"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import dynamic from "next/dynamic";
import { usePathname } from "next/navigation";
import { ChevronDown } from "lucide-react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerTitle,
  DrawerTrigger,
} from "@/components/ui/drawer";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useIsMobile } from "@/hooks/common/use-mobile";
import { useEnabledModules } from "@/hooks/api/access/org-modules";
import { useAccess, useCan } from "@/hooks/api/access";
import { useEntitlements } from "@/hooks/api/entitlements";
import {
  MODULE_ACCENTS,
  PRODUCT_DEFINITIONS,
  getProductFromPathname,
} from "../sidebar/sidebar-nav-items";
import { cn } from "@/lib/utils";

const ProductGrid = dynamic(
  () => import("./product-grid").then((m) => ({ default: m.ProductGrid })),
  { ssr: false, loading: () => null },
);

const HOVER_CLOSE_DELAY_MS = 175;

export interface ProductSwitcherMenuProps {
  variant?: "header" | "sidebar";
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  triggerOnly?: boolean;
  onRequestOpen?: () => void;
  drawerOnly?: boolean;
}

export function ProductSwitcherMenu({
  onRequestOpen,
  drawerOnly = false,
  variant = "header",
  triggerOnly = false,
  open: controlledOpen,
  onOpenChange: controlledOnOpenChange,
}: ProductSwitcherMenuProps) {
  const [internalOpen, setInternalOpen] = useState(false);
  const pathname = usePathname();
  const isMobile = useIsMobile();

  const isControlled = controlledOpen !== undefined;
  const open = isControlled ? controlledOpen : internalOpen;

  const activeProduct = getProductFromPathname(pathname);
  const enabledModules = useEnabledModules();
  const { data: entitlements } = useEntitlements(open);
  const lockedModules = entitlements?.lockedModules ?? [];
  const canManageModules = useCan("settings:manage");
  const { data: access } = useAccess();
  const effectiveRole =
    access?.isOrgOwner === true
      ? "OWNER"
      : "MEMBER";
  const scopes = access?.scopes;

  const handleOpenChange = useCallback(
    (next: boolean) => {
      if (isControlled) {
        controlledOnOpenChange?.(next);
      } else {
        setInternalOpen(next);
      }
    },
    [isControlled, controlledOnOpenChange],
  );

  const handleClose = useCallback(
    () => handleOpenChange(false),
    [handleOpenChange],
  );

  const closeTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const enableHoverOpen =
    !isMobile && variant === "header" && !triggerOnly && !drawerOnly;

  const clearCloseTimeout = useCallback(() => {
    if (closeTimeoutRef.current !== null) {
      clearTimeout(closeTimeoutRef.current);
      closeTimeoutRef.current = null;
    }
  }, []);

  const handleHoverEnter = useCallback(() => {
    if (!enableHoverOpen) return;
    clearCloseTimeout();
    handleOpenChange(true);
  }, [enableHoverOpen, clearCloseTimeout, handleOpenChange]);

  const handleHoverLeave = useCallback(() => {
    if (!enableHoverOpen) return;
    clearCloseTimeout();
    closeTimeoutRef.current = setTimeout(() => {
      handleOpenChange(false);
      closeTimeoutRef.current = null;
    }, HOVER_CLOSE_DELAY_MS);
  }, [enableHoverOpen, clearCloseTimeout, handleOpenChange]);

  useEffect(() => clearCloseTimeout, [clearCloseTimeout]);

  const handleTriggerClick = useCallback(() => {
    if (triggerOnly) {
      onRequestOpen?.();
      return;
    }
    handleOpenChange(true);
  }, [triggerOnly, onRequestOpen, handleOpenChange]);

  const activeDefinition = PRODUCT_DEFINITIONS.find(
    (p) => p.key === activeProduct,
  );
  const ActiveIcon = activeDefinition?.icon;
  const activeAccent = MODULE_ACCENTS[activeProduct];

  const isSidebarVariant = variant === "sidebar";
  const activeLabel = activeDefinition?.label ?? "Modules";

  const triggerButton = (
    <button
      type="button"
      aria-label="Switch module"
      onClick={triggerOnly ? handleTriggerClick : undefined}
      onMouseEnter={enableHoverOpen ? handleHoverEnter : undefined}
      onMouseLeave={enableHoverOpen ? handleHoverLeave : undefined}
      className={cn(
        "flex items-center rounded-lg text-sm font-medium transition-colors outline-none focus-visible:ring-2",
        "text-sidebar-foreground/80 hover:text-sidebar-foreground hover:bg-sidebar-accent focus-visible:ring-sidebar-ring",
        isSidebarVariant
          ? "gap-2 h-9 w-full min-w-0 px-2.5"
          : "gap-1.5 h-8 px-2 shrink-0 max-w-[10rem]",
      )}
    >
      {ActiveIcon && (
        <span
          className={cn(
            "h-5 w-5 rounded-md flex items-center justify-center shrink-0",
            activeAccent.bg,
            activeAccent.text,
          )}
        >
          <ActiveIcon className="h-3 w-3" strokeWidth={1.75} />
        </span>
      )}
      <span
        className="min-w-0 flex-1 truncate text-left text-xs font-medium text-sidebar-foreground"
        title={activeLabel}
      >
        {activeLabel}
      </span>
      <ChevronDown
        className={cn(
          "h-3 w-3 shrink-0 text-sidebar-foreground/50",
          "transition-transform duration-150",
          open && "rotate-180",
        )}
        strokeWidth={1.75}
      />
    </button>
  );

  const gridProps = {
    activeProduct,
    enabledModules,
    lockedModules,
    canManageModules,
    scopes,
    effectiveRole,
    onClose: handleClose,
    shouldReduceMotion: false,
  };

  const drawerContent = (
    <DrawerContent className="flex h-[min(96dvh,40rem)] max-h-[96dvh] w-full flex-col gap-0 overflow-hidden rounded-t-xl border-t bg-sidebar p-4 pb-[env(safe-area-inset-bottom)] shadow-2xl">
      <DrawerTitle className="sr-only">Modules</DrawerTitle>
      <DrawerDescription className="sr-only">
        The product modules enabled for this organization. Choosing one moves
        the workspace into it; locked modules are shown but cannot be opened.
      </DrawerDescription>
      {open && <ProductGrid {...gridProps} />}
    </DrawerContent>
  );

  if (drawerOnly)
    return (
      <TooltipProvider delayDuration={200}>
        <Drawer open={open} onOpenChange={handleOpenChange} direction="bottom">
          {drawerContent}
        </Drawer>
      </TooltipProvider>
    );

  if (triggerOnly) return triggerButton;

  if (isMobile)
    return (
      <Drawer open={open} onOpenChange={handleOpenChange}>
        <DrawerTrigger asChild>{triggerButton}</DrawerTrigger>
        {drawerContent}
      </Drawer>
    );

  return (
    <Popover open={open} onOpenChange={handleOpenChange}>
      <PopoverTrigger asChild>{triggerButton}</PopoverTrigger>
      <PopoverContent
        forceMount
        align="start"
        className="w-[440px] max-w-[95vw] p-0 border-0 bg-transparent shadow-none data-[state=open]:animate-none data-[state=closed]:animate-none data-[state=closed]:pointer-events-none"
        sideOffset={8}
        onMouseEnter={enableHoverOpen ? handleHoverEnter : undefined}
        onMouseLeave={enableHoverOpen ? handleHoverLeave : undefined}
      >
        {open && (
          <div className="w-full rounded-md border bg-popover text-popover-foreground shadow-md p-2 animate-in fade-in-0 zoom-in-95 duration-150">
            <ProductGrid {...gridProps} />
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}
