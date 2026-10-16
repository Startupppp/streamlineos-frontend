"use client";

import { Globe } from "lucide-react";
import { LoadingButton } from "@/components/ui/loading-button";
import { Skeleton } from "@/components/ui/skeleton";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { useCan } from "@/hooks/api/access";
import { getErrorMessage } from "@/lib/get-error-message";
import { ErrorState } from "@/components/shared/error-state";
import { RoadmapPublicationActive } from "./roadmap/roadmap-publication-active";
import { useRoadmapPublicationControls } from "./roadmap/use-roadmap-publication-controls";

interface ProductSettingsPublicationSectionProps {
  managedProductId: number;
}

export function ProductSettingsPublicationSection({
  managedProductId,
}: ProductSettingsPublicationSectionProps) {
  const canManage = useCan("build:roadmap:manage");
  const controls = useRoadmapPublicationControls(managedProductId);

  return (
    <section
      aria-labelledby="publication-section-heading"
      className="flex flex-col gap-3"
    >
      <div className="flex items-center justify-between">
        <h2
          id="publication-section-heading"
          className="text-sm font-semibold text-foreground"
        >
          Client publication
        </h2>
        {canManage && !controls.isLoading && !controls.isError && !controls.isPublished ? (
          <LoadingButton
            type="button"
            variant="outline"
            size="sm"
            isPending={controls.isPublishing}
            loadingText="Publishing…"
            onClick={controls.handlePublish}
          >
            <Globe aria-hidden="true" />
            Publish roadmap
          </LoadingButton>
        ) : null}
      </div>

      {controls.isLoading ? (
        <Skeleton className="h-16 w-full" />
      ) : controls.isError ? (
        <ErrorState
          compact
          title="Could not load the publication state"
          description={getErrorMessage(controls.error)}
          onRetry={controls.handleRetry}
          error={controls.error}
        />
      ) : controls.isPublished ? (
        <RoadmapPublicationActive
          publicItemCount={controls.publicItemCount}
          publicItemCountError={controls.isPreviewError}
          shareUrl={controls.shareUrl}
          copied={controls.copied}
          issuedAt={controls.issuedAt}
          expiresAt={controls.expiresAt}
          isRotating={controls.isPublishing}
          canManage={canManage}
          onCopy={controls.handleCopy}
          onRotateAndCopy={controls.handleRotateAndCopy}
          onOpenRotate={controls.handleOpenRotate}
          onOpenUnpublish={controls.handleOpenUnpublish}
          onRetryPublicItemCount={controls.handleRetryPreview}
        />
      ) : (
        <p className="text-sm text-muted-foreground">
          Publish the roadmap to share it with clients via a public link.
        </p>
      )}

      {canManage ? (
        <>
          <ConfirmDialog
            open={controls.unpublishDialogOpen}
            onOpenChange={controls.handleUnpublishOpenChange}
            title="Unpublish this roadmap?"
            description="The public link will stop working immediately. You can publish again to get a new link."
            confirmLabel="Unpublish"
            destructive
            keepOpenOnConfirm
            isPending={controls.isUnpublishing}
            onConfirm={controls.handleUnpublish}
          />

          <ConfirmDialog
            open={controls.rotateDialogOpen}
            onOpenChange={controls.handleRotateOpenChange}
            title="Rotate share link?"
            description="The current link will stop working immediately. A new unique link will be generated."
            confirmLabel="Rotate link"
            destructive
            keepOpenOnConfirm
            isPending={controls.isPublishing}
            onConfirm={controls.handleRotate}
          />
        </>
      ) : null}
    </section>
  );
}
