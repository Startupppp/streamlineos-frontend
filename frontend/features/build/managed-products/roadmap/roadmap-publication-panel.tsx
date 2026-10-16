"use client";

import { Globe, EyeOff } from "lucide-react";
import { LoadingButton } from "@/components/ui/loading-button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetBody,
} from "@/components/ui/sheet";
import { getErrorMessage } from "@/lib/get-error-message";
import { ErrorState } from "@/components/shared/error-state";
import { RoadmapPublicationActive } from "./roadmap-publication-active";
import { useRoadmapPublicationControls } from "./use-roadmap-publication-controls";

interface RoadmapPublicationPanelProps {
  managedProductId: number;
  onClose: () => void;
}

export function RoadmapPublicationPanel({ managedProductId, onClose }: RoadmapPublicationPanelProps) {
  const controls = useRoadmapPublicationControls(managedProductId);

  return (
    <>
      <Sheet open onOpenChange={onClose}>
        <SheetContent className="w-full gap-0 p-0 sm:max-w-md">
          <SheetHeader className="gap-1 border-b px-6 py-4 text-left">
            <SheetTitle>Public Roadmap</SheetTitle>
          </SheetHeader>
          <SheetBody className="px-6 py-5">
            {controls.isLoading ? null : controls.isError ? (
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
                onCopy={controls.handleCopy}
                onRotateAndCopy={controls.handleRotateAndCopy}
                onOpenRotate={controls.handleOpenRotate}
                onOpenUnpublish={controls.handleOpenUnpublish}
                onRetryPublicItemCount={controls.handleRetryPreview}
              />
            ) : (
              <div className="flex flex-col gap-4">
                <div className="flex items-center gap-2">
                  <EyeOff className="size-4 shrink-0 text-muted-foreground" aria-hidden />
                  <p className="text-sm font-medium text-foreground">Not published</p>
                </div>
                <p className="text-sm text-muted-foreground">
                  {controls.publicItemCount === null
                    ? controls.isPreviewError
                      ? "The number of items ready to publish could not be loaded."
                      : "No items are marked as public yet. Mark roadmap items public, then publish to share this board."
                    : controls.publicItemCount === 0
                      ? "No items are marked as public yet. Mark roadmap items public, then publish to share this board."
                      : `${String(controls.publicItemCount)} item${controls.publicItemCount === 1 ? "" : "s"} ready to publish.`}
                </p>
                <LoadingButton
                  type="button"
                  size="sm"
                  className="gap-2"
                  isPending={controls.isPublishing}
                  onClick={controls.handlePublish}
                >
                  <Globe className="size-3.5" aria-hidden />
                  Publish roadmap
                </LoadingButton>
              </div>
            )}
          </SheetBody>
        </SheetContent>
      </Sheet>

      <ConfirmDialog
        open={controls.unpublishDialogOpen}
        onOpenChange={controls.handleUnpublishOpenChange}
        title="Unpublish roadmap?"
        description="The share link will stop working immediately. You can re-publish at any time with a new link."
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
  );
}
