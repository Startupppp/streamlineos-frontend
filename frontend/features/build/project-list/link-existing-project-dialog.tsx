"use client";

import { useMemo, useState } from "react";
import { toast } from "sonner";
import { AlertTriangle } from "lucide-react";
import { useProjects } from "@/hooks/api/build/projects";
import { useLinkProjectManagedProduct } from "@/hooks/api/build/use-link-project-managed-product";
import type { ProjectListItem } from "@/types/projects";
import { useDebouncedValue } from "@/hooks/common/use-debounce";
import { getErrorMessage } from "@/lib/get-error-message";
import { Button } from "@/components/ui/button";
import { Combobox } from "@/components/ui/combobox";
import { LoadingButton } from "@/components/ui/loading-button";
import { Alert, AlertDescription } from "@/components/ui/alert";
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
  onPreviewProject?: (project: ProjectListItem) => void;
}

export function LinkExistingProjectDialog({
  managedProductId,
  open,
  onOpenChange,
  onPreviewProject,
}: LinkExistingProjectDialogProps) {
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<ProjectListItem | null>(null);
  const debouncedSearch = useDebouncedValue(search.trim(), 250);
  const { data, isLoading, isError, refetch } = useProjects(
    { limit: 50, search: debouncedSearch || undefined },
    { enabled: open },
  );
  const mutation = useLinkProjectManagedProduct();

  const allProjects = useMemo(
    () => (data?.data ?? []).filter((p) => p.managedProductId !== managedProductId),
    [data, managedProductId],
  );

  const options = useMemo(
    () =>
      (selected && !allProjects.some((p) => p.id === selected.id)
        ? [selected, ...allProjects]
        : allProjects
      ).map((p) => ({
        value: String(p.id),
        label: p.name,
        sublabel:
          p.managedProductId !== null && p.managedProductId !== managedProductId
            ? `${p.key} · linked to another product`
            : p.key,
      })),
    [allProjects, selected, managedProductId],
  );

  const isMove =
    selected !== null &&
    selected.managedProductId !== null &&
    selected.managedProductId !== managedProductId;

  const handleLink = () => {
    if (!selected || mutation.isPending) return;
    if (onPreviewProject) {
      onPreviewProject(selected);
      onOpenChange(false);
      return;
    }
    mutation.mutate(
      { project: selected, managedProductId },
      {
        onSuccess: () => {
          toast.success(
            isMove
              ? `${selected.name} moved to this product`
              : `${selected.name} linked to this product`,
          );
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
      allProjects.find((p) => p.id === numId) ??
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

  const handleCancel = () => {
    setSelected(null);
    setSearch("");
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Link existing project</DialogTitle>
          <DialogDescription>
            Choose a project to link to this product. Projects already linked to
            another product will be moved here.
          </DialogDescription>
        </DialogHeader>
        <DialogBody className="flex flex-col gap-3">
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
                  : "No projects found."
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
          {isMove ? (
            <Alert variant="default">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                This project is currently linked to another product. Confirming
                will move it here and unlink it from that product.
              </AlertDescription>
            </Alert>
          ) : null}
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
            {isMove ? "Move project" : "Link project"}
          </LoadingButton>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
