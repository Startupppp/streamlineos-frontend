"use client";

import { useCallback, useState } from "react";
import { ExternalLink, Copy, Check, Globe, EyeOff, RefreshCw } from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
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
import { useCopyFeedback } from "@/hooks/common/use-copy-feedback";
import { ErrorState } from "@/components/shared/error-state";
import { RoadmapPublicationActive } from "./roadmap-publication-active";
import {
  useProductRoadmapPublication,
  usePublishProductRoadmap,
  useUnpublishProductRoadmap,
} from "@/hooks/api/build/roadmap-public";
import { useRoadmapPreview } from "@/hooks/api/build/roadmap-public";

interface RoadmapPublicationPanelProps {
  managedProductId: number;
  onClose: () => void;
}

export function RoadmapPublicationPanel({ managedProductId, onClose }: RoadmapPublicationPanelProps) {
  const {
    data: publication,
    isLoading,
    isError,
    error,
    refetch,
  } = useProductRoadmapPublication(managedProductId);
  const { data: preview } = useRoadmapPreview(managedProductId);
  const publish = usePublishProductRoadmap(managedProductId);
  const unpublish = useUnpublishProductRoadmap(managedProductId);

  const [unpublishDialogOpen, setUnpublishDialogOpen] = useState(false);
  const [rotateDialogOpen, setRotateDialogOpen] = useState(false);
  const [shareUrl, setShareUrl] = useState<string | null>(null);
  const { copied, copy } = useCopyFeedback();

  const isPublished = publication?.published ?? false;

  const publicItemCount =
    preview
      ? (preview.roadmap.planned?.length ?? 0) +
        (preview.roadmap.in_progress?.length ?? 0) +
        (preview.roadmap.completed?.length ?? 0)
      : 0;

  const handleCopy = useCallback(async () => {
    if (!shareUrl) return;
    const ok = await copy(shareUrl);
    if (!ok) toast.error("Could not copy to clipboard");
  }, [shareUrl, copy]);

  const handleRetry = useCallback(() => {
    void refetch();
  }, [refetch]);

  const handlePublish = useCallback(() => {
    publish.mutate(undefined, {
      onSuccess: (issued) => {
        setShareUrl(`${window.location.origin}${issued.path}`);
        toast.success("Roadmap published");
      },
      onError: (e) => toast.error(getErrorMessage(e)),
    });
  }, [publish]);

  const handleRotate = useCallback(() => {
    publish.mutate(undefined, {
      onSuccess: (issued) => {
        setShareUrl(`${window.location.origin}${issued.path}`);
        toast.success("Share link rotated");
        setRotateDialogOpen(false);
      },
      onError: (e) => toast.error(getErrorMessage(e)),
    });
  }, [publish]);

  const handleRotateAndCopy = useCallback(() => {
    publish.mutate(undefined, {
      onSuccess: (issued) => {
        const url = `${window.location.origin}${issued.path}`;
        setShareUrl(url);
        void copy(url).then((ok) => {
          toast.success(
            ok
              ? "Share link rotated and copied"
              : "Share link rotated. Copy it from the field above.",
          );
        });
      },
      onError: (e) => toast.error(getErrorMessage(e)),
    });
  }, [publish, copy]);

  const handleUnpublish = useCallback(() => {
    unpublish.mutate(undefined, {
      onSuccess: () => {
        setShareUrl(null);
        toast.success("Roadmap unpublished");
        setUnpublishDialogOpen(false);
      },
      onError: (e) => toast.error(getErrorMessage(e)),
    });
  }, [unpublish]);

  const handleUnpublishOpenChange = useCallback((open: boolean) => {
    setUnpublishDialogOpen(open);
  }, []);

  const handleRotateOpenChange = useCallback((open: boolean) => {
    setRotateDialogOpen(open);
  }, []);

  const handleOpenUnpublish = useCallback(() => setUnpublishDialogOpen(true), []);
  const handleOpenRotate = useCallback(() => setRotateDialogOpen(true), []);

  return (
    <>
      <Sheet open onOpenChange={onClose}>
        <SheetContent className="w-full gap-0 p-0 sm:max-w-md">
          <SheetHeader className="gap-1 border-b px-6 py-4 text-left">
            <SheetTitle>Public Roadmap</SheetTitle>
          </SheetHeader>
          <SheetBody className="px-6 py-5">
            {isLoading ? null : isError ? (
              <ErrorState
                compact
                title="Could not load the publication state"
                description={getErrorMessage(error)}
                onRetry={handleRetry}
                error={error}
              />
            ) : isPublished ? (
              <RoadmapPublicationActive
                publicItemCount={publicItemCount}
                shareUrl={shareUrl}
                copied={copied}
                issuedAt={publication?.issuedAt ?? null}
                expiresAt={publication?.expiresAt ?? null}
                isRotating={publish.isPending}
                onCopy={handleCopy}
                onRotateAndCopy={handleRotateAndCopy}
                onOpenRotate={handleOpenRotate}
                onOpenUnpublish={handleOpenUnpublish}
              />
            ) : (
              <div className="flex flex-col gap-4">
                <div className="flex items-center gap-2">
                  <EyeOff className="size-4 shrink-0 text-muted-foreground" aria-hidden />
                  <p className="text-sm font-medium text-foreground">Not published</p>
                </div>
                <p className="text-sm text-muted-foreground">
                  {publicItemCount === 0
                    ? "No items are marked as public yet. Mark roadmap items public, then publish to share this board."
                    : `${String(publicItemCount)} item${publicItemCount === 1 ? "" : "s"} ready to publish.`}
                </p>
                <LoadingButton
                  type="button"
                  size="sm"
                  className="gap-2"
                  isPending={publish.isPending}
                  onClick={handlePublish}
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
        open={unpublishDialogOpen}
        onOpenChange={handleUnpublishOpenChange}
        title="Unpublish roadmap?"
        description="The share link will stop working immediately. You can re-publish at any time with a new link."
        confirmLabel="Unpublish"
        destructive
        onConfirm={handleUnpublish}
      />

      <ConfirmDialog
        open={rotateDialogOpen}
        onOpenChange={handleRotateOpenChange}
        title="Rotate share link?"
        description="The current link will stop working immediately. A new unique link will be generated."
        confirmLabel="Rotate link"
        destructive
        onConfirm={handleRotate}
      />
    </>
  );
}
