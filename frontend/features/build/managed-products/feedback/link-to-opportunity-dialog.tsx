"use client";

import { useCallback, useMemo, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { LoadingButton } from "@/components/ui/loading-button";
import { toast } from "sonner";
import { getErrorMessage } from "@/lib/get-error-message";
import { useDebouncedValue } from "@/hooks/common/use-debounce";
import { useProductOpportunitiesSearch, useAddEvidenceToOpportunity } from "./use-submission-opportunities";

interface LinkToOpportunityDialogProps {
  managedProductId: number;
  submissionId: number;
  open: boolean;
  onOpenChange: (open: boolean) => void;
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

  const { data } = useProductOpportunitiesSearch(managedProductId, debouncedSearch);

  const opportunities = useMemo(() => data?.data ?? [], [data]);

  const addEvidence = useAddEvidenceToOpportunity();

  const handleSearchChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setSearch(e.target.value);
    setSelectedId(null);
  }, []);

  const handleSelect = useCallback((id: number) => {
    setSelectedId(id);
  }, []);

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
        <div className="flex flex-col gap-3">
          <Input
            placeholder="Search opportunities…"
            value={search}
            onChange={handleSearchChange}
            aria-label="Search opportunities"
          />
          <div className="flex flex-col gap-1 max-h-64 overflow-y-auto">
            {opportunities.length === 0 ? (
              <p className="text-sm text-muted-foreground py-2">No opportunities found.</p>
            ) : (
              opportunities.map((opp) => (
                <button
                  key={opp.id}
                  type="button"
                  onClick={() => handleSelect(opp.id)}
                  className={`text-left px-3 py-2 rounded-md text-sm border transition-colors ${
                    selectedId === opp.id
                      ? "border-primary bg-primary/5 text-foreground"
                      : "border-border hover:bg-muted"
                  }`}
                >
                  <span className="line-clamp-1">{opp.title}</span>
                  <span className="text-xs text-muted-foreground ml-2">{opp.state}</span>
                </button>
              ))
            )}
          </div>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
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
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
