"use client";

import { useCallback, useMemo } from "react";
import type { UseFormReturn } from "react-hook-form";
import { FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { FIELD_CONTROL_CLASS } from "@/components/ui/field-control";
import { ErrorState } from "@/components/shared/error-state";
import { useDebouncedValue } from "@/hooks/common/use-debounce";
import { useState } from "react";
import type { AcceptFormValues } from "./opportunity-accept-schema";
import { InfiniteScrollSentinel } from "@/components/ui/infinite-scroll-sentinel";
import { useInfiniteSelectorRoadmapItems } from "../use-infinite-selector";

interface AcceptRoadmapFieldProps {
  form: UseFormReturn<AcceptFormValues>;
  managedProductId: number;
  enabled: boolean;
}

export function AcceptRoadmapField({ form, managedProductId, enabled }: AcceptRoadmapFieldProps) {
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebouncedValue(search, 300);

  const {
    data: pages,
    isError,
    error,
    refetch,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useInfiniteSelectorRoadmapItems(managedProductId, debouncedSearch, enabled);

  const roadmapItems = useMemo(
    () => pages?.pages.flatMap((p) => p.data) ?? [],
    [pages],
  );

  const handleSearchChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setSearch(e.target.value);
  }, []);

  const handleFetchNext = useCallback(() => {
    if (hasNextPage && !isFetchingNextPage) void fetchNextPage();
  }, [fetchNextPage, hasNextPage, isFetchingNextPage]);

  const handleRetry = useCallback(() => void refetch(), [refetch]);

  if (isError) {
    return (
      <div>
        <p className="text-sm font-medium mb-1">Depends on (optional)</p>
        <ErrorState compact onRetry={handleRetry} error={error} />
      </div>
    );
  }

  if (!isError && roadmapItems.length === 0 && !debouncedSearch) return null;

  return (
    <FormField
      control={form.control}
      name="dependsOnIds"
      render={({ field }) => {
        const selected: number[] = field.value ?? [];
        const toggle = (id: number) => {
          const next = selected.includes(id)
            ? selected.filter((x) => x !== id)
            : [...selected, id];
          field.onChange(next.length > 0 ? next : undefined);
        };
        return (
          <FormItem>
            <FormLabel>Depends on (optional)</FormLabel>
            <Input
              value={search}
              onChange={handleSearchChange}
              placeholder="Search roadmap items…"
              className={FIELD_CONTROL_CLASS}
              data-testid="roadmap-search-input"
            />
            <div
              className="rounded-md border border-input max-h-36 overflow-y-auto"
              data-testid="depends-on-list"
            >
              {roadmapItems.map((item) => (
                <label
                  key={item.id}
                  className="flex items-center gap-2 px-3 py-2 text-sm cursor-pointer hover:bg-accent"
                >
                  <Checkbox
                    checked={selected.includes(item.id)}
                    onCheckedChange={() => toggle(item.id)}
                  />
                  {item.title}
                </label>
              ))}
              <InfiniteScrollSentinel
                hasNextPage={hasNextPage}
                isFetchingNextPage={isFetchingNextPage}
                onLoadMore={handleFetchNext}
                label="Load more roadmap items"
              />
            </div>
            <FormMessage />
          </FormItem>
        );
      }}
    />
  );
}
