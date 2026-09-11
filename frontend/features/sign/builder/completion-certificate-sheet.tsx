"use client";

import { format, parseISO } from "date-fns";
import { toast } from "sonner";
import { FileText, RefreshCw } from "lucide-react";
import { AppSheet } from "@/components/shared/app-sheet";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorState } from "@/components/shared/error-state";
import { Skeleton } from "@/components/ui/skeleton";
import { statusToneClasses } from "@/lib/design-tokens";
import { getErrorMessage } from "@/lib/get-error-message";
import { isApiError } from "@/lib/api-client";
import { useCan } from "@/hooks/api/access";
import { useRegenerateSignCertificate, useSignEnvelopeCertificate } from "@/hooks/api/sign/certificates";
import { cn } from "@/lib/utils";
import { certificateDetailsSchema, type CertificateDetails } from "./certificate-schema";

interface CompletionCertificateSheetProps {
  envelopeId: number;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

function formatStamp(value: string): string {
  const parsed = parseISO(value);
  return Number.isNaN(parsed.getTime()) ? value : format(parsed, "d MMM yyyy, HH:mm");
}

function DetailRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="grid grid-cols-[9rem_minmax(0,1fr)] gap-2 py-1.5">
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="text-sm min-w-0 break-words">{children}</dd>
    </div>
  );
}

function Hash({ value }: { value: string }) {
  return <span className="font-mono text-xs break-all">{value}</span>;
}

function SectionHeading({ children }: { children: React.ReactNode }) {
  return <h3 className="text-sm font-semibold mb-2">{children}</h3>;
}

function CertificateBody({ details }: { details: CertificateDetails }) {
  const neutral = statusToneClasses("neutral");

  return (
    <div className="space-y-6">
      <dl>
        <DetailRow label="Certificate number">
          <span className="font-mono text-xs">{details.certificateNumber}</span>
        </DetailRow>
        <DetailRow label="Organization">{details.tenantName}</DetailRow>
        <DetailRow label="Envelope">{details.envelopeTitle}</DetailRow>
        <DetailRow label="Sender">
          {details.senderName} {details.senderEmail ? `<${details.senderEmail}>` : ""}
        </DetailRow>
        <DetailRow label="Completed at">{formatStamp(details.completedAt)}</DetailRow>
        <DetailRow label="Watermarked PDF">{details.watermarked ? "Yes" : "No"}</DetailRow>
        {details.regeneratedFrom && (
          <DetailRow label="Regenerated from">
            <span className="font-mono text-xs">{details.regeneratedFrom}</span>
          </DetailRow>
        )}
      </dl>

      <section>
        <SectionHeading>File integrity</SectionHeading>
        <dl>
          <DetailRow label="Final PDF SHA-256">
            <Hash value={details.finalPdfHash} />
          </DetailRow>
        </dl>
        <p className={cn("mt-2 rounded-md border p-3 text-xs", neutral.surface, neutral.rule, neutral.ink)}>
          Re-hash a copy of the file and compare it with the SHA-256 above to show the copy is
          byte-identical to the one this envelope completed with. These are content hashes, not a
          digital signature issued by a certifying authority — SignOS does not perform Aadhaar eSign
          or issue CA-backed DSCs.
        </p>
      </section>

      <section>
        <SectionHeading>Documents</SectionHeading>
        {details.documents.length === 0 ? (
          <p className="text-sm text-muted-foreground">No documents recorded.</p>
        ) : (
          <ul className="space-y-2">
            {details.documents.map((doc) => (
              <li key={doc.sha256Hash} className="rounded-md border border-border/70 p-3">
                <p className="text-sm font-medium break-words">{doc.fileName}</p>
                <p className="text-xs text-muted-foreground tabular-nums">
                  {doc.pageCount === null ? "Page count unknown" : `${doc.pageCount} page(s)`}
                </p>
                <Hash value={doc.sha256Hash} />
              </li>
            ))}
          </ul>
        )}
      </section>

      <section>
        <SectionHeading>Recipients</SectionHeading>
        {details.recipients.length === 0 ? (
          <p className="text-sm text-muted-foreground">No recipients recorded.</p>
        ) : (
          <ul className="space-y-2">
            {details.recipients.map((recipient) => (
              <li key={`${recipient.role}-${recipient.name}-${recipient.email ?? ""}`} className="rounded-md border border-border/70 p-3">
                <p className="text-sm font-medium break-words">{recipient.name}</p>
                {recipient.email && <p className="text-xs text-muted-foreground break-all">{recipient.email}</p>}
                <p className="text-xs text-muted-foreground">
                  {recipient.role} · verified by {recipient.authMethod.replace(/_/g, " ")} ·{" "}
                  {recipient.completedAt ? formatStamp(recipient.completedAt) : "not completed"}
                </p>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

export function CompletionCertificateSheet({ envelopeId, open, onOpenChange }: CompletionCertificateSheetProps) {
  const canDownload = useCan("sign:certificate:download");
  const canRegenerate = useCan("sign:admin:manage");
  const certificate = useSignEnvelopeCertificate(open && canDownload ? envelopeId : undefined);
  const regenerate = useRegenerateSignCertificate(envelopeId);

  const parsed = certificate.data ? certificateDetailsSchema.safeParse(certificate.data.certificate.certificateJson) : undefined;
  const notFound = isApiError(certificate.error) && certificate.error.status === 404;

  function handleOpenPdf() {
    if (certificate.data) window.open(certificate.data.url, "_blank", "noopener,noreferrer");
  }

  function handleRegenerate() {
    regenerate.mutate(undefined, {
      onSuccess: () => toast.success("Certificate regenerated"),
      onError: (error) => toast.error(getErrorMessage(error)),
    });
  }

  return (
    <AppSheet
      open={open}
      onOpenChange={onOpenChange}
      title="Certificate of completion"
      description="Who signed, how they were verified, and the SHA-256 hash of every file."
      className="sm:max-w-xl"
      footer={
        certificate.data ? (
          <div className="flex w-full items-center gap-2">
            <Button variant="outline" onClick={handleOpenPdf} className="flex-1">
              <FileText className="size-4" />
              Open certificate PDF
            </Button>
            {canRegenerate && (
              <ConfirmDialog
                trigger={
                  <Button variant="ghost" aria-label="Regenerate certificate">
                    <RefreshCw className="size-4" />
                    Regenerate
                  </Button>
                }
                title="Regenerate this certificate?"
                description="A new certificate is issued with a new number. The existing certificate is never altered or removed, and the regeneration is written to the audit trail."
                confirmLabel="Regenerate"
                isPending={regenerate.isPending}
                onConfirm={handleRegenerate}
              />
            )}
          </div>
        ) : undefined
      }
    >
      {!canDownload ? (
        <EmptyState
          title="You cannot view certificates"
          description="Viewing a completion certificate needs the SignOS certificate download permission."
          compact
        />
      ) : certificate.isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 8 }).map((_, index) => (
            <Skeleton key={index} className="h-8 w-full" />
          ))}
        </div>
      ) : notFound ? (
        <EmptyState
          title="No certificate yet"
          description="A certificate is issued when every signer has completed the envelope."
          compact
        />
      ) : certificate.isError ? (
        <ErrorState title="Failed to load the certificate" onRetry={() => void certificate.refetch()} compact />
      ) : parsed?.success ? (
        <CertificateBody details={parsed.data} />
      ) : certificate.data ? (
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            This certificate was written in an older format, so only its stored record is shown here. The PDF below is
            the authoritative copy.
          </p>
          <dl>
            <DetailRow label="Certificate number">
              <span className="font-mono text-xs">{certificate.data.certificate.certificateNumber}</span>
            </DetailRow>
            <DetailRow label="Issued at">{formatStamp(certificate.data.certificate.generatedAt)}</DetailRow>
            <DetailRow label="Final PDF SHA-256">
              <Hash value={certificate.data.certificate.finalPdfHash} />
            </DetailRow>
            <DetailRow label="Watermarked PDF">{certificate.data.certificate.watermarked ? "Yes" : "No"}</DetailRow>
          </dl>
        </div>
      ) : null}
    </AppSheet>
  );
}
