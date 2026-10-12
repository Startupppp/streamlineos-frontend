"use client";

import { useCallback, useState } from "react";
import { Star, Unlink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { useCan } from "@/hooks/api/access";
import { useManagedProductProjects } from "@/hooks/api/build/managed-product-projects";
import {
  useUnlinkProjectPair,
  useSetPrimaryProject,
} from "@/hooks/api/build/use-link-project-managed-product";
import type { LinkedProjectRow } from "@/hooks/api/build/managed-product-projects";
import { getErrorMessage } from "@/lib/get-error-message";
import { toast } from "sonner";

interface ProductSettingsProjectsSectionProps {
  managedProductId: number;
  canWrite?: boolean;
}

export function ProductSettingsProjectsSection({
  managedProductId,
  canWrite: canWriteProp,
}: ProductSettingsProjectsSectionProps) {
  const canUpdateByPermission = useCan("build:managed-products:update");
  const canUpdate = canWriteProp !== undefined ? canWriteProp : canUpdateByPermission;
  const [unlinkTarget, setUnlinkTarget] = useState<LinkedProjectRow | null>(null);

  const { data, isLoading } = useManagedProductProjects({ managedProductId, limit: 100 });
  const unlinkPair = useUnlinkProjectPair();
  const setPrimary = useSetPrimaryProject();

  const handleUnlinkRow = useCallback((row: LinkedProjectRow) => {
    setUnlinkTarget(row);
  }, []);

  const handleUnlinkDialogChange = useCallback((open: boolean) => {
    if (!open) setUnlinkTarget(null);
  }, []);

  function handleUnlinkConfirm() {
    if (!unlinkTarget) return;
    unlinkPair.mutate(
      { managedProductId, projectId: unlinkTarget.id },
      {
        onSuccess: () => {
          toast.success("Project unlinked.");
          setUnlinkTarget(null);
        },
        onError: (e) => toast.error(getErrorMessage(e)),
      },
    );
  }

  function handleSetPrimary(row: LinkedProjectRow) {
    setPrimary.mutate(
      { managedProductId, projectId: row.id },
      {
        onSuccess: () => toast.success("Primary project updated."),
        onError: (e) => toast.error(getErrorMessage(e)),
      },
    );
  }

  if (isLoading) {
    return (
      <section aria-labelledby="projects-section-heading" className="flex flex-col gap-3">
        <h2 id="projects-section-heading" className="text-sm font-semibold text-foreground">
          Linked projects
        </h2>
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-10 w-full" />
      </section>
    );
  }

  const rows = data?.data ?? [];

  return (
    <section aria-labelledby="projects-section-heading" className="flex flex-col gap-3">
      <h2 id="projects-section-heading" className="text-sm font-semibold text-foreground">
        Linked projects
      </h2>

      {rows.length === 0 ? (
        <p className="text-sm text-muted-foreground">No projects linked to this product.</p>
      ) : (
        <ul className="flex flex-col gap-1">
          {rows.map((row) => (
            <li
              key={row.id}
              className="flex items-center justify-between rounded-md border border-border px-3 py-2"
            >
              <div className="flex min-w-0 flex-col">
                <span className="truncate text-sm font-medium">{row.name}</span>
                <span className="text-xs text-muted-foreground">{row.key}</span>
              </div>
              {canUpdate ? (
                <div className="ml-3 flex shrink-0 items-center gap-1">
                  {!row.isPrimary ? (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      aria-label={`Set ${row.name} as primary`}
                      disabled={setPrimary.isPending}
                      onClick={() => handleSetPrimary(row)}
                    >
                      <Star size={14} aria-hidden="true" />
                      Set primary
                    </Button>
                  ) : (
                    <span className="flex items-center gap-1 text-xs text-muted-foreground">
                      <Star size={12} aria-hidden="true" className="fill-current" />
                      Primary
                    </span>
                  )}
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    aria-label={`Unlink ${row.name}`}
                    disabled={unlinkPair.isPending}
                    onClick={() => handleUnlinkRow(row)}
                  >
                    <Unlink size={14} aria-hidden="true" />
                    Unlink
                  </Button>
                </div>
              ) : null}
            </li>
          ))}
        </ul>
      )}

      <ConfirmDialog
        open={unlinkTarget !== null}
        onOpenChange={handleUnlinkDialogChange}
        title="Unlink this project?"
        description={`${unlinkTarget?.name ?? "This project"} will be removed from the product. The project itself will not be affected.`}
        confirmLabel="Unlink"
        destructive
        onConfirm={handleUnlinkConfirm}
      />
    </section>
  );
}
