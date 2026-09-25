"use client";

import { memo, useCallback, useState } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { useSession } from "next-auth/react";
import {
  FileText,
  AlertTriangle,
  PenLine,
  UserX,
  Upload,
  type LucideIcon,
} from "lucide-react";
import { EyeIcon, DownloadIcon } from "@animateicons/react/lucide";
import { AnimatedIconButton } from "@/components/ui/animated-icon-button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { EmptyPublicDocsIllustration } from "@/components/illustrations";
import { usePublicDocuments, type PublicDoc } from "@/hooks/api/dashboard";
import { format } from "date-fns";
import {
  downloadProtectedFile,
  viewProtectedFile,
} from "@/hooks/common/use-file-url";
import { TruncatedText } from "@/components/ui/truncated-text";
import { useCan, useModuleEnabled } from "@/hooks/api/access";
import {
  useHrDocumentStats,
  useMissingOnboardingDocsCount,
} from "@/hooks/api/hr/documents";
import { useSignDashboard } from "@/hooks/api/sign/reports";
const UploadDocSheet = dynamic(
  () =>
    import("@/features/hr/document-review/upload-doc-sheet").then((m) => ({
      default: m.UploadDocSheet,
    })),
  { ssr: false },
);
import {
  useMyPendingDocuments,
  type PendingDocumentReason,
} from "./use-my-pending-documents";
import { cn } from "@/lib/utils";
import { getErrorMessage } from "@/lib/get-error-message";
import { CARD_ACTIVATOR_CLASS } from "@/lib/keyboard-activation";

function SummaryChip({
  icon: Icon,
  label,
  value,
  href,
  tone,
}: {
  icon: LucideIcon;
  label: string;
  value: number;
  href: string;
  tone: string;
}) {
  if (!value) return null;
  return (
    <Link
      href={href}
      className="flex items-center gap-1.5 rounded-full border border-border/60 px-2 py-1 text-dense hover:bg-muted/50 transition-colors"
    >
      <Icon className={cn("h-3 w-3", tone)} aria-hidden="true" />
      <span className="font-medium">{value}</span>
      <span className="text-muted-foreground">{label}</span>
    </Link>
  );
}

function AwaitingSignatureChip() {
  const { data } = useSignDashboard();
  return (
    <SummaryChip
      icon={PenLine}
      label="awaiting your signature"
      value={data?.awaitingMe ?? 0}
      href="/sign"
      tone="text-primary"
    />
  );
}

const DOC_TYPE_LABELS: Record<string, string> = {
  CONTRACT: "Contract",
  CERTIFICATE: "Certificate",
  ID_PROOF: "ID Proof",
  PAYSLIP: "Payslip",
  POLICY: "Policy",
  OFFER_LETTER: "Offer Letter",
  RESUME: "Resume",
  OTHER: "Other",
};

interface DocumentItemProps {
  doc: PublicDoc;
}

function DocumentItem({ doc }: DocumentItemProps) {
  const handleView = () => {
    void viewProtectedFile(`/hr/documents/${doc.id}/file`);
  };
  const handleViewClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    void viewProtectedFile(`/hr/documents/${doc.id}/file`);
  };
  const handleDownload = (e: React.MouseEvent) => {
    e.stopPropagation();
    void downloadProtectedFile(
      `/hr/documents/${doc.id}/file`,
      doc.fileName || doc.name,
    );
  };

  return (
    <div className="relative flex items-center gap-3 p-2.5 rounded-lg hover:bg-muted/50 transition-colors group cursor-pointer">
      <div className="p-2 rounded-lg bg-primary/10 shrink-0">
        <FileText className="h-4 w-4 text-primary" />
      </div>
      <div className="flex-1 min-w-0">
        <button
          type="button"
          className={`block w-full min-w-0 ${CARD_ACTIVATOR_CLASS}`}
          onClick={handleView}
        >
          <TruncatedText
            text={doc.name}
            className="text-sm font-medium text-foreground"
          />
        </button>
        <div className="flex items-center gap-2 mt-0.5">
          <Badge variant="outline" className="text-micro px-1.5 py-0">
            {DOC_TYPE_LABELS[doc.type] ?? doc.type}
          </Badge>
          <span className="text-micro text-muted-foreground">
            {doc.createdAt
              ? format(new Date(doc.createdAt), "MMM dd, yyyy")
              : ""}
          </span>
        </div>
      </div>
      <div className="relative z-10 flex items-center gap-1 opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity">
        <AnimatedIconButton
          icon={EyeIcon}
          iconSize={14}
          variant="ghost"
          size="icon"
          className="w-7"
          onClick={handleViewClick}
          aria-label="View"
        />
        <AnimatedIconButton
          icon={DownloadIcon}
          iconSize={14}
          variant="ghost"
          size="icon"
          className="w-7"
          onClick={handleDownload}
          aria-label="Download"
        />
      </div>
    </div>
  );
}

const PENDING_REASON_LABEL: Record<PendingDocumentReason, string> = {
  NOT_SUBMITTED: "Not submitted",
  RE_UPLOAD: "Re-upload requested",
};

const MAX_PENDING_SHOWN = 4;

function MyPendingUploadsSection() {
  const { data: session } = useSession();
  const userId = session?.user?.id;
  const { pending, count, isLoading } = useMyPendingDocuments();
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [isUploadMounted, setIsUploadMounted] = useState(false);

  const handleOpenUpload = useCallback(() => {
    setIsUploadMounted(true);
    setIsUploadOpen(true);
  }, []);

  if (isLoading || count === 0 || !userId) return null;

  return (
    <>
      <div className="mb-3 rounded-lg border border-status-warning-rule bg-status-warning-surface p-2.5">
        <div className="flex items-center justify-between gap-2">
          <p className="text-dense font-medium text-status-warning-ink">
            {count} document{count === 1 ? "" : "s"} to upload
          </p>
          <Button
            size="sm"
            variant="outline"
            className="h-7 px-2 text-dense"
            onClick={handleOpenUpload}
          >
            <Upload className="mr-1 h-3 w-3" aria-hidden="true" />
            Upload
          </Button>
        </div>
        <ul className="mt-1.5 space-y-1">
          {pending.slice(0, MAX_PENDING_SHOWN).map((doc) => (
            <li
              key={`${doc.documentTypeId}-${doc.reason}`}
              className="flex items-center justify-between gap-2 text-micro text-status-warning-ink"
            >
              <TruncatedText
                text={doc.documentTypeName}
                className="min-w-0 flex-1"
              />
              <span className="shrink-0">
                {PENDING_REASON_LABEL[doc.reason]}
              </span>
            </li>
          ))}
          {count > MAX_PENDING_SHOWN && (
            <li className="text-micro text-status-warning-ink">
              +{count - MAX_PENDING_SHOWN} more
            </li>
          )}
        </ul>
      </div>
      {isUploadMounted && (
        <UploadDocSheet
          open={isUploadOpen}
          onOpenChange={setIsUploadOpen}
          userId={userId}
          userName={null}
          selfUpload
        />
      )}
    </>
  );
}

export const PublicDocumentsCard = memo(function PublicDocumentsCard() {
  const canViewDocStats = useCan("hr:documents:view");
  const canViewSignEnvelopes = useCan("sign:envelope:view");
  const signEnabled = useModuleEnabled("SIGN");
  const canViewOnboardingDocsSummary = useCan("hr:onboarding:manage");
  const { data: documents, isLoading, error: documentsError, refetch: refetchDocuments } = usePublicDocuments(6, canViewDocStats);

  const { data: docStats } = useHrDocumentStats({ enabled: canViewDocStats });
  const { missingCount } = useMissingOnboardingDocsCount({
    enabled: canViewOnboardingDocsSummary,
  });
  const { count: pendingUploadCount } = useMyPendingDocuments();

  const showSignatureChip = signEnabled && canViewSignEnvelopes;
  const showSummaryStrip =
    (canViewDocStats && !!docStats?.expiringIn30Days) ||
    showSignatureChip ||
    (canViewOnboardingDocsSummary && !!missingCount);

  return (
    <Card className="bg-card border-border shadow-noir">
      <CardHeader className="flex-shrink-0 flex flex-row items-center justify-between px-4 py-3">
        <CardTitle className="text-foreground flex items-center gap-2 text-sm font-semibold">
          <FileText className="h-4 w-4 text-primary" aria-hidden="true" />
          Public Documents
        </CardTitle>
        {/* asChild: a <button> inside <a> is a nested interactive control. */}
        <Button
          asChild
          variant="ghost"
          size="sm"
          className="hover:bg-primary/10 hover:text-primary"
        >
          <Link href="/hr/documents" aria-label="View all documents">View All</Link>
        </Button>
      </CardHeader>
      <CardContent className="px-4 pt-0 pb-4" aria-live="polite">
        <MyPendingUploadsSection />
        {showSummaryStrip && (
          <div className="flex flex-wrap gap-1.5 mb-3">
            {canViewDocStats && (
              <SummaryChip
                icon={AlertTriangle}
                label="expiring soon"
                value={docStats?.expiringIn30Days ?? 0}
                href="/hr/documents"
                tone="text-status-warning-ink"
              />
            )}
            {showSignatureChip && <AwaitingSignatureChip />}
            {canViewOnboardingDocsSummary && (
              <SummaryChip
                icon={UserX}
                label="missing docs"
                value={missingCount ?? 0}
                href="/hr/document-review"
                tone="text-status-danger-ink"
              />
            )}
          </div>
        )}
        {canViewDocStats &&
          (isLoading ? (
            <div className="space-y-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="flex items-center gap-3">
                  <Skeleton className="h-9 w-9 rounded-lg" />
                  <div className="flex-1 space-y-1.5">
                    <Skeleton className="h-4 w-3/4" />
                    <Skeleton className="h-3 w-1/2" />
                  </div>
                </div>
              ))}
            </div>
          ) : documentsError ? (
            <div className="space-y-2 py-2">
              <p role="alert" className="text-sm text-destructive">{getErrorMessage(documentsError)}</p>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => void refetchDocuments()}
              >
                Retry
              </Button>
            </div>
          ) : !documents?.length ? (
            <EmptyState
              illustration={
                <EmptyPublicDocsIllustration className="h-24 w-24" />
              }
              title="No public documents"
              description="Public documents shared by HR will appear here."
              compact
            />
          ) : (
            <div className="space-y-2">
              <p className="text-micro font-medium uppercase tracking-wide text-muted-foreground px-2.5">
                Recently uploaded
              </p>
              {documents.map((doc) => (
                <DocumentItem key={doc.id} doc={doc} />
              ))}
            </div>
          ))}
      </CardContent>
    </Card>
  );
});
