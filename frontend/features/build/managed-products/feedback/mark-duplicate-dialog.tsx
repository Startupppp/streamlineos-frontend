"use client";

import { useCallback, useMemo, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { LoadingButton } from "@/components/ui/loading-button";
import { useFeedbucketSubmissions } from "@/hooks/api/feedbucket/use-feedbucket-submissions";
import { useMarkDuplicate } from "@/hooks/api/feedbucket/use-feedbucket-submissions";
import { toast } from "sonner";
import { getErrorMessage } from "@/lib/get-error-message";
import { useDebouncedValue } from "@/hooks/common/use-debounce";

interface MarkDuplicateDialogProps {
  managedProductId: number;
  submissionId: number;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function MarkDuplicateDialog({
  managedProductId,
  submissionId,
  open,
  onOpenChange,
}: MarkDuplicateDialogProps) {
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebouncedValue(search, 350);
  const [selectedId, setSelectedId] = useState<number | null>(null);

  const { data, isLoading } = useFeedbucketSubmissions({
    managedProductId,
    search: debouncedSearch.trim() || undefined,
    limit: 10,
    page: 1,
  });

  const candidates = useMemo(
    () => (data?.data ?? []).filter((r) => r.id !== submissionId),
    [data, submissionId],
  );

  const markDuplicate = useMarkDuplicate();

  const handleSearchChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setSearch(e.target.value);
    setSelectedId(null);
  }, []);

  const handleSelect = useCallback((id: number) => {
    setSelectedId(id);
  }, []);

  const handleConfirm = useCallback(() => {
    if (selectedId === null) return;
    markDuplicate.mutate(
      { submissionId, duplicateOfId: selectedId },
      {
        onSuccess: () => {
          toast.success("Marked as duplicate");
          onOpenChange(false);
          setSearch("");
          setSelectedId(null);
        },
        onError: (err) => { toast.error(getErrorMessage(err)); },
      },
    );
  }, [selectedId, submissionId, markDuplicate, onOpenChange]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Mark as duplicate</DialogTitle>
          <DialogDescription>
            Search for the original submission this is a duplicate of.
          </DialogDescription>
        </DialogHeader>
        <div className="flex flex-col gap-3">
          <Input
            placeholder="Search submissions…"
            value={search}
            onChange={handleSearchChange}
            aria-label="Search submissions for duplicate"
          />
          <div className="flex flex-col gap-1 max-h-64 overflow-y-auto">
            {isLoading ? (
              <p className="text-sm text-muted-foreground py-2">Loading submissions…</p>
            ) : candidates.length === 0 ? (
              <p className="text-sm text-muted-foreground py-2">No submissions found.</p>
            ) : (
              candidates.map((row) => (
                <button
                  key={row.id}
                  type="button"
                  onClick={() => handleSelect(row.id)}
                  className={`text-left px-3 py-2 rounded-md text-sm border transition-colors ${
                    selectedId === row.id
                      ? "border-primary bg-primary/5 text-foreground"
                      : "border-border hover:bg-muted"
                  }`}
                >
                  <span className="font-mono text-xs text-muted-foreground mr-2">#{row.id}</span>
                  <span className="line-clamp-1">{row.message}</span>
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
              isPending={markDuplicate.isPending}
              onClick={handleConfirm}
            >
              Mark duplicate
            </LoadingButton>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
