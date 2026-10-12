"use client";

import { useCallback, useState } from "react";
import { Star, Unlink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { TablePagination } from "@/components/ui/table-pagination";
import { ErrorState } from "@/components/shared/error-state";
import { useCan } from "@/hooks/api/access";
import { useManagedProductProjects } from "@/hooks/api/build/managed-product-projects";
import {
  useUnlinkProjectPair,
  useSetPrimaryProject,
} from "@/hooks/api/build/use-link-project-managed-product";
import type { LinkedProjectRow } from "@/hooks/api/build/managed-product-projects";
import {
  PRODUCT_PROJECT_CURSORS_PARAM,
  useBuildCursorPager,
} from "@/features/build/shared/use-build-cursor-pager";
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
  const pager = useBuildCursorPager(
    String(managedProductId),
    PRODUCT_PROJECT_CURSORS_PARAM,
  );

  const { data, isLoading, isError, error, refetch } = useManagedProductProjects({
    managedProductId,
    cursor: pager.cursor,
  });
  const unlinkPair = useUnlinkProjectPair();
  const setPrimary = useSetPrimaryProject();

  const handleUnlinkRow = useCallback((row: LinkedProjectRow) => {
    setUnlinkTarget(row);
  }, []);

  const handleUnlinkDialogChange = useCallback((open: boolean) => {
    if (!open) setUnlinkTarget(null);
  }, []);

  const handleNextPage = useCallback(() => {
    pager.goNext(data?.pagination?.nextCursor);
  }, [pager, data?.pagination?.nextCursor]);

  const handleRetry = useCallback(() => {
    void refetch();
  }, [refetch]);

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
  const hasMore = data?.pagination?.hasMore ?? false;

  return (
    <section aria-labelledby="projects-section-heading" className="flex flex-col gap-3">
      <h2 id="projects-section-heading" className="text-sm font-semibold text-foreground">
        Linked projects
      </h2>

      {isError ? (
        <ErrorState
          compact
          title="Could not load linked projects"
          description={getErrorMessage(error)}
          onRetry={handleRetry}
          error={error}
        />
      ) : rows.length === 0 ? (
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
              <div className="ml-3 flex shrink-0 items-center gap-1">
                {canUpdate && row.allowedActions.includes("setPrimary") && !row.isPrimary ? (
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
                ) : row.isPrimary ? (
                  <span className="flex items-center gap-1 text-xs text-muted-foreground">
                    <Star size={12} aria-hidden="true" className="fill-current" />
                    Primary
                  </span>
                ) : null}
                {canUpdate && row.allowedActions.includes("unlink") ? (
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
                ) : null}
              </div>
            </li>
          ))}
        </ul>
      )}

      {!isError && (rows.length > 0 || pager.hasPrevious) ? (
        <TablePagination
          mode="cursor"
          rowCount={rows.length}
          pageNumber={pager.pageNumber}
          hasMore={hasMore}
          hasPrevious={pager.hasPrevious}
          onNext={handleNextPage}
          onPrevious={pager.goPrevious}
          hideOnSinglePage
        />
      ) : null}

      <ConfirmDialog
        open={canUpdate && unlinkTarget !== null}
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
