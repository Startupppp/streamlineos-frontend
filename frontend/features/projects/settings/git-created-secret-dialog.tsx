"use client";

import { useCallback } from "react";
import { ShieldCheck } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { CopyButton } from "./git-connection-row";
import type { CreatedGitConnection } from "@/hooks/api/git-integration";

interface CreatedSecretDialogProps {
  created: CreatedGitConnection;
  onClose: () => void;
}

export function CreatedSecretDialog({
  created,
  onClose,
}: CreatedSecretDialogProps) {
  const handleOpenChange = useCallback(
    (open: boolean) => {
      if (!open) onClose();
    },
    [onClose],
  );

  return (
    <Dialog open onOpenChange={handleOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ShieldCheck className="h-4.5 w-4.5 text-emerald-500" />
            Connection created
          </DialogTitle>
          <DialogDescription>
            Copy the webhook secret now. It will not be shown again.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Webhook URL</Label>
            <div className="flex items-center gap-2 rounded-md border border-border bg-muted/40 px-2.5 py-1.5">
              <code className="text-xs font-mono truncate flex-1 min-w-0">
                {created.webhookUrl}
              </code>
              <CopyButton value={created.webhookUrl} label="Webhook URL" />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">
              Webhook secret
            </Label>
            <div className="flex items-center gap-2 rounded-md border border-border bg-muted/40 px-2.5 py-1.5">
              <code className="text-xs font-mono truncate flex-1 min-w-0">
                {created.webhookSecret}
              </code>
              <CopyButton value={created.webhookSecret} label="Secret" />
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button onClick={onClose}>Done</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
