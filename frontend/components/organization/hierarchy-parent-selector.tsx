"use client";

import { forwardRef, useId, useMemo, useState } from "react";
import type { ComponentPropsWithoutRef } from "react";
import { Check, LoaderCircle } from "lucide-react";
import { ChevronDownIcon } from "@animateicons/react/lucide";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { FIELD_CONTROL_CLASS } from "@/components/ui/field-control";
import {
  useHierarchyParentOptions,
  type HierarchyParentKind,
} from "@/hooks/api/org-hierarchy";
import { InfiniteScrollSentinel } from "@/components/ui/infinite-scroll-sentinel";
import { useAnimatedIcon } from "@/hooks/common/use-animated-icon";
import { useDebouncedValue } from "@/hooks/common/use-debounce";
import { getErrorMessage } from "@/lib/get-error-message";
import { cn } from "@/lib/utils";
import {
  mergeHierarchyParentOptions,
  type HierarchyParentOption,
} from "./hierarchy-parent-options";

interface HierarchyParentSelectorProps
  extends Pick<ComponentPropsWithoutRef<"button">, "id" | "aria-describedby" | "aria-invalid"> {
  parentKind: HierarchyParentKind;
  value: string;
  onValueChange: (parentValue: string) => void;
  label: string;
  placeholder: string;
  searchPlaceholder: string;
  emptyText: string;
  selectedLabel?: string | null;
  optionalLabel?: string;
  disabled?: boolean;
  className?: string;
}

interface HierarchyParentOptionItemProps {
  option: HierarchyParentOption;
  selected: boolean;
  onSelect: (option: HierarchyParentOption) => void;
}

function HierarchyParentOptionItem({
  option,
  selected,
  onSelect,
}: HierarchyParentOptionItemProps) {
  function handleSelect() {
    onSelect(option);
  }

  return (
    <CommandItem
      value={option.value}
      onSelect={handleSelect}
      aria-selected={selected}
    >
      <Check
        className={cn(
          "h-4 w-4 shrink-0",
          selected ? "opacity-100" : "opacity-0",
        )}
        aria-hidden="true"
      />
      <span className="truncate">{option.label}</span>
    </CommandItem>
  );
}

export const HierarchyParentSelector = forwardRef<HTMLButtonElement, HierarchyParentSelectorProps>(
function HierarchyParentSelector(
  {
    parentKind,
    value,
    onValueChange,
    label,
    placeholder,
    searchPlaceholder,
    emptyText,
    selectedLabel,
    optionalLabel,
    disabled = false,
    className,
    id: controlId,
    "aria-describedby": ariaDescribedBy,
    "aria-invalid": ariaInvalid,
  },
  forwardedRef,
) {
  const listId = useId();
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const initialSelection =
    value && selectedLabel ? { value, label: selectedLabel } : null;
  const [rememberedSelection, setRememberedSelection] =
    useState<HierarchyParentOption | null>(initialSelection);
  const debouncedSearch = useDebouncedValue(search, 300);
  const optionsQuery = useHierarchyParentOptions(
    parentKind,
    debouncedSearch,
    open,
  );
  const { iconRef, hoverHandlers } = useAnimatedIcon();

  const fetchedOptions = useMemo(
    () =>
      (optionsQuery.data?.pages ?? []).flatMap((page) =>
        page.data
          .filter(
            (parentRecord) =>
              parentRecord.status === "ACTIVE" && !parentRecord.deletedAt,
          )
          .map((parentRecord) => ({
            value: parentRecord.id,
            label: parentRecord.name,
          })),
      ),
    [optionsQuery.data?.pages],
  );

  const selectedOption = useMemo(() => {
    const fetchedSelection = fetchedOptions.find(
      (option) => option.value === value,
    );
    if (fetchedSelection) return fetchedSelection;
    if (rememberedSelection?.value === value) return rememberedSelection;
    if (value && selectedLabel) return { value, label: selectedLabel };
    return null;
  }, [fetchedOptions, rememberedSelection, selectedLabel, value]);

  const visibleOptions = useMemo(
    () => mergeHierarchyParentOptions(fetchedOptions, selectedOption),
    [fetchedOptions, selectedOption],
  );

  function handleOpenChange(nextOpen: boolean) {
    setOpen(nextOpen);
    if (!nextOpen) setSearch("");
  }

  function handleSearchChange(nextSearch: string) {
    setSearch(nextSearch);
  }

  function handleSelect(option: HierarchyParentOption) {
    setRememberedSelection(option);
    onValueChange(option.value);
    setOpen(false);
    setSearch("");
  }

  function handleClear() {
    setRememberedSelection(null);
    onValueChange("");
    setOpen(false);
    setSearch("");
  }

  function handleLoadMore() {
    void optionsQuery.fetchNextPage();
  }

  function handleRetry() {
    void optionsQuery.refetch();
  }

  return (
    <Popover open={open} onOpenChange={handleOpenChange}>
      <PopoverTrigger asChild>
        <Button
          ref={forwardedRef}
          id={controlId}
          type="button"
          variant="outline"
          role="combobox"
          aria-label={label}
          aria-expanded={open}
          aria-controls={listId}
          aria-describedby={ariaDescribedBy}
          aria-invalid={ariaInvalid}
          disabled={disabled}
          className={cn(
            FIELD_CONTROL_CLASS,
            "w-full min-w-0 justify-between gap-2 px-3 font-normal",
            !selectedOption && "text-muted-foreground",
            className,
          )}
          {...hoverHandlers}
        >
          <span className="truncate text-left">
            {selectedOption?.label ?? placeholder}
          </span>
          <ChevronDownIcon
            ref={iconRef}
            size={14}
            className="shrink-0 opacity-60"
            aria-hidden="true"
          />
        </Button>
      </PopoverTrigger>
      <PopoverContent
        align="start"
        className="w-[var(--radix-popover-trigger-width)] max-w-[calc(100vw-2rem)] p-0"
      >
        <Command shouldFilter={false}>
          <CommandInput
            value={search}
            onValueChange={handleSearchChange}
            placeholder={searchPlaceholder}
            aria-label={searchPlaceholder}
          />
          <CommandList id={listId} className="max-h-60">
            {optionsQuery.isLoading ? (
              <div
                className="flex items-center justify-center gap-2 px-3 py-6 text-sm text-muted-foreground"
                role="status"
              >
                <LoaderCircle className="h-4 w-4 animate-spin" aria-hidden="true" />
                Loading options…
              </div>
            ) : null}
            {optionsQuery.isError ? (
              <div className="space-y-2 px-3 py-4 text-center" role="alert">
                <p className="text-sm text-destructive">
                  {getErrorMessage(optionsQuery.error)}
                </p>
                <Button type="button" size="sm" variant="outline" onClick={handleRetry}>
                  Retry
                </Button>
              </div>
            ) : null}
            {!optionsQuery.isLoading &&
            !optionsQuery.isError &&
            visibleOptions.length === 0 ? (
              <p className="px-3 py-6 text-center text-sm text-muted-foreground">
                {emptyText}
              </p>
            ) : null}
            {!optionsQuery.isError ? (
              <CommandGroup>
                {optionalLabel ? (
                  <CommandItem
                    value="__no_parent__"
                    onSelect={handleClear}
                    aria-selected={!value}
                  >
                    <Check
                      className={cn(
                        "h-4 w-4 shrink-0",
                        value ? "opacity-0" : "opacity-100",
                      )}
                      aria-hidden="true"
                    />
                    <span>{optionalLabel}</span>
                  </CommandItem>
                ) : null}
                {visibleOptions.map((option) => (
                  <HierarchyParentOptionItem
                    key={option.value}
                    option={option}
                    selected={option.value === value}
                    onSelect={handleSelect}
                  />
                ))}
              </CommandGroup>
            ) : null}
            <InfiniteScrollSentinel
              hasNextPage={optionsQuery.hasNextPage && !optionsQuery.isError}
              isFetchingNextPage={optionsQuery.isFetchingNextPage}
              onLoadMore={handleLoadMore}
              label="Load more options"
              rootMargin="0px"
            />
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
});
