"use client";

import { useCallback, useState } from "react";
import { Check, Copy, ExternalLink, Globe } from "lucide-react";
import { Button } from "@/components/ui/button";
import { LoadingButton } from "@/components/ui/loading-button";
import { Skeleton } from "@/components/ui/skeleton";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { useCan } from "@/hooks/api/access";
import {
  useProductRoadmapPublication,
  usePublishProductRoadmap,
  useUnpublishProductRoadmap,
} from "@/hooks/api/build/roadmap-public";
import { getErrorMessage } from "@/lib/get-error-message";
import { toast } from "sonner";

interface ProductSettingsPublicationSectionProps {
  managedProductId: number;
}

export function ProductSettingsPublicationSection({
  managedProductId,
}: ProductSettingsPublicationSectionProps) {
  const canManage = useCan("build:roadmap:manage");
  const [revokeOpen, setRevokeOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  const { data, isLoading } = useProductRoadmapPublication(managedProductId);
  const publish = usePublishProductRoadmap(managedProductId);
  const unpublish = useUnpublishProductRoadmap(managedProductId);

  const isPublished = !!data?.token;
  const publicUrl = data?.path
    ? `${typeof window !== "undefined" ? window.location.origin : ""}${data.path}`
    : null;

  const handlePublish = useCallback(() => {
    publish.mutate(undefined, {
      onError: (e) => toast.error(getErrorMessage(e)),
    });
  }, [publish]);

  const handleRevokeConfirm = useCallback(() => {
    unpublish.mutate(undefined, {
      onSuccess: () => {
        toast.success("Roadmap unpublished.");
        setRevokeOpen(false);
      },
      onError: (e) => toast.error(getErrorMessage(e)),
    });
  }, [unpublish]);

  const handleCopy = useCallback(() => {
    if (!publicUrl) return;
    void navigator.clipboard.writeText(publicUrl).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }, [publicUrl]);

  if (isLoading) {
    return (
      <section aria-labelledby="publication-section-heading" className="flex flex-col gap-3">
        <h2 id="publication-section-heading" className="text-sm font-semibold text-foreground">
          Client publication
        </h2>
        <Skeleton className="h-16 w-full" />
      </section>
    );
  }

  return (
    <section aria-labelledby="publication-section-heading" className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <h2 id="publication-section-heading" className="text-sm font-semibold text-foreground">
          Client publication
        </h2>
        {canManage && !isPublished ? (
          <LoadingButton
            type="button"
            variant="outline"
            size="sm"
            isPending={publish.isPending}
            loadingText="Publishing…"
            onClick={handlePublish}
          >
            <Globe aria-hidden="true" />
            Publish roadmap
          </LoadingButton>
        ) : null}
        {canManage && isPublished ? (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setRevokeOpen(true)}
          >
            Unpublish
          </Button>
        ) : null}
      </div>

      {isPublished && publicUrl ? (
        <div className="flex items-center gap-2 rounded-md border border-border bg-muted/40 px-3 py-2">
          <span className="min-w-0 flex-1 truncate text-sm text-muted-foreground">{publicUrl}</span>
          <button
            type="button"
            aria-label="Copy public URL"
            className="shrink-0 rounded p-1 hover:bg-muted"
            onClick={handleCopy}
          >
            {copied ? <Check size={14} aria-hidden="true" /> : <Copy size={14} aria-hidden="true" />}
          </button>
          <a
            href={publicUrl}
            target="_blank"
            rel="noreferrer"
            aria-label="Open public roadmap"
            className="shrink-0 rounded p-1 hover:bg-muted"
          >
            <ExternalLink size={14} aria-hidden="true" />
          </a>
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">
          Publish the roadmap to share it with clients via a public link.
        </p>
      )}

      <ConfirmDialog
        open={revokeOpen}
        onOpenChange={setRevokeOpen}
        title="Unpublish this roadmap?"
        description="The public link will stop working immediately. You can publish again to get a new link."
        confirmLabel="Unpublish"
        destructive
        onConfirm={handleRevokeConfirm}
      />
    </section>
  );
}
