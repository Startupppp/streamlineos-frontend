"use client";

import { useCallback, useMemo, useState } from "react";
import { toast } from "sonner";
import { useGoals, useLinkGoalProduct } from "@/hooks/api/goals";
import { useDebouncedValue } from "@/hooks/common/use-debounce";
import { getErrorMessage } from "@/lib/get-error-message";
import { Button } from "@/components/ui/button";
import { Combobox } from "@/components/ui/combobox";
import type { ComboboxOption } from "@/components/ui/combobox";
import { InfiniteScrollSentinel } from "@/components/ui/infinite-scroll-sentinel";
import { LoadingButton } from "@/components/ui/loading-button";
import { ErrorState } from "@/components/shared/error-state";
import { useLinkGoalCandidates } from "./use-infinite-selector";
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface LinkExistingGoalDialogProps {
  managedProductId: number;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function LinkExistingGoalDialog({
  managedProductId,
  open,
  onOpenChange,
}: LinkExistingGoalDialogProps) {
  const [search, setSearch] = useState("");
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [selectedLabel, setSelectedLabel] = useState("");
  const debouncedSearch = useDebouncedValue(search.trim(), 300);

  const goalsQuery = useLinkGoalCandidates({
    search: debouncedSearch || undefined,
    enabled: open,
  });
  const productGoalsQuery = useGoals(
    { managedProductId, limit: 100 },
    { enabled: open },
  );
  const mutation = useLinkGoalProduct();

  const isLoading = goalsQuery.isLoading || productGoalsQuery.isLoading;
  const isError = goalsQuery.isError || productGoalsQuery.isError;
  const errorObj = goalsQuery.error ?? productGoalsQuery.error;
  const productGoals = productGoalsQuery.data;

  const { hasNextPage, isFetchingNextPage, fetchNextPage } = goalsQuery;

  const handleLoadMore = useCallback(() => {
    if (hasNextPage && !isFetchingNextPage) void fetchNextPage();
  }, [fetchNextPage, hasNextPage, isFetchingNextPage]);

  const candidates = useMemo(() => {
    if (!productGoals) return [];
    const allItems = (goalsQuery.data?.pages ?? []).flatMap((p) => p.items);
    const linkedIds = new Set(productGoals.map((g) => g.id));
    return allItems.filter((g) => !linkedIds.has(g.id));
  }, [goalsQuery.data, productGoals]);

  const options = useMemo<ComboboxOption[]>(() => {
    const opts: ComboboxOption[] = candidates.map((g) => ({
      value: String(g.id),
      label: g.title,
      sublabel: g.level,
    }));
    if (
      selectedId !== null &&
      !opts.find((o) => o.value === String(selectedId))
    )
      opts.unshift({
        value: String(selectedId),
        label: selectedLabel || String(selectedId),
      });

    return opts;
  }, [candidates, selectedId, selectedLabel]);

  function handleRetry() {
    if (goalsQuery.isError) void goalsQuery.refetch();
    if (productGoalsQuery.isError) void productGoalsQuery.refetch();
  }

  function handleGoalChange(value: string, label?: string) {
    setSelectedId(value ? Number(value) : null);
    if (label) setSelectedLabel(label);
  }

  function handleSearchChange(value: string) {
    setSearch(value);
  }

  function handleCancel() {
    setSelectedId(null);
    setSearch("");
    setSelectedLabel("");
    onOpenChange(false);
  }

  function handleLink() {
    if (!selectedId || mutation.isPending) return;
    mutation.mutate(
      { goalId: selectedId, managedProductId },
      {
        onSuccess: () => {
          toast.success("Goal linked to product");
          setSelectedId(null);
          setSearch("");
          setSelectedLabel("");
          onOpenChange(false);
        },
        onError: (e) => toast.error(getErrorMessage(e)),
      },
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Link existing goal</DialogTitle>
          <DialogDescription>
            Search for an org goal to link to this product. The goal will appear
            on this product{"'"}s Goals tab. Unlinking removes the association
            but never deletes the goal.
          </DialogDescription>
        </DialogHeader>
        <DialogBody className="flex flex-col gap-3">
          <Combobox
            aria-label="Select a goal to link"
            options={options}
            value={selectedId === null ? "" : String(selectedId)}
            onChange={handleGoalChange}
            onSearchChange={handleSearchChange}
            placeholder="Search goals…"
            searchPlaceholder="Search by goal title…"
            emptyText={
              isLoading
                ? "Loading goals…"
                : isError
                  ? "Could not load goals."
                  : "No unlinked goals found."
            }
            footer={
              <InfiniteScrollSentinel
                hasNextPage={!isError && hasNextPage}
                isFetchingNextPage={isFetchingNextPage}
                onLoadMore={handleLoadMore}
                label="Load more goals"
              />
            }
          />
          {isError && (
            <ErrorState
              compact
              error={errorObj}
              description={getErrorMessage(errorObj)}
              onRetry={handleRetry}
            />
          )}
          {selectedLabel ? (
            <p className="text-pretty text-sm text-muted-foreground">
              <span className="font-medium text-foreground">
                {selectedLabel}
              </span>{" "}
              will appear on this product{"'"}s Goals tab.
            </p>
          ) : null}
        </DialogBody>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={handleCancel}>
            Cancel
          </Button>
          <LoadingButton
            type="button"
            disabled={!selectedId}
            isPending={mutation.isPending}
            onClick={handleLink}
          >
            Link goal
          </LoadingButton>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
