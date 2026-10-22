"use client";

import { useCallback, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { LoadingButton } from "@/components/ui/loading-button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
  isRejectionComplete,
  REJECTION_NOTE_MAX_LENGTH,
  REJECTION_REASONS,
  REJECTION_REASON_LABELS,
  type RejectionDetails,
  type RejectionReason,
} from "@/hooks/api/hr/recruitment/rejection-reasons-schema";

interface RejectCandidateDialogProps {
  candidateName: string | null;
  isPending?: boolean;
  onCancel: () => void;
  onConfirm: (details: RejectionDetails) => void;
}

export function RejectCandidateDialog({
  candidateName,
  isPending = false,
  onCancel,
  onConfirm,
}: RejectCandidateDialogProps) {
  const [reason, setReason] = useState<RejectionReason | null>(null);
  const [note, setNote] = useState("");

  const handleReasonChange = useCallback((value: string) => {
    const next = REJECTION_REASONS.find((code) => code === value);
    if (next) setReason(next);
  }, []);

  const handleNoteChange = useCallback(
    (event: React.ChangeEvent<HTMLTextAreaElement>) => setNote(event.target.value),
    [],
  );

  const handleOpenChange = useCallback(
    (open: boolean) => {
      if (open) return;
      setReason(null);
      setNote("");
      onCancel();
    },
    [onCancel],
  );

  const handleConfirm = useCallback(() => {
    if (!isRejectionComplete(reason, note)) return;
    const trimmed = note.trim();
    onConfirm({
      rejectionReason: reason,
      ...(trimmed.length > 0 ? { rejectionNote: trimmed } : {}),
    });
    setReason(null);
    setNote("");
  }, [reason, note, onConfirm]);

  const needsNote = reason === "OTHER";
  const remaining = REJECTION_NOTE_MAX_LENGTH - note.length;

  return (
    <Dialog open={candidateName !== null} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="text-base">Reject candidate?</DialogTitle>
          <DialogDescription className="text-xs">
            Move <span className="font-semibold text-foreground">{candidateName}</span> to Rejected.
            The reason is recorded on the candidate and the HR team is notified.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label htmlFor="rejection-reason" className="text-xs font-medium">
              Reason
            </Label>
            <Select value={reason ?? ""} onValueChange={handleReasonChange}>
              <SelectTrigger id="rejection-reason" className="text-sm">
                <SelectValue placeholder="Select a reason" />
              </SelectTrigger>
              <SelectContent className="min-w-[var(--radix-select-trigger-width)]">
                {REJECTION_REASONS.map((code) => (
                  <SelectItem key={code} value={code}>
                    {REJECTION_REASON_LABELS[code]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="rejection-note" className="text-xs font-medium">
              {needsNote ? "Note (required for Other)" : "Note (optional)"}
            </Label>
            <Textarea
              id="rejection-note"
              value={note}
              onChange={handleNoteChange}
              maxLength={REJECTION_NOTE_MAX_LENGTH}
              rows={3}
              placeholder={
                needsNote
                  ? "Say why this candidate was rejected."
                  : "Anything the reason code does not capture."
              }
              className="text-sm"
            />
            
            {note.length > 0 && (
              <p className="text-micro text-muted-foreground">{remaining} characters left</p>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" size="sm" onClick={onCancel}>
            Cancel
          </Button>
          <LoadingButton
            size="sm"
            variant="destructive"
            onClick={handleConfirm}
            disabled={!isRejectionComplete(reason, note)}
            isPending={isPending}
            loadingText="Rejecting…"
          >
            Reject
          </LoadingButton>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
