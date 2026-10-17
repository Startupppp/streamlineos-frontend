"use client";

import { useState } from "react";
import { Switch } from "@/components/ui/switch";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";

interface PublicationStateBannerProps {
  portalPublishedAt: string | null;
  grantCount: number;
  isPending: boolean;
  canManage: boolean;
  onPublish: () => void;
  onUnpublish: () => void;
}

export function PublicationStateBanner({
  portalPublishedAt,
  grantCount,
  isPending,
  canManage,
  onPublish,
  onUnpublish,
}: PublicationStateBannerProps) {
  const [confirmUnpublish, setConfirmUnpublish] = useState(false);
  const [confirmPublish, setConfirmPublish] = useState(false);
  const isPublished = portalPublishedAt !== null;

  function handleToggle(checked: boolean) {
    if (checked) {
      setConfirmPublish(true);
    } else {
      setConfirmUnpublish(true);
    }
  }

  return (
    <>
      <div className="flex items-center justify-between rounded-lg border border-border bg-muted/40 px-4 py-3">
        <div className="flex flex-col gap-0.5">
          <span className="text-sm font-medium">
            {isPublished ? "Portal published" : "Portal not published"}
          </span>
          <span className="text-xs text-muted-foreground">
            {isPublished
              ? `Published since ${new Date(portalPublishedAt).toLocaleDateString()}. ${grantCount} active ${grantCount === 1 ? "grant" : "grants"}.`
              : "Clients with a grant cannot access the portal until it is published."}
          </span>
        </div>
        <Switch
          checked={isPublished}
          onCheckedChange={handleToggle}
          disabled={isPending || !canManage}
          aria-label={isPublished ? "Unpublish client portal" : "Publish client portal"}
        />
      </div>
      <ConfirmDialog
        open={confirmPublish}
        onOpenChange={setConfirmPublish}
        title="Publish portal?"
        description="Clients with an active grant will be able to see published project content. You can unpublish later without removing grants."
        confirmLabel="Publish"
        onConfirm={onPublish}
      />
      <ConfirmDialog
        open={confirmUnpublish}
        onOpenChange={setConfirmUnpublish}
        title="Unpublish portal?"
        description="Clients will lose access immediately. Grants are preserved and the portal can be republished."
        confirmLabel="Unpublish"
        onConfirm={onUnpublish}
        destructive
      />
    </>
  );
}
