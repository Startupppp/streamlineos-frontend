"use client";

import { useState, useCallback } from "react";
import { Check, X, Link2Off } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { SearchInput } from "@/components/ui/search-input";
import { Button } from "@/components/ui/button";
import { LoadingButton } from "@/components/ui/loading-button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import {
  useCrmOrganizations,
  useUpdateCrmOrganization,
} from "@/hooks/api/crm";
import { toast } from "sonner";
import { getErrorMessage } from "@/lib/get-error-message";
import { TruncatedText } from "@/components/ui/truncated-text";
import { cn } from "@/lib/utils";

interface OrgSelectButtonProps {
  org: { id: number; name: string; industry?: string | null };
  selected: boolean;
  onSelect: (id: number) => void;
}

function OrgSelectButton({ org, selected, onSelect }: OrgSelectButtonProps) {
  const handleClick = useCallback(() => onSelect(org.id), [org.id, onSelect]);
  return (
    <button
      type="button"
      onClick={handleClick}
      className={cn(
        "w-full flex items-center gap-2 rounded-md px-2.5 py-2 text-sm text-left transition-colors",
        selected
          ? "bg-primary/10 text-primary"
          : "hover:bg-accent text-foreground",
      )}
    >
      <span className="h-5 w-5 rounded bg-muted flex items-center justify-center text-[10px] font-semibold shrink-0">
        {org.name[0]?.toUpperCase()}
      </span>
      <TruncatedText text={org.name} />
      {org.industry && (
        <span className="text-xs text-muted-foreground ml-auto shrink-0">
          {org.industry}
        </span>
      )}
      {selected && <Check className="h-3.5 w-3.5 ml-2 shrink-0" />}
    </button>
  );
}

interface LinkParentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  organizationId: number;
  currentParentId: number | null;
}

export function LinkParentDialog({
  open,
  onOpenChange,
  organizationId,
  currentParentId,
}: LinkParentDialogProps) {
  const [search, setSearch] = useState("");
  const [selectedId, setSelectedId] = useState<number | null>(currentParentId);

  const { data, isLoading } = useCrmOrganizations({
    search: search || undefined,
    limit: 30,
  });
  const updateMutation = useUpdateCrmOrganization();

  const candidates = (data?.organizations ?? []).filter(
    (o) => o.id !== organizationId,
  );

  const handleSearchChange = useCallback(
    (value: string) => setSearch(value),
    [],
  );
  const handleSelectNone = useCallback(() => setSelectedId(null), []);
  const handleSelect = useCallback((id: number) => setSelectedId(id), []);
  const handleCancel = useCallback(() => onOpenChange(false), [onOpenChange]);

  const handleConfirm = useCallback(() => {
    updateMutation.mutate(
      { id: organizationId, parentId: selectedId },
      {
        onSuccess: () => {
          toast.success(
            selectedId ? "Parent company linked" : "Parent company unlinked",
          );
          onOpenChange(false);
        },
        onError: (e) => toast.error(getErrorMessage(e)),
      },
    );
  }, [organizationId, selectedId, updateMutation, onOpenChange]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="text-base">Link Parent Company</DialogTitle>
        </DialogHeader>

        <SearchInput fill placeholder="Search companies..." value={search} onValueChange={handleSearchChange} />

        <ScrollArea className="h-56">
          {isLoading ? (
            <div className="space-y-2 p-1">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-9 w-full" />
              ))}
            </div>
          ) : (
            <div className="space-y-1 p-1">
              <button
                type="button"
                onClick={handleSelectNone}
                className={cn(
                  "w-full flex items-center gap-2 rounded-md px-2.5 py-2 text-sm text-left transition-colors",
                  selectedId === null
                    ? "bg-primary/10 text-primary"
                    : "hover:bg-accent text-muted-foreground",
                )}
              >
                <Link2Off className="h-3.5 w-3.5 shrink-0" />
                <span>No parent (top-level account)</span>
                {selectedId === null && (
                  <Check className="h-3.5 w-3.5 ml-auto shrink-0" />
                )}
              </button>

              {candidates.map((org) => (
                <OrgSelectButton
                  key={org.id}
                  org={org}
                  selected={selectedId === org.id}
                  onSelect={handleSelect}
                />
              ))}

              {candidates.length === 0 && !isLoading && (
                <p className="text-center text-sm text-muted-foreground py-4">
                  No companies found
                </p>
              )}
            </div>
          )}
        </ScrollArea>

        <DialogFooter className="flex-row gap-2 border-t pt-3">
          <Button variant="outline" className="flex-1" onClick={handleCancel}>
            <X className="h-4 w-4 mr-1" /> Cancel
          </Button>
          <LoadingButton
            className="flex-1"
            onClick={handleConfirm}
            isPending={updateMutation.isPending}
          >
            <Check className="h-4 w-4 mr-1" />
            {selectedId ? "Link Parent" : "Remove Parent"}
          </LoadingButton>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
