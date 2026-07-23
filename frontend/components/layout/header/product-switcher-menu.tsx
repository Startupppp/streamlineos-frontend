"use client";

import { useState, useCallback, useRef, useEffect, useMemo } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import type { Variants } from "framer-motion";
import { ChevronDown, Lock, CircleCheck } from "lucide-react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Drawer,
  DrawerContent,
  DrawerTitle,
  DrawerTrigger,
} from "@/components/ui/drawer";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useIsMobile } from "@/hooks/common/use-mobile";
import { useEnabledModules } from "@/hooks/api/access/org-modules";
import { useAccess, useCan } from "@/hooks/api/access";
import { usePermissions } from "@/lib/rbac/hooks";
import {
  PRODUCT_DEFINITIONS,
  PRODUCT_DESCRIPTIONS,
  getNavGroupsForProduct,
  getProductFromPathname,
  isModuleEnabled,
  MODULE_ACCENTS,
  type ProductKey,
} from "../sidebar/sidebar-nav-items";
import { cn } from "@/lib/utils";

const ICON_STROKE = 1.75;
const HOVER_CLOSE_DELAY_MS = 175;

interface ProductSwitcherMenuProps {
  variant?: "header" | "sidebar";
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  triggerOnly?: boolean;
  onRequestOpen?: () => void;
  drawerOnly?: boolean;
}

interface ProductTileProps {
  productKey: ProductKey;
  label: string;
  href: string;
  icon: React.ComponentType<{ className?: string; strokeWidth?: number }>;
  isActive: boolean;
  isEnabled: boolean;
  canManageModules: boolean;
  onClose: () => void;
}

interface ProductGridProps {
  activeProduct: ProductKey;
  enabledModules: string[];
  canManageModules: boolean;
  permissions: string[];
  effectiveRole: string;
  onClose: () => void;
  shouldReduceMotion: boolean | null;
}

function ProductTile({
  productKey,
  label,
  href,
  icon: Icon,
  isActive,
  isEnabled,
  canManageModules,
  onClose,
}: ProductTileProps) {
  const shouldReduceMotion = useReducedMotion();
  const accent = MODULE_ACCENTS[productKey];
  const description = PRODUCT_DESCRIPTIONS[productKey];

  const card = (
    <motion.div
      whileTap={shouldReduceMotion || !isEnabled ? undefined : { scale: 0.98 }}
      className={cn(
        "relative flex items-center gap-2.5 rounded-lg p-2.5 w-full transition-colors duration-150",
        !isEnabled && "opacity-50 cursor-default",
        isActive
          ? cn("bg-accent border-[1.5px]", accent.border)
          : isEnabled
            ? "border border-transparent hover:bg-muted/80"
            : "border border-transparent",
      )}
    >
      <span
        className={cn(
          "h-8 w-8 rounded-md flex items-center justify-center shrink-0",
          accent.bg,
          accent.text,
        )}
      >
        <Icon className="h-[15px] w-[15px]" strokeWidth={ICON_STROKE} />
      </span>
      <div className="flex-1 min-w-0">
        <p
          className={cn(
            "text-[13px] font-medium text-foreground leading-tight truncate",
            !isEnabled && "pr-12",
          )}
          title={label}
        >
          {label}
        </p>
        <p className="text-[11px] text-muted-foreground line-clamp-1">
          {description}
        </p>
      </div>
      {isActive && (
        <motion.span
          role="img"
          aria-label="Selected product"
          initial={
            shouldReduceMotion ? { opacity: 0 } : { scale: 0, opacity: 0 }
          }
          animate={
            shouldReduceMotion ? { opacity: 1 } : { scale: 1, opacity: 1 }
          }
          transition={
            shouldReduceMotion
              ? { duration: 0.12 }
              : { type: "spring", stiffness: 500, damping: 25 }
          }
        >
          <CircleCheck
            aria-hidden="true"
            className="h-3.5 w-3.5 shrink-0 text-muted-foreground"
          />
        </motion.span>
      )}
      {!isEnabled && (
        <span className="absolute top-1.5 right-1.5 inline-flex items-center gap-0.5 h-4 px-1 rounded bg-muted border border-border">
          <Lock className="h-2.5 w-2.5 text-muted-foreground" />
          <span className="text-[9px] font-medium text-muted-foreground">
            Locked
          </span>
        </span>
      )}
    </motion.div>
  );

  if (!isEnabled) {
    if (!canManageModules) {
      return (
        <Tooltip delayDuration={200}>
          <TooltipTrigger asChild>
            <div className="flex" aria-label={`${label} — not available`}>
              {card}
            </div>
          </TooltipTrigger>
          <TooltipContent side="bottom" className="text-xs">
            This product is not available to you.
          </TooltipContent>
        </Tooltip>
      );
    }

    return (
      <Tooltip delayDuration={200}>
        <TooltipTrigger asChild>
          <Link
            href="/settings/modules"
            onClick={onClose}
            className="flex"
            aria-label={`${label} — not enabled`}
          >
            {card}
          </Link>
        </TooltipTrigger>
        <TooltipContent side="bottom" className="text-xs">
          Not enabled — go to Modules
        </TooltipContent>
      </Tooltip>
    );
  }

  return (
    <Link href={href} onClick={onClose} className="flex" aria-label={label}>
      {card}
    </Link>
  );
}

function ProductGrid({
  activeProduct,
  enabledModules,
  canManageModules,
  permissions,
  effectiveRole,
  onClose,
  shouldReduceMotion,
}: ProductGridProps) {
  const visibleProducts = useMemo(
    () =>
      PRODUCT_DEFINITIONS.filter((product) => {
        const groups = getNavGroupsForProduct(
          product.key,
          effectiveRole,
          permissions,
          enabledModules,
        );
        const hasAccess = groups.some((group) => group.routes.length > 0);
        return hasAccess || canManageModules;
      }),
    [effectiveRole, permissions, enabledModules, canManageModules],
  );

  return (
    <>
      <p className="text-[10px] uppercase tracking-wider font-semibold text-muted-foreground mb-1.5 px-1">
        Products
      </p>
      <div className="grid grid-cols-2 gap-1">
        {visibleProducts.map((product, index) => {
          const enabled = isModuleEnabled(product.key, enabledModules);
          const isActive = activeProduct === product.key && enabled;
          return (
            <motion.div
              key={product.key}
              initial={
                shouldReduceMotion ? { opacity: 0 } : { opacity: 0, y: 4 }
              }
              animate={
                shouldReduceMotion ? { opacity: 1 } : { opacity: 1, y: 0 }
              }
              transition={{
                duration: shouldReduceMotion ? 0.12 : 0.14,
                ease: "easeOut",
                delay: shouldReduceMotion ? 0 : index * 0.02,
              }}
            >
              <ProductTile
                productKey={product.key}
                label={product.label}
                href={product.href}
                icon={product.icon}
                isActive={isActive}
                isEnabled={enabled}
                canManageModules={canManageModules}
                onClose={onClose}
              />
            </motion.div>
          );
        })}
      </div>
    </>
  );
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
  const shouldReduceMotion = useReducedMotion();
  const isMobile = useIsMobile();

  const isControlled = controlledOpen !== undefined;
  const open = isControlled ? controlledOpen : internalOpen;

  const activeProduct = getProductFromPathname(pathname);
  const enabledModules = useEnabledModules();
  const canManageModules = useCan("settings:manage");
  const { permissions } = usePermissions();
  const { data: access } = useAccess();
  const effectiveRole =
    access?.isOrgOwner === true || access?.isPlatformAdmin === true
      ? "OWNER"
      : "MEMBER";

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

  const panelVariants: Variants = shouldReduceMotion
    ? {
        hidden: { opacity: 0 },
        visible: { opacity: 1, transition: { duration: 0.12 } },
        exit: { opacity: 0, transition: { duration: 0.1 } },
      }
    : {
        hidden: { opacity: 0, scale: 0.96, y: -4 },
        visible: {
          opacity: 1,
          scale: 1,
          y: 0,
          transition: { duration: 0.16, ease: "easeOut" },
        },
        exit: {
          opacity: 0,
          scale: 0.98,
          y: -2,
          transition: { duration: 0.12, ease: "easeOut" },
        },
      };

  const isSidebarVariant = variant === "sidebar";
  const activeLabel = activeDefinition?.label ?? "Products";

  const triggerButton = (
    <button
      type="button"
      aria-label="Switch product"
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
          <ActiveIcon className="h-3 w-3" strokeWidth={ICON_STROKE} />
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
          !shouldReduceMotion && "transition-transform duration-150",
          !shouldReduceMotion && open && "rotate-180",
        )}
        strokeWidth={ICON_STROKE}
      />
    </button>
  );

  const drawerContent = (
    <DrawerContent className="flex h-[min(96dvh,40rem)] max-h-[96dvh] w-full flex-col gap-0 overflow-hidden rounded-t-xl border-t bg-sidebar p-4 pb-[env(safe-area-inset-bottom)] shadow-2xl">
      <DrawerTitle className="sr-only">Products</DrawerTitle>
      <AnimatePresence>
        {open && (
          <ProductGrid
            activeProduct={activeProduct}
            enabledModules={enabledModules}
            canManageModules={canManageModules}
            permissions={permissions}
            effectiveRole={effectiveRole}
            onClose={handleClose}
            shouldReduceMotion={shouldReduceMotion}
          />
        )}
      </AnimatePresence>
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
        <AnimatePresence>
          {open && (
            <motion.div
              key="product-switcher-panel"
              variants={panelVariants}
              initial="hidden"
              animate="visible"
              exit="exit"
              style={{ transformOrigin: "top left" }}
              className="w-full rounded-md border bg-popover text-popover-foreground shadow-md p-2"
            >
              <ProductGrid
                activeProduct={activeProduct}
                enabledModules={enabledModules}
                canManageModules={canManageModules}
                permissions={permissions}
                effectiveRole={effectiveRole}
                onClose={handleClose}
                shouldReduceMotion={shouldReduceMotion}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </PopoverContent>
    </Popover>
  );
}
