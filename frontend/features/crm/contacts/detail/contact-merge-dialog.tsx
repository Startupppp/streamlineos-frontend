"use client";

import { useState, useCallback } from "react";
import { AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { LoadingButton } from "@/components/ui/loading-button";
import { useContactDuplicates, useMergeContacts } from "@/hooks/api/crm";
import { TruncatedText } from "@/components/ui/truncated-text";
import { getErrorMessage } from "@/lib/get-error-message";
import type { DuplicateContactPair } from "@/types/crm";

interface ContactDuplicateBannerProps {
  contactId: number;
  onMergeComplete?: () => void;
}

export function ContactDuplicateBanner({ contactId, onMergeComplete }: ContactDuplicateBannerProps) {
  const { data: duplicates } = useContactDuplicates();
  const [mergeTarget, setMergeTarget] = useState<DuplicateContactPair | null>(null);

  const relevantDuplicates = duplicates?.filter(
    (d) => d.contact1.id === contactId || d.contact2.id === contactId,
  ) ?? [];

  if (relevantDuplicates.length === 0) return null;

  return (
    <>
      <div className="flex items-center gap-2 rounded-lg border border-amber-200 dark:border-amber-500/30 bg-amber-50 dark:bg-amber-500/10 px-3 py-2 text-xs text-amber-800 dark:text-amber-300">
        <AlertTriangle className="h-3.5 w-3.5 shrink-0 text-amber-600 dark:text-amber-400" />
        <span>
          {relevantDuplicates.length} potential duplicate{relevantDuplicates.length > 1 ? "s" : ""} detected.
        </span>
        <Button
          variant="link"
          size="sm"
          className="h-auto p-0 text-xs text-amber-700 dark:text-amber-300 underline"
          onClick={() => setMergeTarget(relevantDuplicates[0] ?? null)}
        >
          Review
        </Button>
      </div>
      {mergeTarget && (
        <ContactMergeDialog
          pair={mergeTarget}
          currentContactId={contactId}
          open
          onOpenChange={(open) => { if (!open) setMergeTarget(null); }}
          onMergeComplete={onMergeComplete}
        />
      )}
    </>
  );
}

export interface ContactMergeDialogProps {
  pair: DuplicateContactPair;
  currentContactId: number;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onMergeComplete?: () => void;
}

export function ContactMergeDialog({ pair, currentContactId, open, onOpenChange, onMergeComplete }: ContactMergeDialogProps) {
  const [primaryId, setPrimaryId] = useState<number>(currentContactId);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const mergeContacts = useMergeContacts();

  const duplicateId = primaryId === pair.contact1.id ? pair.contact2.id : pair.contact1.id;

  const handleConfirmMerge = useCallback(() => {
    mergeContacts.mutate(
      { primaryId, duplicateId },
      {
        onSuccess: () => {
          toast.success("Contacts merged successfully");
          setConfirmOpen(false);
          onOpenChange(false);
          onMergeComplete?.();
        },
        onError: (e) => toast.error(getErrorMessage(e)),
      },
    );
  }, [mergeContacts, primaryId, duplicateId, onOpenChange, onMergeComplete]);

  const contact1 = pair.contact1;
  const contact2 = pair.contact2;

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="text-sm font-semibold">Merge Duplicate Contacts</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-xs text-muted-foreground">
              Matched by <Badge variant="outline" className="text-[9px] px-1.5 py-0 h-4">{pair.matchReason}</Badge>. Select the primary contact to keep. The other will be merged into it and soft-deleted.
            </p>
            <div className="grid grid-cols-2 gap-3">
              {[contact1, contact2].map((c) => {
                const isPrimary = c.id === primaryId;
                return (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => setPrimaryId(c.id)}
                    className={`rounded-lg border p-3 text-left transition-all ${
                      isPrimary
                        ? "border-primary bg-primary/5 ring-1 ring-primary"
                        : "border-border hover:border-primary/50"
                    }`}
                  >
                    <div className="flex items-start gap-2">
                      <div className="w-7 rounded-full bg-primary/10 flex items-center justify-center text-[11px] font-semibold text-primary shrink-0">
                        {c.name[0]?.toUpperCase() ?? "?"}
                      </div>
                      <div className="min-w-0 flex-1">
                        <TruncatedText text={c.name} className="text-xs font-medium" />
                        {c.email && <TruncatedText text={c.email} className="text-[10px] text-muted-foreground" />}
                        {c.phone && <p className="text-[10px] text-muted-foreground font-mono">{c.phone}</p>}
                      </div>
                      {isPrimary && (
                        <Badge className="text-[9px] px-1.5 py-0 h-4 bg-primary shrink-0">Primary</Badge>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" size="sm" className="text-xs" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button
                size="sm"
                className="text-xs"
                onClick={() => setConfirmOpen(true)}
              >
                Merge Contacts
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirm merge</AlertDialogTitle>
            <AlertDialogDescription>
              The duplicate contact will be soft-deleted and all associated data will be re-pointed to the primary. This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction asChild>
              <LoadingButton
                isPending={mergeContacts.isPending}
                loadingText="Merging..."
                onClick={handleConfirmMerge}
                className="bg-destructive text-white hover:bg-destructive/90"
              >
                Merge
              </LoadingButton>
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
