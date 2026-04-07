"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader as DlgHeader,
  DialogTitle as DlgTitle,
  DialogFooter as DlgFooter,
} from "@/components/ui/dialog";

interface WorkLogRejectDialogProps {
  open: boolean;
  onClose: () => void;
  onReject: (reason?: string) => void;
}

/**
 * Rejection reason dialog shown when an admin clicks "Reject" on a work log entry.
 * Manages its own local `rejectReason` input state so the parent stays clean.
 */
export function WorkLogRejectDialog({ open, onClose, onReject }: WorkLogRejectDialogProps) {
  const [rejectReason, setRejectReason] = useState("");

  const handleReject = () => {
    onReject(rejectReason || undefined);
    setRejectReason("");
    onClose();
  };

  const handleClose = () => {
    setRejectReason("");
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={(isOpen) => { if (!isOpen) handleClose(); }}>
      <DialogContent>
        <DlgHeader>
          <DlgTitle>Rejection reason</DlgTitle>
        </DlgHeader>
        <Textarea
          placeholder="Reason (optional)"
          value={rejectReason}
          onChange={(e) => setRejectReason(e.target.value)}
          className="min-h-[80px]"
        />
        <DlgFooter>
          <Button variant="outline" onClick={handleClose}>Cancel</Button>
          <Button variant="destructive" onClick={handleReject}>
            Reject
          </Button>
        </DlgFooter>
      </DialogContent>
    </Dialog>
  );
}
