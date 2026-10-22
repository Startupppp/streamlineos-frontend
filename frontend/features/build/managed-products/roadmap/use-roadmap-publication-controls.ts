"use client";

import { useCallback, useMemo, useState } from "react";
import { toast } from "sonner";
import { getErrorMessage } from "@/lib/get-error-message";
import { useCopyFeedback } from "@/hooks/common/use-copy-feedback";
import {
  useProductRoadmapPublication,
  usePublishProductRoadmap,
  useRoadmapPreview,
  useUnpublishProductRoadmap,
} from "@/hooks/api/build/roadmap-public";

export const LINK_EXPIRY_OPTIONS = [
  { value: "never", label: "Never expires", days: null },
  { value: "7", label: "Expires in 7 days", days: 7 },
  { value: "30", label: "Expires in 30 days", days: 30 },
  { value: "90", label: "Expires in 90 days", days: 90 },
] as const;

export type LinkExpiry = (typeof LINK_EXPIRY_OPTIONS)[number]["value"];

export function isLinkExpiry(value: string): value is LinkExpiry {
  return LINK_EXPIRY_OPTIONS.some((o) => o.value === value);
}

function expiryInput(expiry: LinkExpiry): { expiresAt?: string } | undefined {
  const days = LINK_EXPIRY_OPTIONS.find((o) => o.value === expiry)?.days ?? null;
  if (days === null) return undefined;
  return { expiresAt: new Date(Date.now() + days * 24 * 60 * 60 * 1000).toISOString() };
}

export function useRoadmapPublicationControls(managedProductId: number) {
  const publication = useProductRoadmapPublication(managedProductId);
  const preview = useRoadmapPreview(managedProductId);
  const publish = usePublishProductRoadmap(managedProductId);
  const unpublish = useUnpublishProductRoadmap(managedProductId);

  const [unpublishDialogOpen, setUnpublishDialogOpen] = useState(false);
  const [rotateDialogOpen, setRotateDialogOpen] = useState(false);
  const [shareUrl, setShareUrl] = useState<string | null>(null);
  const [linkExpiry, setLinkExpiryState] = useState<LinkExpiry>("never");
  const { copied, copy } = useCopyFeedback();

  const previewBoard = preview.data?.roadmap;
  const publicItemCount = useMemo(() => {
    if (!previewBoard) return null;
    return (
      (previewBoard.planned?.length ?? 0) +
      (previewBoard.in_progress?.length ?? 0) +
      (previewBoard.completed?.length ?? 0)
    );
  }, [previewBoard]);

  const handleCopy = useCallback(async () => {
    if (!shareUrl) return;
    const ok = await copy(shareUrl);
    if (!ok) toast.error("Could not copy to clipboard");
  }, [shareUrl, copy]);

  const refetchPublication = publication.refetch;
  const refetchPreview = preview.refetch;
  const publishRoadmap = publish.mutate;
  const unpublishRoadmap = unpublish.mutate;

  const handleRetry = useCallback(() => {
    void refetchPublication();
  }, [refetchPublication]);

  const handleRetryPreview = useCallback(() => {
    void refetchPreview();
  }, [refetchPreview]);

  const handlePublish = useCallback(() => {
    publishRoadmap(expiryInput(linkExpiry), {
      onSuccess: (issued) => {
        setShareUrl(`${window.location.origin}${issued.path}`);
        toast.success("Roadmap published");
      },
      onError: (e) => toast.error(getErrorMessage(e)),
    });
  }, [publishRoadmap, linkExpiry]);

  const handleRotate = useCallback(() => {
    publishRoadmap(expiryInput(linkExpiry), {
      onSuccess: (issued) => {
        setShareUrl(`${window.location.origin}${issued.path}`);
        toast.success("Share link rotated");
        setRotateDialogOpen(false);
      },
      onError: (e) => toast.error(getErrorMessage(e)),
    });
  }, [publishRoadmap, linkExpiry]);

  const handleRotateAndCopy = useCallback(() => {
    publishRoadmap(expiryInput(linkExpiry), {
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
  }, [publishRoadmap, copy, linkExpiry]);

  const handleUnpublish = useCallback(() => {
    unpublishRoadmap(undefined, {
      onSuccess: () => {
        setShareUrl(null);
        toast.success("Roadmap unpublished");
        setUnpublishDialogOpen(false);
      },
      onError: (e) => toast.error(getErrorMessage(e)),
    });
  }, [unpublishRoadmap]);

  const handleUnpublishOpenChange = useCallback((open: boolean) => {
    setUnpublishDialogOpen(open);
  }, []);

  const handleRotateOpenChange = useCallback((open: boolean) => {
    setRotateDialogOpen(open);
  }, []);

  const handleOpenUnpublish = useCallback(() => setUnpublishDialogOpen(true), []);
  const handleOpenRotate = useCallback(() => setRotateDialogOpen(true), []);

  const isPublished = publication.data?.published ?? false;
  const issuedAt = publication.data?.issuedAt ?? null;
  const expiresAt = publication.data?.expiresAt ?? null;

  return useMemo(
    () => ({
      isPublished,
      issuedAt,
      expiresAt,
      isLoading: publication.isLoading,
      isError: publication.isError,
      error: publication.error,
      publicItemCount,
      isPreviewError: preview.isError,
      isPublishing: publish.isPending,
      isUnpublishing: unpublish.isPending,
      shareUrl,
      copied,
      linkExpiry,
      setLinkExpiry: (value: string) => {
        if (isLinkExpiry(value)) setLinkExpiryState(value);
      },
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
    }),
    [
      isPublished,
      issuedAt,
      expiresAt,
      publication.isLoading,
      publication.isError,
      publication.error,
      publicItemCount,
      preview.isError,
      publish.isPending,
      unpublish.isPending,
      shareUrl,
      copied,
      linkExpiry,
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
    ],
  );
}
