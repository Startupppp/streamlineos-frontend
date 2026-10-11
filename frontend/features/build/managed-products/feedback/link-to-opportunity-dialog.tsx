"use client";

import { useCallback, useMemo, useState } from "react";
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { LoadingButton } from "@/components/ui/loading-button";
import { toast } from "sonner";
import { getErrorMessage } from "@/lib/get-error-message";
import { useDebouncedValue } from "@/hooks/common/use-debounce";
import {
  useProductOpportunitiesSearch,
  useAddEvidenceToOpportunity,
  type OpportunityMinimal,
} from "./use-submission-opportunities";
import { FeedbackPickList } from "./feedback-pick-list";

interface LinkToOpportunityDialogProps {
  managedProductId: number;
  submissionId: number;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

function opportunityId(item: OpportunityMinimal): number {
  return item.id;
}

function opportunityTitle(item: OpportunityMinimal): string {
  return item.title;
}

function opportunityState(item: OpportunityMinimal): string {
  return item.state.replaceAll("_", " ");
}

export function LinkToOpportunityDialog({
  managedProductId,
  submissionId,
  open,
  onOpenChange,
}: LinkToOpportunityDialogProps) {
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebouncedValue(search, 350);
  const [selectedId, setSelectedId] = useState<number | null>(null);

  const { data, isLoading } = useProductOpportunitiesSearch(managedProductId, debouncedSearch);
  const opportunities = useMemo(() => data?.data ?? [], [data]);
  const addEvidence = useAddEvidenceToOpportunity();

  const handleSearchChange = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    setSearch(event.target.value);
    setSelectedId(null);
  }, []);

  const handleSelect = useCallback((id: number) => {
    setSelectedId(id);
  }, []);

  const handleCancel = useCallback(() => {
    onOpenChange(false);
  }, [onOpenChange]);

  const handleConfirm = useCallback(() => {
    if (selectedId === null) return;
    addEvidence.mutate(
      { managedProductId, opportunityId: selectedId, submissionId },
      {
        onSuccess: () => {
          toast.success("Linked to opportunity");
          onOpenChange(false);
          setSearch("");
          setSelectedId(null);
        },
        onError: (err) => { toast.error(getErrorMessage(err)); },
      },
    );
  }, [selectedId, managedProductId, submissionId, addEvidence, onOpenChange]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Link to opportunity</DialogTitle>
          <DialogDescription>
            Search and select an opportunity to link this feedback as evidence.
          </DialogDescription>
        </DialogHeader>
        <DialogBody className="flex flex-col gap-3">
          <Input
            placeholder="Search opportunities…"
            value={search}
            onChange={handleSearchChange}
            aria-label="Search opportunities"
          />
          <FeedbackPickList
            items={opportunities}
            selectedId={selectedId}
            onSelect={handleSelect}
            getId={opportunityId}
            getLabel={opportunityTitle}
            getMeta={opportunityState}
            isLoading={isLoading}
            loadingText="Loading opportunities…"
            emptyText="No opportunities found."
            label="Opportunities"
          />
        </DialogBody>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={handleCancel}>
            Cancel
          </Button>
          <LoadingButton
            type="button"
            disabled={selectedId === null}
            isPending={addEvidence.isPending}
            onClick={handleConfirm}
          >
            Link
          </LoadingButton>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
