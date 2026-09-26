"use client";

import { useCallback, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export interface IssuedSecret {
  platform: string;
  inboundSecret: string;
  callbackPath: string;
}

interface Props {
  issued: IssuedSecret | null;
  onClose: () => void;
}

/**
 * The one moment the inbound callback secret is visible.
 *
 * The server returns it from the rotate call and never again — the list
 * endpoint has no field for it. So this dialog is not a convenience: if it is
 * dismissed without the value being copied, the only way forward is to rotate
 * again, which is exactly the property a shared secret should have.
 *
 * Rotating also breaks deliveries signed with the previous secret, and the
 * copy says so. A recruiter who rotates to "check what it is" and then wonders
 * why applications stopped arriving is a support ticket this sentence prevents.
 */
export function InboundSecretDialog({ issued, onClose }: Props) {
  const [copied, setCopied] = useState(false);

  const handleCopy = useCallback(() => {
    if (!issued) return;
    navigator.clipboard
      .writeText(issued.inboundSecret)
      .then(() => {
        setCopied(true);
        toast.success("Secret copied");
      })
      .catch(() => toast.error("Could not copy. Select the value and copy it manually."));
  }, [issued]);

  const handleOpenChange = useCallback(
    (open: boolean) => {
      if (!open) {
        setCopied(false);
        onClose();
      }
    },
    [onClose],
  );

  return (
    <Dialog open={issued !== null} onOpenChange={handleOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Callback secret for {issued?.platform}</DialogTitle>
          <DialogDescription>
            Paste this into the board&apos;s webhook settings alongside the callback URL. It is
            shown once — closing this dialog is the last time you can read it, and rotating again
            will stop deliveries signed with this one.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <div className="rounded-lg border bg-muted/40 px-3 py-2">
            <p className="text-xs text-muted-foreground mb-1">Callback URL</p>
            <code className="text-xs break-all">{issued?.callbackPath}</code>
          </div>
          <div className="rounded-lg border bg-muted/40 px-3 py-2">
            <p className="text-xs text-muted-foreground mb-1">Signing secret</p>
            <code className="text-xs break-all">{issued?.inboundSecret}</code>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleCopy}>
            {copied ? "Copied" : "Copy secret"}
          </Button>
          <Button onClick={onClose}>Done</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
