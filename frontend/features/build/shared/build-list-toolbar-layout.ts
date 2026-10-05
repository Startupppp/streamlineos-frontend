import type { ReactNode, RefObject } from "react";

export type BuildToolbarFilterPresentation = "field" | "trigger";

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
}

export const BUILD_TOOLBAR_FILTERS_LABEL = "Filters";
export const BUILD_TOOLBAR_CLEAR_LABEL = "Clear all";
export const BUILD_TOOLBAR_DRAWER_DESCRIPTION =
  "Narrow this list. Changes apply immediately; close the sheet to return to the results.";

export const BUILD_TOOLBAR_ROOT_CLASS =
  "flex w-full min-w-0 flex-wrap items-center gap-2 md:overflow-x-hidden";

export const BUILD_TOOLBAR_TRAILING_CLASS =
  "flex min-w-0 shrink-0 items-center gap-2 md:ml-auto";

export const BUILD_TOOLBAR_MOBILE_SLOTS = 2;

export interface BuildToolbarLayoutEntry {
  filter: BuildToolbarFilter;
  collapsed: boolean;
  fieldIndex: number | null;
}

export interface BuildToolbarLayout {
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

function mobileColumnsFor({
  hasSearch,
  inlineFieldCount,
}: {
  hasSearch: boolean;
  inlineFieldCount: number;
}): string {
  if (hasSearch) return "";
  if (inlineFieldCount <= 0) return "";
  if (inlineFieldCount === 1)
    return "[&_[data-slot=build-toolbar-filter]]:max-md:flex-1";
  return "[&_[data-slot=build-toolbar-filter]]:max-md:min-w-0 [&_[data-slot=build-toolbar-filter]]:max-md:flex-1";
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
    mobileColumns: mobileColumnsFor({
      hasSearch,
      inlineFieldCount,
    }),
  };
}

export function toolbarInlineVisibility(
  index: number,
  collapsed: boolean,
  fieldFilterCount: number,
): string {
  const mobile = collapsed ? "max-md:hidden" : "max-md:min-w-0 max-md:shrink-0";
  const desktop =
    index <= 0
      ? ""
      : index === 1
        ? fieldFilterCount === 2
          ? ""
          : "md:hidden lg:block"
        : index === 2
          ? fieldFilterCount === 3
            ? "md:hidden lg:block"
            : "md:hidden xl:block"
          : index === 3
            ? fieldFilterCount === 4
              ? "md:hidden xl:block"
              : "md:hidden 2xl:block"
            : index === 4 && fieldFilterCount === 5
              ? "md:hidden 2xl:block"
              : "md:hidden";
  return [mobile, desktop].filter(Boolean).join(" ");
}

export function toolbarDrawerVisibility(
  index: number,
  collapsed: boolean,
  fieldFilterCount: number,
): string {
  if (index <= 0) return collapsed ? "md:hidden" : "hidden";
  if (index === 1 && fieldFilterCount === 2)
    return collapsed ? "md:hidden" : "hidden";
  if (index === 2 && fieldFilterCount === 3) return "lg:hidden";
  if (index === 3 && fieldFilterCount === 4) return "xl:hidden";
  if (index === 4 && fieldFilterCount === 5) return "2xl:hidden";
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

export function toolbarMoreButtonClass(
  filterCount: number,
  collapse: boolean,
): string {
  const mobile = collapse ? "inline-flex shrink-0" : "hidden";
  if (filterCount <= 2) return `${mobile} md:hidden`;
  if (filterCount === 3) return `${mobile} md:inline-flex lg:hidden`;
  if (filterCount === 4) return `${mobile} md:inline-flex xl:hidden`;
  if (filterCount === 5) return `${mobile} md:inline-flex 2xl:hidden`;
  return `${mobile} md:inline-flex`;
}
