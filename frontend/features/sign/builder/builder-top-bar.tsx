"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { ArrowLeft, MoreHorizontal, ShieldCheck, Send, History, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { LoadingButton } from "@/components/ui/loading-button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { getErrorMessage } from "@/lib/get-error-message";
import {
  useDownloadSignEnvelopeFinalPdf,
  useResendSignEnvelope,
  useSendSignEnvelope,
  useSendSignEnvelopeReminder,
  useValidateSignEnvelope,
  useVoidSignEnvelope,
} from "@/hooks/api/sign/envelopes";
import { EnvelopeStatusBadge } from "../components/envelope-status-badge";
import type { SignEnvelope } from "@/types/sign";

export function BuilderTopBar({ envelope, onShowAudit }: { envelope: SignEnvelope; onShowAudit: () => void }) {
  const router = useRouter();
  const [validationErrors, setValidationErrors] = useState<string[] | null>(null);
  const validate = useValidateSignEnvelope(envelope.id);
  const send = useSendSignEnvelope(envelope.id);
  const resend = useResendSignEnvelope(envelope.id);
  const sendReminder = useSendSignEnvelopeReminder(envelope.id);
  const voidEnvelope = useVoidSignEnvelope(envelope.id);
  const downloadFinalPdf = useDownloadSignEnvelopeFinalPdf(envelope.id);

  const isDraft = envelope.status === "draft" || envelope.status === "ready_to_send";
  const isActive = envelope.status === "sent" || envelope.status === "delivered" || envelope.status === "partially_completed";
  const isCompleted = envelope.status === "completed";

  async function handleSend() {
    try {
      const result = await validate.mutateAsync();
      if (!result.valid) {
        setValidationErrors(result.errors);
        return;
      }
      setValidationErrors(null);
      await send.mutateAsync();
      toast.success("Envelope sent");
    } catch (error) {
      toast.error(getErrorMessage(error));
    }
  }

  async function handleVoid() {
    const reason = window.prompt("Reason for voiding this envelope:");
    if (!reason) return;
    try {
      await voidEnvelope.mutateAsync(reason);
      toast.success("Envelope voided");
    } catch (error) {
      toast.error(getErrorMessage(error));
    }
  }

  async function handleResend() {
    try {
      const result = await resend.mutateAsync();
      toast.success(`Resent to ${result.resentCount} recipient(s)`);
    } catch (error) {
      toast.error(getErrorMessage(error));
    }
  }

  async function handleReminder() {
    try {
      const result = await sendReminder.mutateAsync();
      toast.success(`Reminder sent to ${result.remindedCount} recipient(s)`);
    } catch (error) {
      toast.error(getErrorMessage(error));
    }
  }

  async function handleDownload() {
    try {
      const result = await downloadFinalPdf.mutateAsync();
      window.open(result.url, "_blank");
    } catch (error) {
      toast.error(getErrorMessage(error));
    }
  }

  return (
    <div className="shrink-0 border-b border-border px-4 py-3 flex items-center justify-between gap-3">
      <div className="flex items-center gap-3 min-w-0">
        <Button variant="ghost" size="icon" className="size-8" onClick={() => router.push("/sign/envelopes")}>
          <ArrowLeft className="size-4" />
        </Button>
        <div className="min-w-0">
          <p className="font-semibold text-sm truncate">{envelope.title}</p>
          {validationErrors && validationErrors.length > 0 && (
            <p className="text-xs text-destructive truncate">{validationErrors[0]}</p>
          )}
        </div>
        <EnvelopeStatusBadge status={envelope.status} />
      </div>

      <div className="flex items-center gap-2 shrink-0">
        {isDraft && (
          <LoadingButton onClick={handleSend} isPending={validate.isPending || send.isPending} loadingText="Sending…">
            <Send className="size-4" />
            Send
          </LoadingButton>
        )}
        {isActive && (
          <Button variant="outline" size="sm" onClick={handleReminder}>
            Send reminder
          </Button>
        )}
        {isCompleted && (
          <Button variant="outline" size="sm" onClick={handleDownload}>
            <Download className="size-4" />
            Download signed PDF
          </Button>
        )}
        <Button variant="ghost" size="sm" onClick={onShowAudit}>
          <History className="size-4" />
          Audit trail
        </Button>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="size-8">
              <MoreHorizontal className="size-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            {isActive && <DropdownMenuItem onClick={handleResend}>Resend to pending recipients</DropdownMenuItem>}
            {(isDraft || isActive) && (
              <DropdownMenuItem onClick={handleVoid} variant="destructive">
                <ShieldCheck className="size-4" />
                Void envelope
              </DropdownMenuItem>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
}
