"use client";

import { useCallback } from "react";
import { ShieldCheck } from "lucide-react";
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { CopyButton } from "./git-connection-row";
import { SetupInstructions } from "./git-setup-instructions";
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

  const isGithub = created.provider === "github";

  return (
    <Dialog open onOpenChange={handleOpenChange}>
      <DialogContent className="flex max-h-[90dvh] flex-col gap-0 overflow-hidden p-0 sm:max-w-lg">
        <DialogHeader className="shrink-0 px-4 pb-2 pt-3.5">
          <DialogTitle className="flex items-center gap-2">
            <ShieldCheck className="h-4 w-4 text-emerald-500" />
            Connection created
          </DialogTitle>
          <DialogDescription className="text-xs">
            Copy the webhook secret now. It will not be shown again.
          </DialogDescription>
        </DialogHeader>
        <DialogBody className="space-y-3 px-4 py-2">
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
          {isGithub ? (
            <SetupInstructions
              compact
              className="rounded-lg border border-border/60 bg-muted/20 p-3"
            />
          ) : null}
        </DialogBody>
        <DialogFooter className="shrink-0 border-t border-border/60 px-4 py-3">
          <Button size="sm" onClick={onClose}>
            Done
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
