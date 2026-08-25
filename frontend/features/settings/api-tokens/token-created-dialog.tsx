"use client";

import { useState, useCallback } from "react";
import { toast } from "sonner";
import { Check } from "lucide-react";
import { CopyIcon } from "@animateicons/react/lucide";
import { Button } from "@/components/ui/button";
import { useAnimatedIcon } from "@/hooks/common/use-animated-icon";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";

interface TokenCreatedDialogProps {
  open: boolean;
  rawToken: string | null;
  onClose: () => void;
}

function CopyTokenButton({ copied, onCopy }: { copied: boolean; onCopy: () => void }) {
  const { iconRef, hoverHandlers } = useAnimatedIcon();
  return (
    <Button size="sm" variant="outline" onClick={onCopy} className="shrink-0" {...hoverHandlers}>
      {copied ? <Check className="h-4 w-4 text-status-success-ink" /> : <CopyIcon ref={iconRef} size={16} />}
    </Button>
  );
}

export function TokenCreatedDialog({
  open,
  rawToken,
  onClose,
}: TokenCreatedDialogProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = useCallback(async () => {
    if (!rawToken) return;
    try {
      await navigator.clipboard.writeText(rawToken);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      toast.success("Copied to clipboard");
    } catch {
      toast.error("Couldn’t copy automatically. Select and copy the credential manually.");
    }
  }, [rawToken]);

  function handleOpenChange(isOpen: boolean) {
    if (!isOpen) onClose();
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="gap-3 p-4 sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Token Created</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div className="rounded-md border border-status-warning-rule bg-status-warning-surface p-3 text-xs text-status-warning-ink">
            Copy this token now. You won&apos;t be able to see it again.
          </div>
          <div className="flex items-center gap-2">
            <Input
              readOnly
              value={rawToken ?? ""}
              className="font-mono text-xs"
              aria-label="New credential"
              onFocus={(event) => event.currentTarget.select()}
            />
            <CopyTokenButton copied={copied} onCopy={handleCopy} />
          </div>
        </div>
        <DialogFooter>
          <Button size="sm" onClick={onClose}>
            Done
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
