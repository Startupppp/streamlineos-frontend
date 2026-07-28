"use client";

import { useState, useCallback, useMemo } from "react";
import { toast } from "sonner";
import { ArrowRightLeft, Clock } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { LoadingButton } from "@/components/ui/loading-button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import {
  useIncomingOrgTransfers,
  useAcceptTransfer,
  useDeclineTransfer,
} from "@/hooks/api/ownership";
import { useOrgMembers } from "@/hooks/api/organization";
import { getErrorMessage } from "@/lib/get-error-message";

export function OrgIncomingTransferSection() {
  const { data: incomingData } = useIncomingOrgTransfers();

  const incomingTransfer = incomingData?.data[0] ?? null;

  const { data: membersData } = useOrgMembers(1, 100, undefined, {
    enabled: incomingTransfer !== null,
    staleTime: 2 * 60_000,
  });

  const senderName = useMemo(() => {
    if (!incomingTransfer || !membersData) return null;
    const sender = membersData.data.find(
      (m) => m.membershipId === incomingTransfer.fromMembershipId,
    );
    return sender?.name ?? sender?.email ?? null;
  }, [incomingTransfer, membersData]);

  const acceptMutation = useAcceptTransfer();
  const declineMutation = useDeclineTransfer();

  const [acceptOpen, setAcceptOpen] = useState(false);
  const [declineOpen, setDeclineOpen] = useState(false);

  const handleOpenAccept = useCallback(() => setAcceptOpen(true), []);
  const handleOpenDecline = useCallback(() => setDeclineOpen(true), []);

  const handleAcceptOpenChange = useCallback((open: boolean) => {
    setAcceptOpen(open);
  }, []);

  const handleDeclineOpenChange = useCallback((open: boolean) => {
    setDeclineOpen(open);
  }, []);

  function handleConfirmAccept() {
    if (!incomingTransfer) return;
    acceptMutation.mutate(incomingTransfer.id, {
      onSuccess: () => {
        toast.success(
          "Ownership accepted — you are now the organization owner",
        );
        setAcceptOpen(false);
      },
      onError: (err) => toast.error(getErrorMessage(err)),
    });
  }

  function handleConfirmDecline() {
    if (!incomingTransfer) return;
    declineMutation.mutate(
      { transferId: incomingTransfer.id },
      {
        onSuccess: () => {
          toast.success("Ownership transfer declined");
          setDeclineOpen(false);
        },
        onError: (err) => toast.error(getErrorMessage(err)),
      },
    );
  }

  if (!incomingTransfer) {
    return null;
  }

  const expiresAt = new Date(incomingTransfer.expiresAt);
  const expiresLabel = expiresAt.toLocaleString("en-IN", {
    dateStyle: "medium",
    timeStyle: "short",
  });

  return (
    <>
      <Card className="border-amber-300/60 dark:border-amber-700/50">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold flex items-center gap-2 text-amber-800 dark:text-amber-400">
            <ArrowRightLeft className="h-4 w-4 shrink-0" />
            Incoming Ownership Transfer
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-0">
          <div className="flex items-start justify-between gap-4 py-3">
            <div className="min-w-0 space-y-1">
              <p className="text-sm font-medium">
                {senderName
                  ? `${senderName} is transferring organization ownership to you`
                  : "The current organization owner is transferring ownership to you"}
              </p>
              <p className="text-xs text-muted-foreground">
                Accepting makes you the org owner and demotes the current owner.
                This cannot be undone.
              </p>
              <div className="flex flex-wrap items-center gap-2 pt-1">
                <Badge
                  variant="outline"
                  className="text-xs gap-1 text-amber-700 border-amber-300 bg-amber-50 dark:text-amber-400 dark:border-amber-700/50 dark:bg-amber-500/10"
                >
                  <Clock className="h-3 w-3" />
                  Expires {expiresLabel}
                </Badge>
                {incomingTransfer.reason && (
                  <span className="text-xs text-muted-foreground">
                    Reason: {incomingTransfer.reason}
                  </span>
                )}
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <LoadingButton
                variant="outline"
                size="sm"
                className="h-7 text-xs"
                isPending={declineMutation.isPending}
                onClick={handleOpenDecline}
              >
                Decline
              </LoadingButton>
              <LoadingButton
                variant="default"
                size="sm"
                className="h-7 text-xs"
                isPending={acceptMutation.isPending}
                onClick={handleOpenAccept}
              >
                Accept
              </LoadingButton>
            </div>
          </div>
        </CardContent>
      </Card>

      <ConfirmDialog
        open={acceptOpen}
        onOpenChange={handleAcceptOpenChange}
        title="Accept Organization Ownership"
        description="You will become the organization owner immediately. The current owner will be demoted to admin. This action is permanent and cannot be reversed — proceed only if you are ready to take full responsibility for this organization."
        confirmLabel="Accept Ownership"
        isPending={acceptMutation.isPending}
        onConfirm={handleConfirmAccept}
      />

      <ConfirmDialog
        open={declineOpen}
        onOpenChange={handleDeclineOpenChange}
        title="Decline Ownership Transfer"
        description="The transfer request will be declined and the current owner will remain as owner. You can be re-invited to accept ownership later."
        confirmLabel="Decline Transfer"
        isPending={declineMutation.isPending}
        onConfirm={handleConfirmDecline}
      />
    </>
  );
}
