"use client";

import { memo, useCallback, useState } from "react";
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
import { viewFile, downloadFile } from "@/hooks/common/use-file-url";
import { TruncatedText } from "@/components/ui/truncated-text";
import { useCan } from "@/hooks/api/access";
import { useDashboardAccess } from "@/features/dashboard/use-dashboard-access";
import {
  useHrDocumentStats,
  useMissingOnboardingDocsCount,
} from "@/hooks/api/hr/documents";
import { useSignDashboard } from "@/hooks/api/sign/reports";
import { UploadDocSheet } from "@/features/hr/document-review/upload-doc-sheet";
import {
  useMyPendingDocuments,
  type PendingDocumentReason,
} from "@/features/dashboard/use-my-pending-documents";
import { cn } from "@/lib/utils";

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
      className="flex items-center gap-1.5 rounded-full border border-border/60 px-2 py-1 text-[11px] hover:bg-muted/50 transition-colors"
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
  const handleView = () => viewFile(doc.fileUrl);
  const handleViewClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    viewFile(doc.fileUrl);
  };
  const handleDownload = (e: React.MouseEvent) => {
    e.stopPropagation();
    downloadFile(doc.fileUrl, doc.fileName || doc.name);
  };

  return (
    <div
      className="flex items-center gap-3 p-2.5 rounded-lg hover:bg-muted/50 transition-colors group cursor-pointer"
      onClick={handleView}
    >
      <div className="p-2 rounded-lg bg-primary/10 shrink-0">
        <FileText className="h-4 w-4 text-primary" />
      </div>
      <div className="flex-1 min-w-0">
        <TruncatedText text={doc.name} className="text-sm font-medium text-foreground" />
        <div className="flex items-center gap-2 mt-0.5">
          <Badge variant="outline" className="text-[10px] px-1.5 py-0">
            {DOC_TYPE_LABELS[doc.type] ?? doc.type}
          </Badge>
          <span className="text-[10px] text-muted-foreground">
            {doc.createdAt
              ? format(new Date(doc.createdAt), "MMM dd, yyyy")
              : ""}
          </span>
        </div>
      </div>
      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
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

  const handleOpenUpload = useCallback(() => setIsUploadOpen(true), []);

  if (isLoading || count === 0 || !userId) return null;

  return (
    <>
      <div className="mb-3 rounded-lg border border-amber-200 bg-amber-50 p-2.5 dark:border-amber-800 dark:bg-amber-900/20">
        <div className="flex items-center justify-between gap-2">
          <p className="text-[11px] font-medium text-amber-800 dark:text-amber-300">
            {count} document{count === 1 ? "" : "s"} to upload
          </p>
          <Button
            size="sm"
            variant="outline"
            className="h-7 px-2 text-[11px]"
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
              className="flex items-center justify-between gap-2 text-[10px] text-amber-700 dark:text-amber-400"
            >
              <TruncatedText text={doc.documentTypeName} className="min-w-0 flex-1" />
              <span className="shrink-0">{PENDING_REASON_LABEL[doc.reason]}</span>
            </li>
          ))}
          {count > MAX_PENDING_SHOWN && (
            <li className="text-[10px] text-amber-700 dark:text-amber-400">
              +{count - MAX_PENDING_SHOWN} more
            </li>
          )}
        </ul>
      </div>
      <UploadDocSheet
        open={isUploadOpen}
        onOpenChange={setIsUploadOpen}
        userId={userId}
        userName={null}
        selfUpload
      />
    </>
  );
}

export const PublicDocumentsCard = memo(function PublicDocumentsCard() {
  const canViewDocStats = useCan("hr:documents:view");
  const canViewSignEnvelopes = useCan("sign:envelope:view");
  const { signEnabled, canViewOnboardingDocsSummary } = useDashboardAccess();
  const { data: documents, isLoading } = usePublicDocuments(6, canViewDocStats);

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
        <Link href="/hr/documents">
          <Button
            variant="ghost"
            size="sm"
            className="hover:bg-primary/10 hover:text-primary"
            aria-label="View all documents"
          >
            View All
          </Button>
        </Link>
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
                tone="text-amber-600"
              />
            )}
            {showSignatureChip && <AwaitingSignatureChip />}
            {canViewOnboardingDocsSummary && (
              <SummaryChip
                icon={UserX}
                label="missing docs"
                value={missingCount ?? 0}
                href="/hr/document-review"
                tone="text-red-600"
              />
            )}
          </div>
        )}
        {!canViewDocStats && !showSummaryStrip && pendingUploadCount === 0 && (
          <EmptyState
            illustration={<EmptyPublicDocsIllustration className="h-24 w-24" />}
            title="Nothing pending"
            description="Documents awaiting your signature or upload will appear here."
            compact
          />
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
          ) : !documents?.length ? (
            <EmptyState
              illustration={<EmptyPublicDocsIllustration className="h-24 w-24" />}
              title="No public documents"
              description="Public documents shared by HR will appear here."
              compact
            />
          ) : (
            <div className="space-y-2">
              <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground px-2.5">
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
