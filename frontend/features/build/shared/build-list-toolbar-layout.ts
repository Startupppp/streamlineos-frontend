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
  "grid w-full min-w-0 items-center gap-2 md:flex md:flex-wrap md:overflow-x-hidden";

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

/**
 * How many filters stay inline as the viewport grows.
 * Index 0 is always outside. Later filters move into the Filters menu
 * until there is room: 1 at md, 2 at lg, 3 at xl, 4 from 2xl.
 */
export function toolbarInlineVisibility(index: number, collapsed: boolean): string {
  const mobile = collapsed ? "max-md:hidden" : "max-md:w-full";
  const desktop =
    index <= 0
      ? ""
      : index === 1
        ? "md:hidden lg:block"
        : index === 2
          ? "md:hidden xl:block"
          : index === 3
            ? "md:hidden 2xl:block"
            : "md:hidden";
  return [mobile, desktop].filter(Boolean).join(" ");
}

/** Drawer copy of a filter. Hidden wherever that filter is already inline. */
export function toolbarDrawerVisibility(index: number, collapsed: boolean): string {
  if (index <= 0) return collapsed ? "md:hidden" : "hidden";
  if (!collapsed) {
    if (index === 1) return "hidden md:block lg:hidden";
    if (index === 2) return "hidden md:block xl:hidden";
    if (index === 3) return "hidden md:block 2xl:hidden";
    return "hidden md:block";
  }
  if (index === 1) return "lg:hidden";
  if (index === 2) return "xl:hidden";
  if (index === 3) return "2xl:hidden";
  return "";
}

/** Filters button: mobile drawer, plus desktop whenever a filter would overflow. */
export function toolbarMoreButtonClass(filterCount: number, collapse: boolean): string {
  const mobile = collapse ? "inline-flex w-full" : "hidden";
  if (filterCount <= 1) return `${mobile} md:hidden`;
  if (filterCount === 2) return `${mobile} md:inline-flex md:w-auto lg:hidden`;
  if (filterCount === 3) return `${mobile} md:inline-flex md:w-auto xl:hidden`;
  if (filterCount === 4) return `${mobile} md:inline-flex md:w-auto 2xl:hidden`;
  return `${mobile} md:inline-flex md:w-auto`;
}
