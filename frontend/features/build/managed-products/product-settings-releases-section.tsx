"use client";

import { useCallback, useState } from "react";
import { Plus, Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useCan } from "@/hooks/api/access";
import { useManagedProductReleases } from "@/hooks/api/build/managed-product-releases";
import type { ManagedProductRelease } from "@/hooks/api/build/managed-product-releases";
import { ProductReleaseFormSheet } from "./product-release-form-sheet";

interface ProductSettingsReleasesSectionProps {
  managedProductId: number;
}

function releaseStatusLabel(status: "draft" | "released" | "archived"): string {
  if (status === "draft") return "Draft";
  if (status === "released") return "Released";
  return "Archived";
}

export function ProductSettingsReleasesSection({
  managedProductId,
}: ProductSettingsReleasesSectionProps) {
  const canUpdate = useCan("build:managed-products:update");
  const [sheetOpen, setSheetOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<ManagedProductRelease | undefined>(undefined);

  const { data, isLoading } = useManagedProductReleases(managedProductId);

  const handleCreateOpen = useCallback(() => {
    setEditTarget(undefined);
    setSheetOpen(true);
  }, []);

  const handleEditRow = useCallback((r: ManagedProductRelease) => {
    setEditTarget(r);
    setSheetOpen(true);
  }, []);

  const handleSheetOpenChange = useCallback(
    (open: boolean) => {
      setSheetOpen(open);
      if (!open) setEditTarget(undefined);
    },
    [],
  );

  return (
    <section aria-labelledby="releases-section-heading" className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <h2 id="releases-section-heading" className="text-sm font-semibold text-foreground">
          Releases
        </h2>
        {canUpdate ? (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleCreateOpen}
            aria-label="Add release"
          >
            <Plus aria-hidden="true" />
            Add release
          </Button>
        ) : null}
      </div>

      {isLoading ? (
        <div className="flex flex-col gap-2">
          {[0, 1].map((i) => (
            <Skeleton key={i} className="h-10 w-full" />
          ))}
        </div>
      ) : (
        <ul className="flex flex-col gap-1" aria-label="Product releases">
          {(data?.data ?? []).map((r) => (
            <li
              key={r.id}
              className="flex items-center justify-between rounded-md border border-border px-3 py-2"
            >
              <div className="flex flex-col gap-0.5 min-w-0">
                <span className="text-sm font-medium text-foreground truncate">
                  {r.name}
                </span>
                <span className="text-xs text-muted-foreground">
                  {r.version} · {releaseStatusLabel(r.status)}
                  {r.releaseDate ? ` · ${r.releaseDate}` : ""}
                </span>
              </div>
              {canUpdate ? (
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="w-7 shrink-0"
                  aria-label={`Edit ${r.name}`}
                  onClick={() => handleEditRow(r)}
                >
                  <Pencil aria-hidden="true" size={14} />
                </Button>
              ) : null}
            </li>
          ))}
          {(data?.data ?? []).length === 0 && !isLoading ? (
            <li className="py-4 text-center text-sm text-muted-foreground">No releases yet.</li>
          ) : null}
        </ul>
      )}

      {canUpdate ? (
        <ProductReleaseFormSheet
          managedProductId={managedProductId}
          editTarget={editTarget}
          open={sheetOpen}
          onOpenChange={handleSheetOpenChange}
        />
      ) : null}
    </section>
  );
}
