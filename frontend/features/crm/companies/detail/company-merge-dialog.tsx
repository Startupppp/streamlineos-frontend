"use client";

import { useState, useCallback } from "react";
import { GitMerge } from "lucide-react";
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
import { useMergeCrmOrganizations } from "@/hooks/api/crm";
import { TruncatedText } from "@/components/ui/truncated-text";
import { getErrorMessage } from "@/lib/get-error-message";
import type { DuplicateOrgPair } from "@/types/crm";

export interface CompanyMergeDialogProps {
  pair: DuplicateOrgPair;
  currentOrgId: number;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onMergeComplete?: () => void;
}

export function CompanyMergeDialog({ pair, currentOrgId, open, onOpenChange, onMergeComplete }: CompanyMergeDialogProps) {
  const [primaryId, setPrimaryId] = useState<number>(currentOrgId);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const mergeOrgs = useMergeCrmOrganizations();

  const duplicateId = primaryId === pair.org1.id ? pair.org2.id : pair.org1.id;

  const handleConfirmMerge = useCallback(() => {
    mergeOrgs.mutate(
      { primaryId, duplicateId },
      {
        onSuccess: () => {
          toast.success("Companies merged successfully");
          setConfirmOpen(false);
          onOpenChange(false);
          onMergeComplete?.();
        },
        onError: (e) => toast.error(getErrorMessage(e)),
      },
    );
  }, [mergeOrgs, primaryId, duplicateId, onOpenChange, onMergeComplete]);

  const orgs = [pair.org1, pair.org2];

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="text-sm font-semibold flex items-center gap-2">
              <GitMerge className="h-4 w-4" />
              Merge Duplicate Companies
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-xs text-muted-foreground">
              Matched by <Badge variant="outline" className="text-[9px] px-1.5 py-0 h-4">{pair.matchReason}</Badge>. Select the primary company. The duplicate will be soft-deleted and all contacts/deals re-pointed.
            </p>
            <div className="grid grid-cols-2 gap-3">
              {orgs.map((org) => {
                const isPrimary = org.id === primaryId;
                return (
                  <button
                    key={org.id}
                    type="button"
                    onClick={() => setPrimaryId(org.id)}
                    className={`rounded-lg border p-3 text-left transition-all ${
                      isPrimary
                        ? "border-primary bg-primary/10 ring-1 ring-primary"
                        : "border-border hover:border-primary/40"
                    }`}
                  >
                    <div className="flex items-start gap-2">
                      <div className="w-7 rounded-md bg-primary/10 flex items-center justify-center text-dense font-semibold text-primary shrink-0">
                        {org.name[0]?.toUpperCase() ?? "?"}
                      </div>
                      <div className="min-w-0 flex-1">
                        <TruncatedText text={org.name} className="text-xs font-medium" />
                        {org.domain && <TruncatedText text={org.domain} className="text-micro text-muted-foreground" />}
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
              <Button size="sm" className="text-xs" onClick={() => setConfirmOpen(true)}>
                Merge Companies
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
              The duplicate company will be soft-deleted. All contacts and deals will be re-pointed to the primary. This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction asChild>
              <LoadingButton
                isPending={mergeOrgs.isPending}
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
