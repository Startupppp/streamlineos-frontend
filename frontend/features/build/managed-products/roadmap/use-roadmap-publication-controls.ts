"use client";

import { useCallback, useState } from "react";
import { toast } from "sonner";
import { getErrorMessage } from "@/lib/get-error-message";
import { useCopyFeedback } from "@/hooks/common/use-copy-feedback";
import {
  useProductRoadmapPublication,
  usePublishProductRoadmap,
  useRoadmapPreview,
  useUnpublishProductRoadmap,
} from "@/hooks/api/build/roadmap-public";

export function useRoadmapPublicationControls(managedProductId: number) {
  const publication = useProductRoadmapPublication(managedProductId);
  const preview = useRoadmapPreview(managedProductId);
  const publish = usePublishProductRoadmap(managedProductId);
  const unpublish = useUnpublishProductRoadmap(managedProductId);

  const [unpublishDialogOpen, setUnpublishDialogOpen] = useState(false);
  const [rotateDialogOpen, setRotateDialogOpen] = useState(false);
  const [shareUrl, setShareUrl] = useState<string | null>(null);
  const { copied, copy } = useCopyFeedback();

  const previewBoard = preview.data?.roadmap;
  const publicItemCount = previewBoard
    ? (previewBoard.planned?.length ?? 0) +
      (previewBoard.in_progress?.length ?? 0) +
      (previewBoard.completed?.length ?? 0)
    : null;

  const handleCopy = useCallback(async () => {
    if (!shareUrl) return;
    const ok = await copy(shareUrl);
    if (!ok) toast.error("Could not copy to clipboard");
  }, [shareUrl, copy]);

  const handleRetry = useCallback(() => {
    void publication.refetch();
  }, [publication]);

  const handleRetryPreview = useCallback(() => {
    void preview.refetch();
  }, [preview]);

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

  return {
    isPublished: publication.data?.published ?? false,
    issuedAt: publication.data?.issuedAt ?? null,
    expiresAt: publication.data?.expiresAt ?? null,
    isLoading: publication.isLoading,
    isError: publication.isError,
    error: publication.error,
    publicItemCount,
    isPreviewError: preview.isError,
    isPublishing: publish.isPending,
    shareUrl,
    copied,
    unpublishDialogOpen,
    rotateDialogOpen,
    handleCopy,
    handleRetry,
    handleRetryPreview,
    handlePublish,
    handleRotate,
    handleRotateAndCopy,
    handleUnpublish,
    handleUnpublishOpenChange,
    handleRotateOpenChange,
    handleOpenUnpublish,
    handleOpenRotate,
  };
}
