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
  "flex w-full min-w-0 flex-wrap items-center gap-2 md:flex-nowrap md:overflow-x-hidden";

export const BUILD_TOOLBAR_TRAILING_CLASS =
  "flex min-w-0 shrink-0 items-center gap-2 md:ml-auto";

const BUILD_TOOLBAR_MOBILE_SLOTS = 2;

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

export interface BuildToolbarRow {
  mobile: number;
  tablet: number;
  desktop: number;
}

function resolveToolbarRow(row?: BuildToolbarRow): BuildToolbarRow {
  const mobile = Math.max(0, row?.mobile ?? 2);
  const tablet = Math.max(mobile, row?.tablet ?? 2);
  const desktop = Math.max(tablet, row?.desktop ?? 3);
  return { mobile, tablet, desktop };
}

export function toolbarInlineVisibility(
  index: number,
  _collapsed: boolean,
  _fieldFilterCount: number,
  row?: BuildToolbarRow,
): string {
  const resolved = resolveToolbarRow(row);
  if (index < resolved.mobile) return "";
  if (index < resolved.tablet) return "max-md:hidden";
  if (index < resolved.desktop) return "max-lg:hidden";
  return "hidden";
}

export function toolbarDrawerVisibility(
  index: number,
  _collapsed: boolean,
  _fieldFilterCount: number,
  row?: BuildToolbarRow,
): string {
  const resolved = resolveToolbarRow(row);
  if (index < resolved.mobile) return "hidden";
  if (index < resolved.tablet) return "md:hidden";
  if (index < resolved.desktop) return "lg:hidden";
  return "";
}

export function toolbarMoreButtonClass(
  filterCount: number,
  _collapse: boolean,
  row?: BuildToolbarRow,
): string {
  const resolved = resolveToolbarRow(row);
  if (filterCount <= resolved.mobile) return "hidden";
  if (filterCount <= resolved.tablet) return "inline-flex shrink-0 md:hidden";
  if (filterCount <= resolved.desktop) return "inline-flex shrink-0 lg:hidden";
  return "inline-flex shrink-0";
}
