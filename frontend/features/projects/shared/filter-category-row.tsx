"use client";

import type { KeyboardEvent, ReactNode, RefObject } from "react";
import { motion, useReducedMotion } from "framer-motion";
import {
  CalendarRange,
  ChevronRight,
  RefreshCw,
  Tag,
} from "lucide-react";
import {
  CircleCheckIcon,
  FolderIcon,
  LayersIcon,
  TriangleAlertIcon,
  UserIcon,
  ZapIcon,
} from "@animateicons/react/lucide";
import type { IconHandle } from "@animateicons/react";
import { useAnimatedIcon } from "@/hooks/common/use-animated-icon";
import { cn } from "@/lib/utils";
import { pmSnappy } from "@/features/projects/shared/pm-motion";
import type { FilterCategory } from "./filter-category-submenu";

interface CategoryLeadingProps {
  category: FilterCategory;
  leading?: ReactNode;
  iconRef: RefObject<IconHandle | null>;
  active: boolean;
}

function CategoryLeading({
  category,
  leading,
  iconRef,
  active,
}: CategoryLeadingProps) {
  const tone = active ? "text-primary" : "text-muted-foreground";

  if (leading) {
    return <span className="shrink-0">{leading}</span>;
  }

  switch (category) {
    case "status":
      return (
        <span className={cn("shrink-0", tone)}>
          <CircleCheckIcon ref={iconRef} size={16} />
        </span>
      );
    case "priority":
      return (
        <span className={cn("shrink-0", tone)}>
          <TriangleAlertIcon ref={iconRef} size={16} />
        </span>
      );
    case "type":
      return (
        <span className={cn("shrink-0", tone)}>
          <LayersIcon ref={iconRef} size={16} />
        </span>
      );
    case "assignee":
      return (
        <span className={cn("shrink-0", tone)}>
          <UserIcon ref={iconRef} size={16} />
        </span>
      );
    case "label":
      return <Tag className={cn("h-4 w-4 shrink-0", tone)} />;
    case "cycle":
      return <RefreshCw className={cn("h-4 w-4 shrink-0", tone)} />;
    case "sprint":
      return (
        <span className={cn("shrink-0", tone)}>
          <ZapIcon ref={iconRef} size={16} />
        </span>
      );
    case "dates":
      return <CalendarRange className={cn("h-4 w-4 shrink-0", tone)} />;
    case "project":
      return (
        <span className={cn("shrink-0", tone)}>
          <FolderIcon ref={iconRef} size={16} />
        </span>
      );
    default:
      return null;
  }
}

export interface FilterCategoryRowProps {
  category: FilterCategory;
  label: string;
  activeCount: number;
  hovered: boolean;
  leading?: ReactNode;
  onMouseEnter: () => void;
  onFocus: () => void;
  onKeyDown: (e: KeyboardEvent) => void;
}

export function FilterCategoryRow({
  category,
  label,
  activeCount,
  hovered,
  leading,
  onMouseEnter,
  onFocus,
  onKeyDown,
}: FilterCategoryRowProps) {
  const { iconRef } = useAnimatedIcon();
  const shouldReduceMotion = useReducedMotion();

  function handleMouseEnter() {
    iconRef.current?.startAnimation?.();
    onMouseEnter();
  }

  function handleMouseLeave() {
    iconRef.current?.stopAnimation?.();
  }

  return (
    <div
      role="menuitem"
      tabIndex={0}
      aria-haspopup="true"
      aria-expanded={hovered}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onFocus={onFocus}
      onKeyDown={onKeyDown}
      className={cn(
        "relative flex h-9 cursor-default select-none items-center gap-2.5 rounded-md px-3 text-sm outline-none",
        "border-l-2 transition-[background-color,color,border-color] duration-150 ease-out motion-reduce:transition-none",
        "focus-visible:bg-primary/10 focus-visible:text-foreground focus-visible:border-l-primary",
        hovered
          ? "border-l-primary bg-primary/10 text-foreground"
          : "border-l-transparent text-foreground/90 hover:bg-muted/70",
      )}
    >
      <CategoryLeading
        category={category}
        leading={leading}
        iconRef={iconRef}
        active={hovered}
      />
      <span className="flex-1 truncate font-medium tracking-tight">{label}</span>
      {activeCount > 0 && (
        <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-primary px-1.5 text-[11px] font-semibold text-primary-foreground">
          {activeCount}
        </span>
      )}
      <motion.span
        aria-hidden
        className="inline-flex shrink-0 text-muted-foreground"
        animate={
          shouldReduceMotion
            ? undefined
            : { x: hovered ? 2 : 0 }
        }
        transition={pmSnappy}
      >
        <ChevronRight className="h-4 w-4" />
      </motion.span>
    </div>
  );
}
