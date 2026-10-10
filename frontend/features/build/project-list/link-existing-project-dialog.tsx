"use client";

import { useMemo, useState } from "react";
import { toast } from "sonner";
import { useProjects } from "@/hooks/api/build/projects";
import { useLinkProjectManagedProduct } from "@/hooks/api/build/use-link-project-managed-product";
import { useDebouncedValue } from "@/hooks/common/use-debounce";
import { getErrorMessage } from "@/lib/get-error-message";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const debouncedSearch = useDebouncedValue(search.trim(), 250);
  const { data, isLoading, isError, refetch } = useProjects(
    { limit: 50, search: debouncedSearch || undefined },
    { enabled: open },
  );
  const mutation = useLinkProjectManagedProduct();
  const candidates = useMemo(
    () => (data?.data ?? []).filter((project) => project.managedProductId === null),
    [data],
  );
  const selected = candidates.find((project) => project.id === selectedId);

  const handleLink = () => {
    if (!selected || mutation.isPending) return;
    mutation.mutate(
      { project: selected, managedProductId },
      {
        onSuccess: () => {
          toast.success(`${selected.name} linked to this product`);
          setSelectedId(null);
          setSearch("");
          onOpenChange(false);
        },
        onError: (error) => toast.error(getErrorMessage(error)),
      },
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Link existing project</DialogTitle>
          <DialogDescription>
            Choose an unlinked project you manage. Projects assigned to another product are not moved automatically.
          </DialogDescription>
        </DialogHeader>
        <DialogBody className="space-y-3">
          <Input
            aria-label="Search existing projects"
            placeholder="Search by project name or key…"
            value={search}
            onChange={(event) => {
              setSearch(event.target.value);
              setSelectedId(null);
            }}
          />
          <div className="max-h-64 overflow-y-auto rounded-md border border-border" role="group" aria-label="Available projects">
            {isLoading ? (
              <p className="p-3 text-sm text-muted-foreground">Loading projects…</p>
            ) : isError ? (
              <div className="flex items-center justify-between gap-2 p-3 text-sm">
                <span>Could not load projects.</span>
                <Button size="sm" variant="outline" onClick={() => void refetch()}>Retry</Button>
              </div>
            ) : candidates.length === 0 ? (
              <p className="p-3 text-sm text-muted-foreground">No unlinked projects found. Try a different search.</p>
            ) : (
              candidates.map((project) => (
                <button
                  key={project.id}
                  type="button"
                  className="flex w-full min-w-0 items-center gap-3 border-b border-border px-3 py-2 text-left text-sm last:border-0 hover:bg-accent aria-pressed:bg-accent"
                  aria-pressed={selectedId === project.id}
                  onClick={() => setSelectedId(project.id)}
                >
                  <span className="shrink-0 font-mono text-xs text-muted-foreground">{project.key}</span>
                  <span className="truncate">{project.name}</span>
                </button>
              ))
            )}
          </div>
          {data?.hasMore && (
            <p className="text-xs text-muted-foreground">More projects exist. Search by name or key to narrow the list.</p>
          )}
        </DialogBody>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <LoadingButton type="button" disabled={!selected} isPending={mutation.isPending} onClick={handleLink}>
            Link project
          </LoadingButton>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
