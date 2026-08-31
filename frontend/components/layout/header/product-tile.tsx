"use client";

import Link from "next/link";
import { motion, useReducedMotion } from "framer-motion";
import { Lock, CircleCheck } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { MODULE_ACCENTS, PRODUCT_DESCRIPTIONS, type ProductKey } from "../sidebar/sidebar-nav-items";
import { cn } from "@/lib/utils";

export const ICON_STROKE = 1.75;

export interface ProductTileProps {
  productKey: ProductKey;
  label: string;
  href: string;
  icon: React.ComponentType<{ className?: string; strokeWidth?: number }>;
  isActive: boolean;
  isEnabled: boolean;
  planLocked: boolean;
  canManageModules: boolean;
  onClose: () => void;
}

export function ProductTile({
  productKey,
  label,
  href,
  icon: Icon,
  isActive,
  isEnabled,
  planLocked,
  canManageModules,
  onClose,
}: ProductTileProps) {
  const shouldReduceMotion = useReducedMotion();
  const accent = MODULE_ACCENTS[productKey];
  const description = PRODUCT_DESCRIPTIONS[productKey];
  const effectivelyEnabled = isEnabled && !planLocked;

  const card = (
    <motion.div
      whileTap={shouldReduceMotion || !effectivelyEnabled ? undefined : { scale: 0.98 }}
      className={cn(
        "relative flex items-center gap-2.5 rounded-lg p-2.5 w-full transition-colors duration-150",
        !effectivelyEnabled && "opacity-50 cursor-default",
        isActive
          ? cn("bg-accent border-[1.5px]", accent.border)
          : effectivelyEnabled
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
            "text-label font-medium text-foreground leading-tight truncate",
            !effectivelyEnabled && "pr-12",
          )}
          title={label}
        >
          {label}
        </p>
        <p
          className="text-dense text-muted-foreground line-clamp-1"
          title={description}
        >
          {description}
        </p>
      </div>
      {isActive && effectivelyEnabled && (
        <motion.span
          role="img"
          aria-label="Selected module"
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
      {!effectivelyEnabled && (
        <span className="absolute top-1.5 right-1.5 inline-flex items-center gap-0.5 h-4 px-1 rounded bg-muted border border-border">
          <Lock className="h-2.5 w-2.5 text-muted-foreground" />
          <span className="text-micro font-medium text-muted-foreground">
            {planLocked ? "Upgrade" : "Locked"}
          </span>
        </span>
      )}
    </motion.div>
  );

  if (planLocked) {
    return (
      <Tooltip delayDuration={200}>
        <TooltipTrigger asChild>
          <Link
            href="/settings/billing"
            onClick={onClose}
            className="flex"
            aria-label={`${label} — upgrade plan`}
          >
            {card}
          </Link>
        </TooltipTrigger>
        <TooltipContent side="bottom" className="text-xs">
          Requires a paid plan. Upgrade to unlock {label}.
        </TooltipContent>
      </Tooltip>
    );
  }

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
