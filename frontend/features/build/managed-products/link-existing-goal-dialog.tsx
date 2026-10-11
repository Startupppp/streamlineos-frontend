"use client";

import { useMemo, useState } from "react";
import { toast } from "sonner";
import { useGoals } from "@/hooks/api/goals";
import { useLinkGoalProduct } from "@/hooks/api/goals";
import { useDebouncedValue } from "@/hooks/common/use-debounce";
import { getErrorMessage } from "@/lib/get-error-message";
import { Button } from "@/components/ui/button";
import { Combobox } from "@/components/ui/combobox";
import { LoadingButton } from "@/components/ui/loading-button";
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
  const debouncedSearch = useDebouncedValue(search.trim(), 300);
  const goalsQuery = useGoals({ search: debouncedSearch || undefined, limit: 50 });
  const productGoalsQuery = useGoals({ managedProductId, limit: 100 }, { enabled: open });
  const isLoading = goalsQuery.isLoading || productGoalsQuery.isLoading;
  const isError = goalsQuery.isError || productGoalsQuery.isError;
  const data = goalsQuery.data;
  const productGoals = productGoalsQuery.data;
  const mutation = useLinkGoalProduct();

  const candidates = useMemo(() => {
    if (!data || !productGoals) return [];
    const linkedIds = new Set(productGoals.map((g) => g.id));
    return data.filter((g) => !linkedIds.has(g.id));
  }, [data, productGoals]);

  const options = useMemo(
    () =>
      candidates.map((g) => ({
        value: String(g.id),
        label: g.title,
        sublabel: g.level,
      })),
    [candidates],
  );

  const handleLink = () => {
    if (!selectedId || mutation.isPending) return;
    mutation.mutate(
      { goalId: selectedId, managedProductId },
      {
        onSuccess: () => {
          toast.success("Goal linked to product");
          setSelectedId(null);
          setSearch("");
          onOpenChange(false);
        },
        onError: (error) => toast.error(getErrorMessage(error)),
      },
    );
  };

  const handleGoalChange = (value: string) => {
    setSelectedId(value ? Number(value) : null);
  };

  const handleSearchChange = (value: string) => {
    setSearch(value);
  };

  const handleRetry = () => {
    if (goalsQuery.isError) void goalsQuery.refetch();
    if (productGoalsQuery.isError) void productGoalsQuery.refetch();
  };

  const handleCancel = () => {
    setSelectedId(null);
    setSearch("");
    onOpenChange(false);
  };

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
        <DialogBody>
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
              isError ? (
                <div className="border-t border-border p-2">
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    className="w-full"
                    onClick={handleRetry}
                  >
                    Retry
                  </Button>
                </div>
              ) : undefined
            }
          />
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
