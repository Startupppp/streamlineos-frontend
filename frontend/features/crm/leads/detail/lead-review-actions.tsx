"use client";

import { useState } from "react";
import { BadgeCheck, XCircle } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { ConfirmWithReasonSheet } from "@/components/ui/confirm-with-reason-sheet";
import { useCan } from "@/hooks/api/access";
import { useRejectLead, useVerifyLead } from "@/hooks/api/leads";
import { getErrorMessage } from "@/lib/get-error-message";
import { statusToneClasses } from "@/lib/design-tokens";
import { cn } from "@/lib/utils";

interface LeadReviewActionsProps {
  leadId: number;
  status: string;
  verifiedById: string | null;
}

const SUCCESS_TONE = statusToneClasses("success");

/**
 * Verify or reject a lead under review (`PATCH /leads/:id/verify|reject`).
 *
 * Verify sends no body: the endpoint's optional `notes` overwrites the lead's
 * notes rather than appending, so offering it here would silently discard them.
 */
export function LeadReviewActions({ leadId, status, verifiedById }: LeadReviewActionsProps) {
  const canUpdate = useCan("crm:leads:update");
  const verify = useVerifyLead();
  const reject = useRejectLead();
  const [verifyOpen, setVerifyOpen] = useState(false);
  const [rejectOpen, setRejectOpen] = useState(false);

  const isClosed = status === "CONVERTED" || status === "LOST";

  function handleOpenVerify() {
    setVerifyOpen(true);
  }
  function handleOpenReject() {
    setRejectOpen(true);
  }
  function handleVerify() {
    verify.mutate(
      { leadId },
      {
        onSuccess: () => {
          toast.success("Lead verified");
          setVerifyOpen(false);
        },
        onError: (error) => toast.error(getErrorMessage(error)),
      },
    );
  }
  function handleReject(reason: string) {
    reject.mutate(
      { leadId, reason: reason || undefined },
      {
        onSuccess: () => {
          toast.success("Lead rejected and marked lost");
          setRejectOpen(false);
        },
        onError: (error) => toast.error(getErrorMessage(error)),
      },
    );
  }

  return (
    <>
      {verifiedById ? (
        <Badge variant="outline" className={cn("h-5 px-2 py-0.5 text-xs", SUCCESS_TONE.surface, SUCCESS_TONE.ink, SUCCESS_TONE.rule)}>
          <BadgeCheck className="mr-1 h-3 w-3" />
          Verified
        </Badge>
      ) : null}
      {canUpdate && !isClosed && !verifiedById ? (
        <Button type="button" variant="outline" size="sm" onClick={handleOpenVerify}>
          <BadgeCheck className="mr-1 h-3.5 w-3.5" />
          Verify
        </Button>
      ) : null}
      {canUpdate && !isClosed ? (
        <Button type="button" variant="outline" size="sm" onClick={handleOpenReject}>
          <XCircle className="mr-1 h-3.5 w-3.5" />
          Reject
        </Button>
      ) : null}

      <ConfirmDialog
        open={verifyOpen}
        onOpenChange={setVerifyOpen}
        title="Verify this lead?"
        description="Records you as the person who reviewed this lead and confirmed it is genuine."
        confirmLabel="Verify"
        isPending={verify.isPending}
        keepOpenOnConfirm
        onConfirm={handleVerify}
      />
      <ConfirmWithReasonSheet
        open={rejectOpen}
        onOpenChange={setRejectOpen}
        title="Reject this lead?"
        description="The lead moves to Lost with the reason you give here."
        reasonLabel="Reason"
        reasonPlaceholder="Rejected during review"
        confirmLabel="Reject lead"
        destructive
        isPending={reject.isPending}
        onConfirm={handleReject}
      />
    </>
  );
}
