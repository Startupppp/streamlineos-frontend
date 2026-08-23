"use client";

import { type KeyboardEvent, type RefObject } from "react";
import { motion } from "framer-motion";
import { FilterCategoryRow } from "./filter-category-row";
import {
  listContainer,
  listItem,
  listItemReduced,
  pmSnappy,
} from "@/lib/motion-presets";
import type { CategoryDefinition, FilterCategory } from "./filter-types";

export interface FilterCategoryListProps {
  visibleCategories: CategoryDefinition[];
  resolvedCategory: FilterCategory | null;
  containerRef: RefObject<HTMLDivElement | null>;
  isMobile: boolean;
  shouldReduceMotion: boolean | null;
  onSelectCategory: (key: FilterCategory) => void;
  onCategoryKeyDown: (key: FilterCategory, e: KeyboardEvent) => void;
  dense: boolean;
}

export function FilterCategoryList({
  visibleCategories,
  resolvedCategory,
  containerRef,
  isMobile,
  shouldReduceMotion,
  onSelectCategory,
  onCategoryKeyDown,
  dense,
}: FilterCategoryListProps) {
  if (visibleCategories.length === 0) {
    return (
      <p className="px-3 py-8 text-center text-sm text-muted-foreground">
        No filters available.
      </p>
    );
  }

  return (
    <motion.div
      ref={containerRef}
      role="menu"
      aria-label="Filter categories"
      tabIndex={-1}
      className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-1.5 outline-none"
      variants={listContainer}
      initial="hidden"
      animate="show"
    >
      {visibleCategories.map((cat) => {
        const selected = resolvedCategory === cat.key;
        function onSelect() {
          onSelectCategory(cat.key);
        }
        function onMouseEnter() {
          if (!isMobile) onSelectCategory(cat.key);
        }
        function onKeyDown(e: KeyboardEvent) {
          onCategoryKeyDown(cat.key, e);
        }
        return (
          <motion.div
            key={cat.key}
            variants={shouldReduceMotion ? listItemReduced : listItem}
            transition={pmSnappy}
          >
            <FilterCategoryRow
              category={cat.key}
              label={cat.label}
              leading={cat.leading}
              activeCount={cat.activeCount}
              selected={selected}
              dense={dense}
              onSelect={onSelect}
              onMouseEnter={onMouseEnter}
              onKeyDown={onKeyDown}
            />
          </motion.div>
        );
      })}
    </motion.div>
  );
}
