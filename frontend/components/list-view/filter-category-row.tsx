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
import { pmSnappy } from "@/lib/motion-presets";
import type { FilterCategory } from "./filter-types";

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
  selected: boolean;
  leading?: ReactNode;
  onSelect: () => void;
  onMouseEnter?: () => void;
  onKeyDown?: (e: KeyboardEvent) => void;
  dense?: boolean;
}

export function FilterCategoryRow({
  category,
  label,
  activeCount,
  selected,
  leading,
  onSelect,
  onMouseEnter,
  onKeyDown,
  dense = false,
}: FilterCategoryRowProps) {
  const { iconRef } = useAnimatedIcon();
  const shouldReduceMotion = useReducedMotion();

  function handleMouseEnter() {
    iconRef.current?.startAnimation?.();
    onMouseEnter?.();
  }

  function handleMouseLeave() {
    iconRef.current?.stopAnimation?.();
  }

  function handleClick() {
    onSelect();
  }

  function handleKeyDown(e: KeyboardEvent) {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      onSelect();
      return;
    }
    onKeyDown?.(e);
  }

  return (
    <button
      type="button"
      role="menuitem"
      aria-haspopup="true"
      aria-expanded={selected}
      onClick={handleClick}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onKeyDown={handleKeyDown}
      className={cn(
        "relative flex w-full cursor-pointer select-none items-center gap-2.5 rounded-lg px-3 text-sm outline-none",
        dense ? "h-9" : "h-10",
        "border-l-2 transition-[background-color,color,border-color] duration-150 ease-out motion-reduce:transition-none",
        "focus-visible:bg-primary/10 focus-visible:text-foreground focus-visible:border-l-primary",
        selected
          ? "border-l-primary bg-primary/10 text-foreground"
          : "border-l-transparent text-foreground/90 hover:bg-muted/70",
      )}
    >
      <CategoryLeading
        category={category}
        leading={leading}
        iconRef={iconRef}
        active={selected}
      />
      <span className="min-w-0 flex-1 truncate text-left font-medium tracking-tight">{label}</span>
      {activeCount > 0 && (
        <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-primary px-1.5 text-dense font-semibold text-primary-foreground">
          {activeCount}
        </span>
      )}
      <motion.span
        aria-hidden
        className="inline-flex shrink-0 text-muted-foreground"
        animate={
          shouldReduceMotion
            ? undefined
            : { x: selected ? 2 : 0 }
        }
        transition={pmSnappy}
      >
        <ChevronRight className="h-4 w-4" />
      </motion.span>
    </button>
  );
}
