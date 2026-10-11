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
import { useFeedbucketWidgets } from "@/hooks/api/feedbucket/use-feedbucket-widgets";
import { buildFeedbucketEmbedSnippet } from "@/lib/feedbucket";
import { toast } from "sonner";

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
  const { data: widgets } = useFeedbucketWidgets();
  const [copied, setCopied] = useState(false);

  const productWidgets = useMemo(
    () =>
      (widgets ?? []).filter(
        (w) =>
          w.managedProductId === managedProductId && w.isActive && !w.deletedAt,
      ),
    [widgets, managedProductId],
  );

  const firstWidget = productWidgets[0] ?? null;

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
        {firstWidget ? (
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
        ) : (
          <div className="flex flex-col gap-3">
            <p className="text-sm text-muted-foreground">
              No active Feedbucket widget is linked to this product. Create and
              activate a widget in the project&apos;s Feedbucket settings, then
              link it to this managed product.
            </p>
            <p className="text-xs text-muted-foreground">
              To link a widget: open <strong>Build → Feedbucket</strong> for a
              project, create or edit a widget, and set its managed product to
              this product.
            </p>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
