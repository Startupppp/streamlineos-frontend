"use client";

import { useMemo, useState } from "react";
import { toast } from "sonner";
import { useProjects } from "@/hooks/api/build/projects";
import { useLinkProjectManagedProduct } from "@/hooks/api/build/use-link-project-managed-product";
import type { ProjectListItem } from "@/types/projects";
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

interface LinkExistingProjectDialogProps {
  managedProductId: number;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function LinkExistingProjectDialog({
  managedProductId,
  open,
  onOpenChange,
}: LinkExistingProjectDialogProps) {
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<ProjectListItem | null>(null);
  const debouncedSearch = useDebouncedValue(search.trim(), 250);
  const { data, isLoading, isError, refetch } = useProjects(
    { limit: 50, search: debouncedSearch || undefined },
    { enabled: open },
  );
  const mutation = useLinkProjectManagedProduct();
  const candidates = useMemo(
    () =>
      (data?.data ?? []).filter((project) => project.managedProductId === null),
    [data],
  );
  const options = useMemo(
    () =>
      (selected && !candidates.some((project) => project.id === selected.id)
        ? [selected, ...candidates]
        : candidates
      ).map((project) => ({
        value: String(project.id),
        label: project.name,
        sublabel: project.key,
      })),
    [candidates, selected],
  );

  const handleLink = () => {
    if (!selected || mutation.isPending) return;
    mutation.mutate(
      { project: selected, managedProductId },
      {
        onSuccess: () => {
          toast.success(`${selected.name} linked to this product`);
          setSelected(null);
          setSearch("");
          onOpenChange(false);
        },
        onError: (error) => toast.error(getErrorMessage(error)),
      },
    );
  };

  const handleProjectChange = (value: string) => {
    const numId = Number(value);
    setSelected(
      candidates.find((project) => project.id === numId) ??
        (selected?.id === numId ? selected : null),
    );
  };

  const handleSearchChange = (value: string) => {
    setSearch(value);
    if (value) setSelected(null);
  };

  const handleRetry = () => {
    void refetch();
  };

  const handleCancel = () => onOpenChange(false);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Link existing project</DialogTitle>
          <DialogDescription>
            Choose an unlinked project you manage. Projects assigned to another
            product are not moved automatically.
          </DialogDescription>
        </DialogHeader>
        <DialogBody>
          <Combobox
            aria-label="Select an existing project"
            options={options}
            value={selected === null ? "" : String(selected.id)}
            onChange={handleProjectChange}
            onSearchChange={handleSearchChange}
            placeholder="Select a project…"
            searchPlaceholder="Search by project name or key…"
            emptyText={
              isLoading
                ? "Loading projects…"
                : isError
                  ? "Could not load projects."
                  : "No unlinked projects found."
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
              ) : data?.hasMore ? (
                <p className="border-t border-border p-2 text-xs text-muted-foreground">
                  More projects exist. Search by name or key to narrow the list.
                </p>
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
            disabled={!selected}
            isPending={mutation.isPending}
            onClick={handleLink}
          >
            Link project
          </LoadingButton>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
