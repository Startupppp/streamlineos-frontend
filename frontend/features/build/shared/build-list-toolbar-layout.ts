import type { ReactNode } from "react";

export interface BuildToolbarFilter {
  id: string;
  /** Accessible name; also the visible label inside the mobile filters drawer. */
  label: string;
  control: ReactNode;
  /** Contributes to the mobile "Filters" badge and enables "Clear all". */
  active?: boolean;
}

export interface BuildToolbarSearch {
  value: string;
  onValueChange: (value: string) => void;
  placeholder: string;
  label?: string;
}

export const BUILD_TOOLBAR_FILTERS_LABEL = "Filters";
export const BUILD_TOOLBAR_CLEAR_LABEL = "Clear all";
export const BUILD_TOOLBAR_DRAWER_DESCRIPTION =
  "Narrow this list. Changes apply immediately; close the sheet to return to the results.";

export const BUILD_TOOLBAR_ROOT_CLASS =
  "flex w-full min-w-0 items-center gap-2 md:flex-nowrap md:overflow-x-auto md:overscroll-x-contain md:scrollbar-hide md:touch-pan-x";

export const BUILD_TOOLBAR_TRAILING_CLASS =
  "flex shrink-0 items-center gap-2 md:ml-auto";

/**
 * Below `md` a toolbar gets two equal slots at most, so more than two controls
 * collapse everything after the first into a drawer. The first slot is search
 * when there is one, because a list is searched far more often than it is
 * faceted; without search it is the most general filter the page declared
 * first.
 */
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
  const inlineCount = collapse ? (hasSearch ? 0 : 1) : list.length;

  const entries = list.map((filter, index) => ({
    filter,
    collapsed: collapse && index >= inlineCount,
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
  };
}
