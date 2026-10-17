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
import { TablePagination, useCursorPager } from "@/components/ui/table-pagination";
import { useFeedbucketSubmissions } from "@/hooks/api/feedbucket/use-feedbucket-submissions";
import { useMarkDuplicate } from "@/hooks/api/feedbucket/use-feedbucket-submissions";
import { toast } from "sonner";
import { getErrorMessage } from "@/lib/get-error-message";
import { ErrorState } from "@/components/shared/error-state";
import { useDebouncedValue } from "@/hooks/common/use-debounce";
import { FeedbackPickList } from "./feedback-pick-list";

const PICKER_PAGE_SIZE = 25;

interface MarkDuplicateDialogProps {
  managedProductId: number;
  submissionId: number;
  expectedRevision?: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

function candidateMessage(row: { message: string }): string {
  return row.message;
}

function candidateId(row: { id: number }): number {
  return row.id;
}

export function MarkDuplicateDialog({
  managedProductId,
  submissionId,
  expectedRevision,
  open,
  onOpenChange,
}: MarkDuplicateDialogProps) {
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebouncedValue(search, 350);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const pager = useCursorPager(debouncedSearch);

  const { data, isLoading, isError, error, refetch } = useFeedbucketSubmissions({
    managedProductId,
    search: debouncedSearch.trim() || undefined,
    limit: PICKER_PAGE_SIZE,
    cursor: pager.cursor,
  });

  const candidates = useMemo(
    () => (data?.data ?? []).filter((row) => row.id !== submissionId),
    [data, submissionId],
  );

  const markDuplicate = useMarkDuplicate();

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

  const handleNext = useCallback(() => {
    pager.goNext(data?.pagination?.nextCursor);
  }, [pager, data?.pagination?.nextCursor]);

  const handlePrevious = useCallback(() => {
    pager.goPrevious();
  }, [pager]);

  const handleConfirm = useCallback(() => {
    if (selectedId === null) return;
    markDuplicate.mutate(
      { submissionId, duplicateOfId: selectedId, expectedRevision },
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
  }, [selectedId, submissionId, expectedRevision, markDuplicate, onOpenChange]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Mark as duplicate</DialogTitle>
          <DialogDescription>
            Search for the original submission this is a duplicate of.
          </DialogDescription>
        </DialogHeader>
        <DialogBody className="flex flex-col gap-3">
          <Input
            placeholder="Search submissions…"
            value={search}
            onChange={handleSearchChange}
            aria-label="Search submissions for duplicate"
          />
          {isError ? (
            <ErrorState
              compact
              error={error}
              onRetry={refetch}
            />
          ) : (
            <FeedbackPickList
              items={candidates}
              selectedId={selectedId}
              onSelect={handleSelect}
              getId={candidateId}
              getLabel={candidateMessage}
              isLoading={isLoading}
              loadingText="Loading submissions…"
              emptyText="No submissions found."
              label="Original submission"
            />
          )}
          <TablePagination
            mode="cursor"
            rowCount={candidates.length}
            pageNumber={pager.pageNumber}
            hasMore={data?.pagination?.hasMore ?? false}
            hasPrevious={pager.hasPrevious}
            onNext={handleNext}
            onPrevious={handlePrevious}
            compact
            showSummary={false}
            hideOnSinglePage
            disabled={isLoading || isError}
          />
        </DialogBody>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={handleCancel}>
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
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
