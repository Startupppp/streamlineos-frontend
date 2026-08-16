"use client";

import { useCallback } from "react";
import { ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { AnimatedIconButton } from "@/components/ui/animated-icon-button";
import { CopyIcon } from "@animateicons/react/lucide";

interface WebhookSecretRevealDialogProps {
  secret: string | null;
  onClose: () => void;
}

export function WebhookSecretRevealDialog({
  secret,
  onClose,
}: WebhookSecretRevealDialogProps) {
  const handleCopy = useCallback(() => {
    if (!secret) return;
    void navigator.clipboard
      .writeText(secret)
      .then(() => toast.success("Signing secret copied"))
      .catch(() => toast.error("Could not copy — select the value and copy manually"));
  }, [secret]);

  const handleOpenChange = useCallback(
    (open: boolean) => {
      if (!open) onClose();
    },
    [onClose],
  );

  return (
    <Dialog open={secret !== null} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ShieldCheck className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
            Copy your signing secret
          </DialogTitle>
          <DialogDescription>
            Use it to verify the <code className="font-mono text-xs">X-StreamlineOS-Signature</code>{" "}
            header on every delivery. This is the only time it is shown — it is
            encrypted at rest and cannot be retrieved again. If you lose it, rotate
            the secret to get a new one.
          </DialogDescription>
        </DialogHeader>

        <div className="flex items-center gap-2 rounded-xl border border-border bg-muted/40 p-3">
          <code className="min-w-0 flex-1 break-all font-mono text-xs text-foreground">
            {secret}
          </code>
          <AnimatedIconButton
            icon={CopyIcon}
            iconSize={14}
            variant="outline"
            size="sm"
            onClick={handleCopy}
            className="shrink-0"
          >
            Copy
          </AnimatedIconButton>
        </div>

        <DialogFooter>
          <Button onClick={onClose}>I&apos;ve saved it</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
