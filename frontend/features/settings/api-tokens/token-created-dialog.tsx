"use client";

import { useState, useCallback } from "react";
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
      {copied ? <Check className="h-4 w-4 text-green-600" /> : <CopyIcon ref={iconRef} size={16} />}
    </Button>
  );
}

export function TokenCreatedDialog({
  open,
  rawToken,
  onClose,
}: TokenCreatedDialogProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = useCallback(() => {
    if (!rawToken) return;
    navigator.clipboard.writeText(rawToken).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }, [rawToken]);

  function handleOpenChange(isOpen: boolean) {
    if (!isOpen) onClose();
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Token Created</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="rounded-md bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 p-3 text-sm text-amber-800 dark:text-amber-300">
            Copy this token now. You won&apos;t be able to see it again.
          </div>
          <div className="flex items-center gap-2">
            <Input readOnly value={rawToken ?? ""} className="font-mono text-xs" />
            <CopyTokenButton copied={copied} onCopy={handleCopy} />
          </div>
        </div>
        <DialogFooter>
          <Button onClick={onClose}>Done</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
