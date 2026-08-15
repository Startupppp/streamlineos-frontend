"use client";

import { useState } from "react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { LoadingButton } from "@/components/ui/loading-button";
import { useSetTemplateApproval } from "@/hooks/api/notifications";
import { getErrorMessage } from "@/lib/get-error-message";
import type { NotificationTemplate, TemplateApprovalStatus } from "@/types/notifications";

const STATUS_LABEL: Record<TemplateApprovalStatus, string> = {
  NOT_REQUIRED: "Not required",
  PENDING: "Awaiting approval",
  APPROVED: "Approved",
  REJECTED: "Rejected",
};

/**
 * COMP-004 / COMP-005. WhatsApp and SMS refuse to send a template the provider has not
 * approved — so without somewhere to record that approval, those channels are permanently
 * unusable no matter how the template is written.
 *
 * The approval itself happens outside this product (Meta for WhatsApp, an Indian DLT
 * operator for SMS). This records the outcome and the identifier the provider issued;
 * it does not request or grant anything.
 */
export function TemplateApprovalDialog({
  template,
  open,
  onOpenChange,
}: {
  template: NotificationTemplate;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [status, setStatus] = useState<TemplateApprovalStatus>(template.approvalStatus);
  const [providerName, setProviderName] = useState(template.providerTemplateName ?? "");
  const [reason, setReason] = useState(template.approvalRejectionReason ?? "");
  const setApproval = useSetTemplateApproval();

  // The backend rejects APPROVED without a provider name, because an approved template
  // with nothing to send under fails per message instead of once, here.
  const providerNameMissing = status === "APPROVED" && providerName.trim().length === 0;

  function handleStatusChange(next: string) {
    setStatus(next as TemplateApprovalStatus);
  }

  function handleProviderNameChange(event: React.ChangeEvent<HTMLInputElement>) {
    setProviderName(event.target.value);
  }

  function handleReasonChange(event: React.ChangeEvent<HTMLTextAreaElement>) {
    setReason(event.target.value);
  }

  async function handleSave() {
    try {
      await setApproval.mutateAsync({
        id: template.id,
        approvalStatus: status,
        providerTemplateName: providerName.trim() || null,
        approvalRejectionReason: reason.trim() || null,
      });
      toast.success("Approval status saved");
      onOpenChange(false);
    } catch (error) {
      toast.error(getErrorMessage(error));
    }
  }

  const isRegisteredChannel = template.channel === "WHATSAPP" || template.channel === "SMS";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Provider approval</DialogTitle>
          <DialogDescription>
            {isRegisteredChannel
              ? `${template.channel} will not send this template until the provider has approved it.`
              : "This channel does not require provider approval; recorded here for completeness."}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="approval-status">Status</Label>
            <Select value={status} onValueChange={handleStatusChange}>
              <SelectTrigger id="approval-status">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="min-w-[var(--radix-select-trigger-width)]">
                {(Object.keys(STATUS_LABEL) as TemplateApprovalStatus[]).map((value) => (
                  <SelectItem key={value} value={value}>
                    {STATUS_LABEL[value]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="provider-template-name">
              {template.channel === "SMS" ? "DLT template ID" : "Provider template name"}
            </Label>
            <Input
              id="provider-template-name"
              value={providerName}
              onChange={handleProviderNameChange}
              placeholder={template.channel === "SMS" ? "1107xxxxxxxxxxxxxxx" : "payslip_ready_v3"}
            />
            {providerNameMissing && (
              <p className="text-xs text-destructive">
                An approved template must carry the identifier it sends under.
              </p>
            )}
          </div>

          {status === "REJECTED" && (
            <div className="space-y-1.5">
              <Label htmlFor="rejection-reason">Rejection reason</Label>
              <Textarea
                id="rejection-reason"
                value={reason}
                onChange={handleReasonChange}
                rows={3}
                placeholder="What the provider said, so it can be corrected and resubmitted"
              />
            </div>
          )}
        </div>

        <DialogFooter>
          <LoadingButton
            isPending={setApproval.isPending}
            disabled={providerNameMissing}
            onClick={handleSave}
          >
            Save
          </LoadingButton>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
