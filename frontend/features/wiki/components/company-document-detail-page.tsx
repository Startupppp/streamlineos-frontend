"use client";

import { useCallback } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { ExternalLink } from "lucide-react";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { PageState } from "@/components/shared/page-state";
import { SourceBadge } from "@/components/shared/source-badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { EmptyState } from "@/components/ui/empty-state";
import { LoadingButton } from "@/components/ui/loading-button";
import { SemanticBadge } from "@/components/ui/semantic-badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useCan } from "@/hooks/api/access";
import { usePageState } from "@/hooks/api/use-page-state";
import { useLinkedDocument, useOpenLinkedDocument, type LinkedDocumentDetail } from "@/hooks/api/kb/linked-documents";
import { formatFileSize } from "@/lib/format-utils";
import { getErrorMessage } from "@/lib/get-error-message";
import { KB_COMPANY_DOCUMENTS } from "@/lib/knowledge-routes";
import { REMOVED_DOCUMENT_TITLE, linkedDocumentTitle } from "@/features/wiki/lib/linked-document-title";
import { WITHDRAWAL_CODE_NOT_SHAREABLE, humanWithdrawalReason } from "@/lib/linked-document-withdrawal";
import { kbFormatDate } from "@/features/wiki/lib/kb-date-utils";

interface CompanyDocumentDetailPageProps {
  linkedDocumentId: number;
}

function Fact({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-0.5">
      <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</dt>
      <dd className="text-sm text-foreground">{children}</dd>
    </div>
  );
}

function audienceLabel(audience: NonNullable<LinkedDocumentDetail["audiences"]>[number]): string {
  if (audience.kind === "ALL_EMPLOYEES") return "All employees";
  return audience.label ?? (audience.kind === "DEPARTMENT" ? "A department" : "A location");
}

function PublisherNotes({ detail }: { detail: LinkedDocumentDetail }) {
  const reason = humanWithdrawalReason(detail.unpublishReason);
  return (
    <div className="flex flex-col gap-3">
      {detail.status === "source_removed" ? (
        <Alert variant="destructive">
          <AlertTitle>Source removed</AlertTitle>
          <AlertDescription>The HR document behind this entry was removed. Nobody can open it, and the entry will be cleared automatically.</AlertDescription>
        </Alert>
      ) : null}
      {detail.status === "unpublished" ? (
        <Alert>
          <AlertTitle>Withdrawn</AlertTitle>
          <AlertDescription className="break-words">
            {detail.unpublishReason === WITHDRAWAL_CODE_NOT_SHAREABLE
              ? "The document stopped being shareable, so this entry was taken down."
              : reason !== null
                ? `This entry was withdrawn, and employees can no longer see it. Reason given: ${reason}`
                : "This entry was withdrawn. Employees can no longer see it."}
          </AlertDescription>
        </Alert>
      ) : null}
      {detail.newerVersionAvailable === true ? (
        <Alert>
          <AlertTitle>A newer version is available</AlertTitle>
          <AlertDescription>This entry is pinned to version {detail.pinnedVersion}. Approve or re-pin it in the HR document to show the newer file.</AlertDescription>
        </Alert>
      ) : null}
      <Fact label="Who can see it">
        {detail.audiences === null || detail.audiences.length === 0
          ? "HR only"
          : detail.audiences.map(audienceLabel).join(", ")}
      </Fact>
    </div>
  );
}

/**
 * One company document as a reader sees it. The file is never linked directly: "Open file" asks the server to
 * authorise the entry again and to sign a URL that lasts five minutes, so an entry withdrawn a moment ago cannot
 * be opened from a page that was already on screen.
 */
export default function CompanyDocumentDetailPage({ linkedDocumentId }: CompanyDocumentDetailPageProps) {
  const canPublish = useCan("hr:documents:publish");
  const { data, isLoading, isError, error, refetch } = useLinkedDocument(linkedDocumentId);
  const openFile = useOpenLinkedDocument();
  const pageState = usePageState({ permission: "kb:pages:view", isLoading, isError, error });

  const handleRetry = useCallback(() => void refetch(), [refetch]);
  const handleOpen = useCallback(async () => {
    try {
      const { url } = await openFile.mutateAsync(linkedDocumentId);
      window.open(url, "_blank", "noopener,noreferrer");
    } catch (failure) {
      toast.error(getErrorMessage(failure));
    }
  }, [linkedDocumentId, openFile]);

  const notFound = (
    <EmptyState
      illustrationPreset="default"
      title="Document not found"
      description="It may have been withdrawn, or you may not have access to it."
      action={{ label: "Back to company documents", href: KB_COMPANY_DOCUMENTS }}
    />
  );

  const title = data ? linkedDocumentTitle(data) : REMOVED_DOCUMENT_TITLE;
  return (
    <PageWrapper
      title={title}
      subtitle="Company document"
      actions={
        data?.hasFile && data.status === "active" ? (
          <LoadingButton isPending={openFile.isPending} onClick={handleOpen} type="button">
            <ExternalLink className="mr-1.5 h-4 w-4" aria-hidden="true" />
            Open file
          </LoadingButton>
        ) : undefined
      }
    >
      <PageState
        resolution={pageState}
        loading={<Skeleton className="h-40 w-full" />}
        empty={notFound}
        onRetry={handleRetry}
      >
        {data ? (
          <div className="flex flex-col gap-6">
            <div className="flex flex-wrap items-center gap-2">
              <SourceBadge kind="hr-document" size="sm" />
              {data.status !== "active" ? <SemanticBadge tone="warning" label={data.status === "unpublished" ? "Withdrawn" : "Source removed"} /> : null}
              {data.versionMode === "PINNED" && data.pinnedVersion !== null ? <SemanticBadge tone="neutral" label={`Pinned to v${data.pinnedVersion}`} /> : null}
            </div>
            {data.name === null && data.status === "unpublished" ? (
              <Alert>
                <AlertTitle>The details are hidden</AlertTitle>
                <AlertDescription>
                  This HR document can no longer be shared with the company, so its name, description and file are not shown here, even to you. Once it can be shared again, add it back from the document in HR.
                </AlertDescription>
              </Alert>
            ) : null}
            {data.description ? <p className="max-w-prose text-sm text-foreground">{data.description}</p> : null}
            <dl className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <Fact label="Category">{data.category ?? "—"}</Fact>
              <Fact label="Effective from">{data.effectiveDate ? kbFormatDate(data.effectiveDate) : "—"}</Fact>
              <Fact label="Version">{data.version === null ? "—" : `v${data.version}`}</Fact>
              <Fact label="File">
                {data.hasFile ? `${data.fileName ?? "File"}${data.fileSize ? ` · ${formatFileSize(data.fileSize)}` : ""}` : "No file to open"}
              </Fact>
            </dl>
            {data.tags.length > 0 ? (
              <div className="flex flex-wrap gap-1.5">
                {data.tags.map((tag) => (
                  <SemanticBadge key={tag} tone="neutral" size="xs" label={tag} />
                ))}
              </div>
            ) : null}
            {canPublish ? <PublisherNotes detail={data} /> : null}
            <p className="text-xs text-muted-foreground">
              This is a company document shared from HR, not a wiki page. <Link href={KB_COMPANY_DOCUMENTS} className="underline">See all company documents</Link>.
            </p>
          </div>
        ) : null}
      </PageState>
    </PageWrapper>
  );
}
