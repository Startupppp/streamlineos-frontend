"use client";

import { memo } from "react";
import Link from "next/link";
import { FileText, AlertTriangle, PenLine, UserX, type LucideIcon } from "lucide-react";
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

export const PublicDocumentsCard = memo(function PublicDocumentsCard() {
  const { data: documents, isLoading } = usePublicDocuments(6);
  const canViewDocStats = useCan("hr:documents:view");
  const canViewSignEnvelopes = useCan("sign:envelope:view");
  const { signEnabled, canViewOnboardingDocsSummary } = useDashboardAccess();

  const { data: docStats } = useHrDocumentStats({ enabled: canViewDocStats });
  const { missingCount } = useMissingOnboardingDocsCount({
    enabled: canViewOnboardingDocsSummary,
  });

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
        {isLoading ? (
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
            {documents.map((doc) => (
              <DocumentItem key={doc.id} doc={doc} />
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
});
