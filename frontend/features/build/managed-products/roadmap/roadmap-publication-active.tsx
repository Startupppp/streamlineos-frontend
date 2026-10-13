"use client";

import Link from "next/link";
import { Check, Copy, EyeOff, ExternalLink, Globe, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { LoadingButton } from "@/components/ui/loading-button";
import { formatDateTime } from "@/lib/date-utils";

interface RoadmapPublicationActiveProps {
  publicItemCount: number | null;
  publicItemCountError: boolean;
  shareUrl: string | null;
  copied: boolean;
  issuedAt: string | null;
  expiresAt: string | null;
  isRotating: boolean;
  canManage?: boolean;
  onCopy: () => void;
  onRotateAndCopy: () => void;
  onOpenRotate: () => void;
  onOpenUnpublish: () => void;
  onRetryPublicItemCount?: () => void;
}

export function RoadmapPublicationActive({
  publicItemCount,
  publicItemCountError,
  shareUrl,
  copied,
  issuedAt,
  expiresAt,
  isRotating,
  canManage = true,
  onCopy,
  onRotateAndCopy,
  onOpenRotate,
  onOpenUnpublish,
  onRetryPublicItemCount,
}: RoadmapPublicationActiveProps) {
  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-2">
        <Globe className="size-4 shrink-0 text-green-600" aria-hidden />
        <p className="text-sm font-medium text-foreground">Published</p>
      </div>
      {publicItemCount !== null ? (
        <p className="text-sm text-muted-foreground">
          {publicItemCount === 0
            ? "No items are marked as public. Mark roadmap items public for them to appear."
            : `${String(publicItemCount)} item${publicItemCount === 1 ? "" : "s"} visible to the public.`}
        </p>
      ) : publicItemCountError ? (
        <div className="flex flex-wrap items-center gap-2">
          <p className="text-sm text-muted-foreground">
            The number of publicly visible items could not be loaded.
          </p>
          {onRetryPublicItemCount ? (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onRetryPublicItemCount}
            >
              Retry
            </Button>
          ) : null}
        </div>
      ) : null}
      <p className="text-sm text-muted-foreground">
        The public board is not a snapshot. It reflects your roadmap as you
        change it, so edits appear on the shared link.
      </p>
      {shareUrl ? (
        <div className="flex items-center gap-2 rounded-md border bg-muted/40 px-3 py-2">
          <p className="min-w-0 flex-1 truncate font-mono text-xs text-foreground">
            {shareUrl}
          </p>
          <button
            type="button"
            aria-label="Copy share link"
            onClick={onCopy}
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
        <div className="flex flex-col gap-2 rounded-md border bg-muted/40 px-3 py-2">
          <p className="text-xs text-muted-foreground">
            A public link is active. For safety the link itself is stored only as
            a hash, so it cannot be shown again.
          </p>
          <dl className="flex flex-col gap-0.5 text-xs text-muted-foreground">
            <div className="flex gap-1.5">
              <dt>Link issued</dt>
              <dd className="font-mono tabular-nums text-foreground">
                {issuedAt ? formatDateTime(issuedAt) : "Unknown"}
              </dd>
            </div>
            <div className="flex gap-1.5">
              <dt>Expires</dt>
              <dd className="font-mono tabular-nums text-foreground">
                {expiresAt ? formatDateTime(expiresAt) : "No expiry"}
              </dd>
            </div>
          </dl>
          {canManage ? (
            <LoadingButton
              type="button"
              variant="outline"
              size="sm"
              className="w-full justify-start gap-2"
              isPending={isRotating}
              loadingText="Rotating…"
              onClick={onRotateAndCopy}
            >
              <RefreshCw className="size-3.5" aria-hidden />
              Rotate and copy new link
            </LoadingButton>
          ) : null}
        </div>
      )}
      {shareUrl ? (
        <p className="text-xs text-muted-foreground">
          Copy this link now. It is not shown again after you close this panel.
        </p>
      ) : null}
      {canManage ? (
        <div className="flex flex-col gap-2 pt-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="w-full justify-start gap-2"
            onClick={onOpenRotate}
          >
            <RefreshCw className="size-3.5" aria-hidden />
            Rotate share link
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="w-full justify-start gap-2 text-destructive hover:text-destructive"
            onClick={onOpenUnpublish}
          >
            <EyeOff className="size-3.5" aria-hidden />
            Unpublish
          </Button>
        </div>
      ) : null}
    </div>
  );
}
