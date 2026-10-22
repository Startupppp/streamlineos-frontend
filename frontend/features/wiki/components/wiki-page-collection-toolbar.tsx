"use client";

import { useState, type ReactNode } from "react";
import { LayoutGrid, LayoutList, SlidersHorizontal } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  ResponsivePopover,
  ResponsivePopoverContent,
  ResponsivePopoverTrigger,
} from "@/components/ui/responsive-popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ViewToggle, type ViewOption } from "@/components/ui/view-toggle";

export const SORT_OPTIONS = [
  { value: "updated_desc", label: "Last updated" },
  { value: "created_desc", label: "Newest" },
  { value: "title_asc", label: "Title A–Z" },
] as const;

export const STATUS_OPTIONS = [
  { value: "draft", label: "Draft" },
  { value: "in_review", label: "In review" },
  { value: "published", label: "Published" },
  { value: "archived", label: "Archived" },
] as const;

export const KIND_OPTIONS = [
  { value: "document", label: "Document" },
  { value: "spreadsheet", label: "Spreadsheet" },
] as const;

export const VIEW_VALUES = ["list", "card"] as const;
export type CollectionView = (typeof VIEW_VALUES)[number];

const VIEW_OPTIONS: ViewOption<CollectionView>[] = [
  { value: "list", icon: LayoutList, label: "List view" },
  { value: "card", icon: LayoutGrid, label: "Card view" },
];

interface SpaceOption {
  id: number;
  name: string;
}

interface WikiPageCollectionToolbarProps {
  status: string;
  kind: "document" | "spreadsheet" | undefined;
  owner: "me" | undefined;
  showOwnerFilter: boolean;
  spaceParam: string;
  spaces: SpaceOption[] | undefined;
  showSpaceFilter: boolean;
  sort: string;
  view: CollectionView;
  documentCountLabel: string | null;
  activeFilterCount: number;
  onStatusChange: (value: string) => void;
  onKindChange: (value: string) => void;
  onOwnerChange: (value: string) => void;
  onSpaceChange: (value: string) => void;
  onSortChange: (value: string) => void;
  onViewChange: (value: CollectionView) => void;
  onClearFilters: () => void;
}

function FilterField({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <div className="flex w-full min-w-0 flex-col gap-1.5">
      <Label className="text-sm font-normal text-foreground">{label}</Label>
      {children}
    </div>
  );
}

function FilterFields({
  status,
  kind,
  owner,
  showOwnerFilter,
  spaceParam,
  spaces,
  showSpaceFilter,
  sort,
  onStatusChange,
  onKindChange,
  onOwnerChange,
  onSpaceChange,
  onSortChange,
}: Pick<
  WikiPageCollectionToolbarProps,
  | "status"
  | "kind"
  | "owner"
  | "showOwnerFilter"
  | "spaceParam"
  | "spaces"
  | "showSpaceFilter"
  | "sort"
  | "onStatusChange"
  | "onKindChange"
  | "onOwnerChange"
  | "onSpaceChange"
  | "onSortChange"
>) {
  return (
    <>
      <FilterField label="Status">
        <Select value={status || "all"} onValueChange={onStatusChange}>
          <SelectTrigger className="h-9 w-full" aria-label="Status">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            {STATUS_OPTIONS.map((opt) => (
              <SelectItem key={opt.value} value={opt.value}>
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </FilterField>
      <FilterField label="Type">
        <Select value={kind ?? "all"} onValueChange={onKindChange}>
          <SelectTrigger className="h-9 w-full" aria-label="Type">
            <SelectValue placeholder="Type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All types</SelectItem>
            {KIND_OPTIONS.map((opt) => (
              <SelectItem key={opt.value} value={opt.value}>
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </FilterField>
      {showOwnerFilter && (
        <FilterField label="Owner">
          <Select value={owner ?? "all"} onValueChange={onOwnerChange}>
            <SelectTrigger className="h-9 w-full" aria-label="Owner">
              <SelectValue placeholder="Owner" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Anyone</SelectItem>
              <SelectItem value="me">Me</SelectItem>
            </SelectContent>
          </Select>
        </FilterField>
      )}
      {showSpaceFilter && spaces && spaces.length > 0 && (
        <FilterField label="Team folder">
          <Select value={spaceParam || "all"} onValueChange={onSpaceChange}>
            <SelectTrigger className="h-9 w-full" aria-label="Team folder">
              <SelectValue placeholder="Team folder" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All team folders</SelectItem>
              {spaces.map((space) => (
                <SelectItem key={space.id} value={String(space.id)}>
                  {space.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </FilterField>
      )}
      <FilterField label="Sort">
        <Select value={sort} onValueChange={onSortChange}>
          <SelectTrigger className="h-9 w-full" aria-label="Sort">
            <SelectValue placeholder="Sort" />
          </SelectTrigger>
          <SelectContent>
            {SORT_OPTIONS.map((opt) => (
              <SelectItem key={opt.value} value={opt.value}>
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </FilterField>
    </>
  );
}

export function WikiPageCollectionToolbar({
  status,
  kind,
  owner,
  showOwnerFilter,
  spaceParam,
  spaces,
  showSpaceFilter,
  sort,
  view,
  documentCountLabel,
  activeFilterCount,
  onStatusChange,
  onKindChange,
  onOwnerChange,
  onSpaceChange,
  onSortChange,
  onViewChange,
  onClearFilters,
}: WikiPageCollectionToolbarProps) {
  const [filtersOpen, setFiltersOpen] = useState(false);

  function handleClearFilters() {
    onClearFilters();
    setFiltersOpen(false);
  }

  const filtersLabel =
    activeFilterCount > 0
      ? `Filters (${activeFilterCount} active)`
      : "Filters";

  return (
    <>
      <ResponsivePopover open={filtersOpen} onOpenChange={setFiltersOpen}>
        <ResponsivePopoverTrigger asChild>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-9 gap-1.5"
            aria-label={filtersLabel}
          >
            <SlidersHorizontal className="h-4 w-4 shrink-0" aria-hidden="true" />
            Filters
            {activeFilterCount > 0 ? (
              <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-primary/10 px-1 text-dense font-normal tabular-nums text-foreground">
                {activeFilterCount}
              </span>
            ) : null}
          </Button>
        </ResponsivePopoverTrigger>
        <ResponsivePopoverContent
          align="end"
          title="Filters"
          description="Narrow this list. Changes apply immediately."
          aria-label="Filters"
          drawerClassName="w-full max-w-none"
          className="flex w-72 max-w-[calc(100vw-2rem)] flex-col gap-0 overflow-hidden p-0"
        >
          <div className="flex flex-col gap-4 p-4">
            <FilterFields
              status={status}
              kind={kind}
              owner={owner}
              showOwnerFilter={showOwnerFilter}
              spaceParam={spaceParam}
              spaces={spaces}
              showSpaceFilter={showSpaceFilter}
              sort={sort}
              onStatusChange={onStatusChange}
              onKindChange={onKindChange}
              onOwnerChange={onOwnerChange}
              onSpaceChange={onSpaceChange}
              onSortChange={onSortChange}
            />
            {activeFilterCount > 0 && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="w-full"
                onClick={handleClearFilters}
              >
                Clear filters
              </Button>
            )}
          </div>
        </ResponsivePopoverContent>
      </ResponsivePopover>

      <div className="ml-auto flex shrink-0 items-center gap-2">
        {documentCountLabel !== null && (
          <span className="text-sm text-muted-foreground tabular-nums">
            {documentCountLabel}
          </span>
        )}
        <ViewToggle
          value={view}
          options={VIEW_OPTIONS}
          onChange={onViewChange}
        />
      </div>
    </>
  );
}
