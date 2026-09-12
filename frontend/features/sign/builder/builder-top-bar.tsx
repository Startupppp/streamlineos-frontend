"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { ArrowLeft, ShieldCheck, Send, History, Download, FileCheck, ScrollText, PenLine } from "lucide-react";
import { EllipsisIcon } from "@animateicons/react/lucide";
import { AnimatedIconButton } from "@/components/ui/animated-icon-button";
import { Button } from "@/components/ui/button";
import { LoadingButton } from "@/components/ui/loading-button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { getErrorMessage } from "@/lib/get-error-message";
import {
  useDownloadSignEnvelopeFinalPdf,
  useDownloadSignEnvelopeCertificate,
  useResendSignEnvelope,
  useSendSignEnvelope,
  useSendSignEnvelopeReminder,
  useValidateSignEnvelope,
  useVoidSignEnvelope,
} from "@/hooks/api/sign/envelopes";
import { useCan } from "@/hooks/api/access";
import { TruncatedText } from "@/components/ui/truncated-text";
import { EnvelopeStatusBadge } from "../components/envelope-status-badge";
import { EnvelopeAiMenu } from "./envelope-ai-menu";
import { CompletionCertificateSheet } from "./completion-certificate-sheet";
import { CorrectEnvelopeSheet } from "./correct-envelope-sheet";
import { EnvelopeExpiryControl } from "./envelope-expiry-control";
import { SaveAsTemplateDialog } from "./save-as-template-dialog";
import { ConfirmWithReasonSheet } from "@/components/ui/confirm-with-reason-sheet";
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
  const [voidOpen, setVoidOpen] = useState(false);
  const [templateOpen, setTemplateOpen] = useState(false);
  const canViewCertificate = useCan("sign:certificate:download");
  const canCorrect = useCan("sign:envelope:correct");
  const canSend = useCan("sign:envelope:send");
  const canVoid = useCan("sign:envelope:void");
  const canManageTemplates = useCan("sign:template:manage");
  const validate = useValidateSignEnvelope(envelope.id);
  const send = useSendSignEnvelope(envelope.id);
  const resend = useResendSignEnvelope(envelope.id);
  const sendReminder = useSendSignEnvelopeReminder(envelope.id);
  const voidEnvelope = useVoidSignEnvelope(envelope.id);
  const downloadFinalPdf = useDownloadSignEnvelopeFinalPdf(envelope.id);
  const downloadCertificate = useDownloadSignEnvelopeCertificate(envelope.id);

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

  function handleVoidRequest() {
    setVoidOpen(true);
  }

  function handleVoidConfirm(reason: string) {
    voidEnvelope.mutate(reason, {
      onSuccess: () => {
        toast.success("Envelope voided");
        setVoidOpen(false);
      },
      onError: (error) => toast.error(getErrorMessage(error)),
    });
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
      window.open(result.url, "_blank", "noopener,noreferrer");
    } catch (error) {
      toast.error(getErrorMessage(error));
    }
  }

  /*
    Separate from the signed PDF on purpose. They answer different questions --
    one is WHAT was agreed, the other is HOW it was signed and by whom -- and a
    dispute asks for the second.
  */
  async function handleDownloadCertificate() {
    try {
      const result = await downloadCertificate.mutateAsync();
      window.open(result.url, "_blank", "noopener,noreferrer");
    } catch (error) {
      toast.error(getErrorMessage(error));
    }
  }

  function handleSaveAsTemplate() {
    setTemplateOpen(true);
  }

  function handleBack() {
    router.push("/sign/envelopes");
  }

  function handleShowCertificate() {
    setCertificateOpen(true);
  }

  function handleShowCorrect() {
    setCorrectOpen(true);
  }

  return (
    <div className="shrink-0 border-b border-border px-4 py-3 flex items-center justify-between gap-3">
      <div className="flex items-center gap-3 min-w-0">
        <Button variant="ghost" size="icon" className="size-8" aria-label="Back to envelopes" onClick={handleBack}>
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
        {isDraft && canSend && (
          <LoadingButton onClick={handleSend} isPending={validate.isPending || send.isPending} loadingText="Sending…">
            <Send className="size-4" />
            Send
          </LoadingButton>
        )}
        {isActive && canSend && (
          <LoadingButton variant="outline" size="sm" onClick={handleReminder} isPending={sendReminder.isPending} loadingText="Sending…">
            Send reminder
          </LoadingButton>
        )}
        {isCompleted && canViewCertificate && (
          <LoadingButton variant="outline" size="sm" onClick={handleDownload} isPending={downloadFinalPdf.isPending} loadingText="Preparing…">
            <Download className="size-4" />
            Download signed PDF
          </LoadingButton>
        )}
        {isCompleted && canViewCertificate && (
          <LoadingButton variant="outline" size="sm" onClick={handleDownloadCertificate} isPending={downloadCertificate.isPending} loadingText="Preparing…">
            <FileCheck className="size-4" />
            Certificate
          </LoadingButton>
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
            {canManageTemplates && <DropdownMenuItem onClick={handleSaveAsTemplate}>Save as template</DropdownMenuItem>}
            {canViewCertificate && (
              <DropdownMenuItem onClick={handleShowCertificate} disabled={!isCompleted}>
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
              <DropdownMenuItem onClick={handleShowCorrect} disabled={correctionReason !== null}>
                <PenLine className="size-4" />
                <span className="flex flex-col items-start">
                  <span>Correct recipients</span>
                  {correctionReason && <span className="text-xs text-muted-foreground">{correctionReason}</span>}
                </span>
              </DropdownMenuItem>
            )}
            {isActive && canSend && <DropdownMenuItem onClick={handleResend}>Resend to pending recipients</DropdownMenuItem>}
            {(isDraft || isActive) && canVoid && (
              <DropdownMenuItem onClick={handleVoidRequest} variant="destructive">
                <ShieldCheck className="size-4" />
                Void envelope
              </DropdownMenuItem>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <CompletionCertificateSheet envelopeId={envelope.id} open={certificateOpen} onOpenChange={setCertificateOpen} />
      <ConfirmWithReasonSheet
        open={voidOpen}
        onOpenChange={setVoidOpen}
        title="Void this envelope?"
        description="Every recipient who has not completed is told the envelope was voided, and their signing links stop working. This cannot be undone."
        reasonLabel="Reason"
        reasonPlaceholder="Why this envelope is being voided"
        reasonRequired
        reasonErrorMessage="A reason is required to void an envelope."
        confirmLabel="Void envelope"
        destructive
        isPending={voidEnvelope.isPending}
        onConfirm={handleVoidConfirm}
      />
      <SaveAsTemplateDialog envelopeId={envelope.id} envelopeTitle={envelope.title} open={templateOpen} onOpenChange={setTemplateOpen} />
      <CorrectEnvelopeSheet
        envelopeId={envelope.id}
        recipients={recipients}
        open={correctOpen}
        onOpenChange={setCorrectOpen}
      />
    </div>
  );
}
