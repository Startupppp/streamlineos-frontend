import type { ReactNode, RefObject } from "react";

type BuildToolbarFilterPresentation = "field" | "trigger";

export interface BuildToolbarFilter {
  id: string;
  label: string;
  control: ReactNode;
  active?: boolean;
  presentation?: BuildToolbarFilterPresentation;
}

export interface BuildToolbarSearch {
  value: string;
  onValueChange: (value: string) => void;
  placeholder: string;
  label?: string;
  inputRef?: RefObject<HTMLInputElement | null>;
  inputClassName?: string;
}

export const BUILD_TOOLBAR_FILTERS_LABEL = "Filters";
export const BUILD_TOOLBAR_CLEAR_LABEL = "Clear all";
export const BUILD_TOOLBAR_DRAWER_DESCRIPTION =
  "Narrow this list. Changes apply immediately; close the sheet to return to the results.";

export const BUILD_TOOLBAR_ROOT_CLASS =
  "flex w-full min-w-0 flex-wrap items-center gap-2 md:overflow-x-hidden";

export const BUILD_TOOLBAR_TRAILING_CLASS =
  "flex min-w-0 shrink-0 items-center gap-2 md:ml-auto";

const BUILD_TOOLBAR_MOBILE_SLOTS = 2;
/** Selects kept on the toolbar. Tablet and desktop share the wider count. */
const MOBILE_INLINE_FILTERS = 2;
const WIDE_INLINE_FILTERS = 3;

interface BuildToolbarLayoutEntry {
  filter: BuildToolbarFilter;
  collapsed: boolean;
  fieldIndex: number | null;
}

interface BuildToolbarLayout {
  collapse: boolean;
  filters: BuildToolbarLayoutEntry[];
  fieldFilterCount: number;
  collapsedActiveCount: number;
  activeCount: number;
  anyActive: boolean;
  mobileColumns: string;
}

export function isToolbarFieldFilter(filter: BuildToolbarFilter): boolean {
  return filter.presentation !== "trigger";
}

export function isToolbarMobileSearchExpanded({
  isMobile,
  focused,
}: {
  isMobile: boolean;
  focused: boolean;
}): boolean {
  return isMobile && focused;
}

export function buildToolbarLayout({
  search,
  filters,
}: {
  search?: BuildToolbarSearch;
  filters?: readonly BuildToolbarFilter[];
  trailing?: boolean;
}): BuildToolbarLayout {
  const list = filters ?? [];
  const hasSearch = search !== undefined;
  const fieldFilters = list.filter(isToolbarFieldFilter);
  const fieldSlotCount = (hasSearch ? 1 : 0) + fieldFilters.length;
  const collapse = fieldSlotCount > BUILD_TOOLBAR_MOBILE_SLOTS;
  const inlineFieldCount = collapse ? (hasSearch ? 0 : 1) : fieldFilters.length;

  let fieldIndex = 0;
  const entries = list.map((filter) => {
    if (!isToolbarFieldFilter(filter)) {
      return { filter, collapsed: false, fieldIndex: null };
    }
    const indexAmongFields = fieldIndex;
    fieldIndex += 1;
    return {
      filter,
      collapsed: collapse && indexAmongFields >= inlineFieldCount,
      fieldIndex: indexAmongFields,
    };
  });

  const activeCount = list.filter((filter) => filter.active).length;
  const collapsedActiveCount = entries.filter(
    (entry) => entry.collapsed && entry.filter.active,
  ).length;

  return {
    collapse,
    filters: entries,
    fieldFilterCount: fieldFilters.length,
    collapsedActiveCount,
    activeCount,
    anyActive: activeCount > 0 || Boolean(search?.value),
    mobileColumns: "",
  };
}

export function toolbarInlineVisibility(
  index: number,
  _collapsed: boolean,
  _fieldFilterCount: number,
): string {
  if (index < MOBILE_INLINE_FILTERS) return "";
  if (index < WIDE_INLINE_FILTERS) return "max-md:hidden";
  return "hidden";
}

export function toolbarDrawerVisibility(
  index: number,
  _collapsed: boolean,
  _fieldFilterCount: number,
): string {
  if (index < MOBILE_INLINE_FILTERS) return "hidden";
  if (index < WIDE_INLINE_FILTERS) return "md:hidden";
  return "";
}

export function toolbarMoreButtonClass(
  filterCount: number,
  _collapse: boolean,
): string {
  if (filterCount <= MOBILE_INLINE_FILTERS) return "hidden";
  if (filterCount <= WIDE_INLINE_FILTERS) return "inline-flex shrink-0 md:hidden";
  return "inline-flex shrink-0";
}
