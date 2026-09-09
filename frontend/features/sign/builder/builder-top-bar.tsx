"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { ArrowLeft, ShieldCheck, Send, History, Download, ScrollText, PenLine } from "lucide-react";
import { EllipsisIcon } from "@animateicons/react/lucide";
import { AnimatedIconButton } from "@/components/ui/animated-icon-button";
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
import { useSaveEnvelopeAsTemplate } from "@/hooks/api/sign/templates";
import { useCan } from "@/hooks/api/access";
import { TruncatedText } from "@/components/ui/truncated-text";
import { EnvelopeStatusBadge } from "../components/envelope-status-badge";
import { EnvelopeAiMenu } from "./envelope-ai-menu";
import { CompletionCertificateSheet } from "./completion-certificate-sheet";
import { CorrectEnvelopeSheet } from "./correct-envelope-sheet";
import { EnvelopeExpiryControl } from "./envelope-expiry-control";
import type { SignEnvelope, SignRecipient } from "@/types/sign";

interface BuilderTopBarProps {
  envelope: SignEnvelope;
  recipients: SignRecipient[];
  onShowAudit: () => void;
}

export function BuilderTopBar({ envelope, recipients, onShowAudit }: BuilderTopBarProps) {
  const router = useRouter();
  const [validationErrors, setValidationErrors] = useState<string[] | null>(null);
  const [certificateOpen, setCertificateOpen] = useState(false);
  const [correctOpen, setCorrectOpen] = useState(false);
  const canViewCertificate = useCan("sign:certificate:download");
  const canCorrect = useCan("sign:envelope:correct");
  const validate = useValidateSignEnvelope(envelope.id);
  const send = useSendSignEnvelope(envelope.id);
  const resend = useResendSignEnvelope(envelope.id);
  const sendReminder = useSendSignEnvelopeReminder(envelope.id);
  const voidEnvelope = useVoidSignEnvelope(envelope.id);
  const downloadFinalPdf = useDownloadSignEnvelopeFinalPdf(envelope.id);
  const saveAsTemplate = useSaveEnvelopeAsTemplate(envelope.id);

  const isDraft = envelope.status === "draft" || envelope.status === "ready_to_send";
  const isActive = envelope.status === "sent" || envelope.status === "delivered" || envelope.status === "partially_completed";
  const isCompleted = envelope.status === "completed";
  const isTerminal = isCompleted || envelope.status === "voided";
  const correctionReason = isTerminal
    ? "Completed and voided envelopes cannot be corrected"
    : isDraft
      ? "Draft envelopes are edited directly, not corrected"
      : null;

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

  async function handleSaveAsTemplate() {
    const name = window.prompt("Template name:", `${envelope.title} template`);
    if (!name) return;
    try {
      await saveAsTemplate.mutateAsync(name);
      toast.success("Saved as template");
    } catch (error) {
      toast.error(getErrorMessage(error));
    }
  }

  return (
    <div className="shrink-0 border-b border-border px-4 py-3 flex items-center justify-between gap-3">
      <div className="flex items-center gap-3 min-w-0">
        <Button variant="ghost" size="icon" className="size-8" aria-label="Back to envelopes" onClick={() => router.push("/sign/envelopes")}>
          <ArrowLeft className="size-4" />
        </Button>
        <div className="min-w-0">
          <TruncatedText text={envelope.title} className="font-semibold text-sm" />
          {validationErrors && validationErrors.length > 0 && (
            <TruncatedText text={validationErrors[0] ?? ""} className="text-xs text-destructive" />
          )}
        </div>
        <EnvelopeStatusBadge status={envelope.status} />
        <EnvelopeExpiryControl envelope={envelope} />
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
        <EnvelopeAiMenu envelopeId={envelope.id} />
        <Button variant="ghost" size="sm" onClick={onShowAudit}>
          <History className="size-4" />
          Audit trail
        </Button>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <AnimatedIconButton icon={EllipsisIcon} iconSize={16} variant="ghost" size="icon" className="size-8" aria-label="Document actions" />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={handleSaveAsTemplate}>Save as template</DropdownMenuItem>
            {canViewCertificate && (
              <DropdownMenuItem onClick={() => setCertificateOpen(true)} disabled={!isCompleted}>
                <ScrollText className="size-4" />
                <span className="flex flex-col items-start">
                  <span>Certificate of completion</span>
                  {!isCompleted && (
                    <span className="text-xs text-muted-foreground">Issued once every signer has completed</span>
                  )}
                </span>
              </DropdownMenuItem>
            )}
            {canCorrect && (
              <DropdownMenuItem onClick={() => setCorrectOpen(true)} disabled={correctionReason !== null}>
                <PenLine className="size-4" />
                <span className="flex flex-col items-start">
                  <span>Correct recipients</span>
                  {correctionReason && <span className="text-xs text-muted-foreground">{correctionReason}</span>}
                </span>
              </DropdownMenuItem>
            )}
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

      <CompletionCertificateSheet envelopeId={envelope.id} open={certificateOpen} onOpenChange={setCertificateOpen} />
      <CorrectEnvelopeSheet
        envelopeId={envelope.id}
        recipients={recipients}
        open={correctOpen}
        onOpenChange={setCorrectOpen}
      />
    </div>
  );
}
