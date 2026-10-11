"use client";

import { LoadingButton } from "@/components/ui/loading-button";

interface ProductSettingsDangerSectionProps {
  archived: boolean;
  canUpdate: boolean;
  archivePending: boolean;
  restorePending: boolean;
  onArchive: () => void;
  onRestore: () => void;
}

export function ProductSettingsDangerSection({
  archived,
  canUpdate,
  archivePending,
  restorePending,
  onArchive,
  onRestore,
}: ProductSettingsDangerSectionProps) {
  return (
    <section aria-labelledby="danger-section-heading" className="flex flex-col gap-3 border-t border-border pt-8">
      <h2 id="danger-section-heading" className="text-sm font-semibold text-destructive">
        Danger zone
      </h2>
      <div className="flex items-start justify-between gap-4 rounded-md border border-destructive/30 p-4">
        {archived ? (
          <>
            <div>
              <p className="text-sm font-medium text-foreground">Restore this product</p>
              <p className="mt-0.5 text-xs text-muted-foreground">
                Make this product active again.
              </p>
            </div>
            {canUpdate ? (
              <LoadingButton
                type="button"
                variant="outline"
                size="sm"
                isPending={restorePending}
                loadingText="Restoring…"
                onClick={onRestore}
              >
                Restore
              </LoadingButton>
            ) : null}
          </>
        ) : (
          <>
            <div>
              <p className="text-sm font-medium text-foreground">Archive this product</p>
              <p className="mt-0.5 text-xs text-muted-foreground">
                Hide from active views. Can be restored later.
              </p>
            </div>
            {canUpdate ? (
              <LoadingButton
                type="button"
                variant="destructive"
                size="sm"
                isPending={archivePending}
                loadingText="Archiving…"
                onClick={onArchive}
              >
                Archive
              </LoadingButton>
            ) : null}
          </>
        )}
      </div>
    </section>
  );
}
