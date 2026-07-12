"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { LoadingButton } from "@/components/ui/loading-button";
import { Textarea } from "@/components/ui/textarea";
import { getErrorMessage } from "@/lib/get-error-message";
import { useDeclineSignSession } from "@/hooks/api/sign/public";

export function DeclineDialog({ token, open, onOpenChange }: { token: string; open: boolean; onOpenChange: (open: boolean) => void }) {
  const [reason, setReason] = useState("");
  const decline = useDeclineSignSession(token);

  async function handleConfirm() {
    if (!reason.trim()) {
      toast.error("Please tell the sender why you're declining");
      return;
    }
    try {
      await decline.mutateAsync(reason.trim());
    } catch (error) {
      toast.error(getErrorMessage(error));
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Decline to sign</DialogTitle>
        </DialogHeader>
        <Textarea rows={3} placeholder="Reason (required)" value={reason} onChange={(e) => setReason(e.target.value)} />
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <LoadingButton variant="destructive" onClick={handleConfirm} isPending={decline.isPending} loadingText="Declining…">
            Decline
          </LoadingButton>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
