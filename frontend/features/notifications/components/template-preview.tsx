"use client";

import { useState } from "react";
import { toast } from "sonner";
import { LoadingButton } from "@/components/ui/loading-button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  usePreviewTemplate,
} from "@/hooks/api/notifications";
import type {
  NotificationTemplate,
} from "@/types/notifications";

export function PreviewDialog({
  open,
  template,
  onClose,
}: {
  open: boolean;
  template: NotificationTemplate | null;
  onClose: () => void;
}) {
  const preview = usePreviewTemplate();
  const [result, setResult] = useState<{
    subject: string | null;
    body: string;
  } | null>(null);

  function handlePreview() {
    if (!template) return;
    const vars: Record<string, string> = {};
    template.variables.forEach((v) => {
      vars[v] = `{{${v}}}`;
    });
    preview.mutate(
      { id: template.id, variables: vars },
      {
        onSuccess: (data) => setResult(data),
        onError: () => toast.error("Failed to preview template"),
      },
    );
  }

  function handleOpenChange(v: boolean) {
    if (!v) {
      setResult(null);
      onClose();
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Preview — {template?.name}</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          {result ? (
            <>
              {result.subject && (
                <div className="space-y-1">
                  <p className="text-xs font-medium text-muted-foreground uppercase">
                    Subject
                  </p>
                  <p className="text-sm font-medium">{result.subject}</p>
                </div>
              )}
              <div className="space-y-1">
                <p className="text-xs font-medium text-muted-foreground uppercase">
                  Body
                </p>
                <div className="rounded-lg border bg-muted/30 p-3 text-sm whitespace-pre-wrap">
                  {result.body}
                </div>
              </div>
            </>
          ) : (
            <div className="rounded-lg border bg-muted/30 p-3">
              <p className="text-xs text-muted-foreground">
                Variables:{" "}
                <span className="font-mono">
                  {template?.variables.join(", ") || "none"}
                </span>
              </p>
              <div className="mt-2 whitespace-pre-wrap text-sm text-muted-foreground">
                {template?.body}
              </div>
            </div>
          )}
          <LoadingButton
            className="w-full"
            variant="outline"
            onClick={handlePreview}
            isPending={preview.isPending}
            loadingText="Generating..."
          >
            Render with sample variables
          </LoadingButton>
        </div>
      </DialogContent>
    </Dialog>
  );
}

/** Only these channels gate sending on a provider-approved template. */
