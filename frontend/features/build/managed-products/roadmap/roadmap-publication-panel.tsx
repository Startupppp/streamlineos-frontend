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
  const { data: publication, isLoading } = useProductRoadmapPublication(managedProductId);
  const { data: preview } = useRoadmapPreview(managedProductId);
  const publish = usePublishProductRoadmap(managedProductId);
  const unpublish = useUnpublishProductRoadmap(managedProductId);

  const [unpublishDialogOpen, setUnpublishDialogOpen] = useState(false);
  const [rotateDialogOpen, setRotateDialogOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [shareUrl, setShareUrl] = useState<string | null>(null);

  const isPublished = publication?.published ?? false;

  const publicItemCount =
    preview
      ? (preview.roadmap.planned?.length ?? 0) +
        (preview.roadmap.in_progress?.length ?? 0) +
        (preview.roadmap.completed?.length ?? 0)
      : 0;

  const handleCopy = useCallback(async () => {
    if (!shareUrl) return;
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Could not copy to clipboard");
    }
  }, [shareUrl]);

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
            {isLoading ? null : isPublished ? (
              <div className="flex flex-col gap-4">
                <div className="flex items-center gap-2">
                  <Globe className="size-4 shrink-0 text-green-600" aria-hidden />
                  <p className="text-sm font-medium text-foreground">Published</p>
                </div>
                <p className="text-sm text-muted-foreground">
                  {publicItemCount === 0
                    ? "No items are marked as public. Mark roadmap items public for them to appear."
                    : `${String(publicItemCount)} item${publicItemCount === 1 ? "" : "s"} visible to the public.`}
                </p>
                <p className="text-sm text-muted-foreground">
                  The public board is not a snapshot. It reflects your roadmap as
                  you change it, so edits appear on the shared link.
                </p>
                {shareUrl ? (
                  <div className="flex items-center gap-2 rounded-md border bg-muted/40 px-3 py-2">
                    <p className="min-w-0 flex-1 truncate font-mono text-xs text-foreground">
                      {shareUrl}
                    </p>
                    <button
                      type="button"
                      aria-label="Copy share link"
                      onClick={handleCopy}
                      className="shrink-0 rounded p-1 text-muted-foreground transition-colors hover:text-foreground"
                    >
                      {copied ? (
                        <Check className="size-3.5 text-green-600" aria-hidden />
                      ) : (
                        <Copy className="size-3.5" aria-hidden />
                      )}
                    </button>
                    <Link
                      href={shareUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      aria-label="Open public roadmap page"
                      className="shrink-0 rounded p-1 text-muted-foreground transition-colors hover:text-foreground"
                    >
                      <ExternalLink className="size-3.5" aria-hidden />
                    </Link>
                  </div>
                ) : (
                  <p className="rounded-md border bg-muted/40 px-3 py-2 text-xs text-muted-foreground">
                    A public link is active. For safety the link itself is stored
                    only as a hash, so it cannot be shown again — rotate it below
                    to get a new one.
                  </p>
                )}
                {shareUrl ? (
                  <p className="text-xs text-muted-foreground">
                    Copy this link now. It is not shown again after you close this
                    panel.
                  </p>
                ) : null}
                <div className="flex flex-col gap-2 pt-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="w-full justify-start gap-2"
                    onClick={handleOpenRotate}
                  >
                    <RefreshCw className="size-3.5" aria-hidden />
                    Rotate share link
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="w-full justify-start gap-2 text-destructive hover:text-destructive"
                    onClick={handleOpenUnpublish}
                  >
                    <EyeOff className="size-3.5" aria-hidden />
                    Unpublish
                  </Button>
                </div>
              </div>
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
