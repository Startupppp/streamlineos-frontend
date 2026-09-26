import type { ReactNode, RefObject } from "react";

export interface BuildToolbarFilter {
  id: string;
  label: string;
  control: ReactNode;
  active?: boolean;
}

export interface BuildToolbarSearch {
  value: string;
  onValueChange: (value: string) => void;
  placeholder: string;
  label?: string;
  inputRef?: RefObject<HTMLInputElement | null>;
}

export const BUILD_TOOLBAR_FILTERS_LABEL = "Filters";
export const BUILD_TOOLBAR_CLEAR_LABEL = "Clear all";
export const BUILD_TOOLBAR_DRAWER_DESCRIPTION =
  "Narrow this list. Changes apply immediately; close the sheet to return to the results.";

export const BUILD_TOOLBAR_ROOT_CLASS =
  "grid w-full min-w-0 items-center gap-2 md:flex md:flex-nowrap md:overflow-x-auto md:overscroll-x-contain md:scrollbar-hide md:touch-pan-x";

export const BUILD_TOOLBAR_TRAILING_CLASS =
  "flex min-w-0 items-center gap-2 md:ml-auto md:shrink-0";

export const BUILD_TOOLBAR_MOBILE_SLOTS = 2;

export interface BuildToolbarLayoutEntry {
  filter: BuildToolbarFilter;
  collapsed: boolean;
}

export interface BuildToolbarLayout {
  collapse: boolean;
  filters: BuildToolbarLayoutEntry[];
  collapsedActiveCount: number;
  activeCount: number;
  anyActive: boolean;
  mobileColumns: string;
}

function mobileColumnsFor({
  collapse,
  inlineControls,
  trailing,
}: {
  collapse: boolean;
  inlineControls: number;
  trailing: boolean;
}): string {
  if (collapse) return "grid-cols-2";
  if (trailing && inlineControls > 0) return "grid-cols-[1fr_auto]";
  return inlineControls >= BUILD_TOOLBAR_MOBILE_SLOTS
    ? "grid-cols-2"
    : "grid-cols-1";
}

export function buildToolbarLayout({
  search,
  filters,
  trailing = false,
}: {
  search?: BuildToolbarSearch;
  filters?: readonly BuildToolbarFilter[];
  trailing?: boolean;
}): BuildToolbarLayout {
  const list = filters ?? [];
  const hasSearch = search !== undefined;
  const slotCount = (hasSearch ? 1 : 0) + list.length + (trailing ? 1 : 0);
  const collapse = slotCount > BUILD_TOOLBAR_MOBILE_SLOTS;
  const inlineFilterCount = collapse ? (hasSearch ? 0 : 1) : list.length;

  const entries = list.map((filter, index) => ({
    filter,
    collapsed: collapse && index >= inlineFilterCount,
  }));

  const activeCount = list.filter((filter) => filter.active).length;
  const collapsedActiveCount = entries.filter(
    (entry) => entry.collapsed && entry.filter.active,
  ).length;

  return {
    collapse,
    filters: entries,
    collapsedActiveCount,
    activeCount,
    anyActive: activeCount > 0 || Boolean(search?.value),
    mobileColumns: mobileColumnsFor({
      collapse,
      inlineControls: (hasSearch ? 1 : 0) + inlineFilterCount,
      trailing,
    }),
  };
}
