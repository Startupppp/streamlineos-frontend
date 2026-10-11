"use client";

import { useEffect, useMemo, useState, useCallback } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { LoadingButton } from "@/components/ui/loading-button";
import {
  useCreateFeedbucketWidget,
  useFeedbucketWidgets,
  useUpdateFeedbucketWidget,
} from "@/hooks/api/feedbucket/use-feedbucket-widgets";
import { useManagedProduct } from "@/hooks/api/build/managed-products";
import { useCan } from "@/hooks/api/access";
import { buildFeedbucketEmbedSnippet } from "@/lib/feedbucket";
import { getErrorMessage } from "@/lib/get-error-message";
import { toast } from "sonner";

const INTERNAL_CAPTURE_WIDGET_NAME = "Product capture";

interface FeedbucketCollectDialogProps {
  managedProductId: number;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function FeedbucketCollectDialog({
  managedProductId,
  open,
  onOpenChange,
}: FeedbucketCollectDialogProps) {
  const { data: widgets, isLoading } = useFeedbucketWidgets();
  const { data: product } = useManagedProduct(managedProductId);
  const canCreate = useCan("feedbucket:widgets:create");
  const canUpdate = useCan("feedbucket:widgets:update");
  const createWidget = useCreateFeedbucketWidget();
  const updateWidget = useUpdateFeedbucketWidget();
  const [copied, setCopied] = useState(false);

  const productWidgets = useMemo(
    () =>
      (widgets ?? []).filter(
        (w) =>
          w.managedProductId === managedProductId &&
          !w.deletedAt &&
          w.name !== INTERNAL_CAPTURE_WIDGET_NAME,
      ),
    [widgets, managedProductId],
  );

  const firstWidget = productWidgets.find((w) => w.isActive) ?? null;
  const inactiveWidget = firstWidget ? null : (productWidgets[0] ?? null);

  const snippet = useMemo(
    () =>
      firstWidget
        ? buildFeedbucketEmbedSnippet({ publicKey: firstWidget.publicKey })
        : null,
    [firstWidget],
  );

  const handleCopy = useCallback(async () => {
    if (!snippet) return;
    try {
      await navigator.clipboard.writeText(snippet);
      setCopied(true);
    } catch {
      toast.error("Could not copy to clipboard");
    }
  }, [snippet]);

  const handleCreate = useCallback(() => {
    const name = product?.name ? `${product.name} feedback` : "Product feedback";
    createWidget.mutate(
      { name, managedProductId },
      {
        onSuccess: () => toast.success("Feedbucket widget created"),
        onError: (error) => toast.error(getErrorMessage(error)),
      },
    );
  }, [createWidget, managedProductId, product?.name]);

  const handleActivate = useCallback(() => {
    if (!inactiveWidget) return;
    updateWidget.mutate(
      { widgetId: inactiveWidget.id, input: { isActive: true } },
      {
        onSuccess: () => toast.success("Feedbucket widget activated"),
        onError: (error) => toast.error(getErrorMessage(error)),
      },
    );
  }, [inactiveWidget, updateWidget]);

  useEffect(() => {
    if (!copied) return;
    const timer = setTimeout(() => setCopied(false), 2000);
    return () => clearTimeout(timer);
  }, [copied]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Collect feedback via Feedbucket</DialogTitle>
          <DialogDescription>
            Embed the Feedbucket widget on your product to collect user feedback
            directly. Submissions from this widget will appear on the Feedback
            tab with the{" "}
            <Badge variant="secondary" className="text-xs">
              Feedbucket
            </Badge>{" "}
            channel.
          </DialogDescription>
        </DialogHeader>
        {isLoading ? (
          <p className="text-sm text-muted-foreground">Loading widgets…</p>
        ) : firstWidget ? (
          <div className="flex flex-col gap-3">
            <p className="text-sm text-muted-foreground">
              Active widget:{" "}
              <span className="font-medium text-foreground">
                {firstWidget.name}
              </span>
            </p>
            <pre className="rounded-md bg-muted px-4 py-3 text-xs font-mono break-all whitespace-pre-wrap select-all">
              {snippet}
            </pre>
            <Button
              type="button"
              onClick={handleCopy}
              variant="outline"
              size="sm"
              className="self-start"
            >
              {copied ? "Copied!" : "Copy snippet"}
            </Button>
          </div>
        ) : inactiveWidget ? (
          <div className="flex flex-col gap-3">
            <p className="text-sm text-muted-foreground">
              <span className="font-medium text-foreground">
                {inactiveWidget.name}
              </span>{" "}
              is linked to this product but paused. Activate it to get the embed
              snippet.
            </p>
            {canUpdate ? (
              <LoadingButton
                type="button"
                size="sm"
                className="self-start"
                isPending={updateWidget.isPending}
                loadingText="Activating…"
                onClick={handleActivate}
              >
                Activate widget
              </LoadingButton>
            ) : (
              <p className="text-xs text-muted-foreground">
                Ask an admin with Feedbucket access to activate it.
              </p>
            )}
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            <p className="text-sm text-muted-foreground">
              No Feedbucket widget is linked to this product yet. Create one to
              get an embed snippet for your site.
            </p>
            {canCreate ? (
              <LoadingButton
                type="button"
                size="sm"
                className="self-start"
                isPending={createWidget.isPending}
                loadingText="Creating…"
                onClick={handleCreate}
              >
                Create product widget
              </LoadingButton>
            ) : (
              <p className="text-xs text-muted-foreground">
                Ask an admin with Feedbucket access to create a widget for this
                product.
              </p>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
