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
import { useHrKbLinkConfig } from "@/hooks/api/kb/hr-link-config";
import { useLinkedDocument, useOpenLinkedDocument, type LinkedDocumentDetail } from "@/hooks/api/kb/linked-documents";
import { isApiError } from "@/lib/api-envelope";
import { formatFileSize } from "@/lib/format-utils";
import { getErrorMessage } from "@/lib/get-error-message";
import { KB_COMPANY_DOCUMENTS } from "@/lib/knowledge-routes";
import { linkedDocumentTitle } from "@/features/wiki/lib/linked-document-title";
import { WITHDRAWAL_CODE_NOT_SHAREABLE, humanWithdrawalReason } from "@/lib/linked-document-withdrawal";
import { kbFormatDate } from "@/features/wiki/lib/kb-date-utils";

interface CompanyDocumentDetailPageProps {
  linkedDocumentId: number;
}

/** The heading while there is no entry to name: still loading, failed, refused, or not there. */
const COMPANY_DOCUMENT_TITLE = "Company document";

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
  const { data: linkFlags, isLoading: configLoading, isError: configFailed, error: configError, refetch: refetchConfig } = useHrKbLinkConfig();
  const linkOn = linkFlags?.link === true;
  const linkOff = linkFlags?.link === false;
  const { data, isLoading, isError, error, refetch } = useLinkedDocument(linkedDocumentId, { enabled: linkOn });
  const { mutateAsync: requestOpen, reset: forgetOpen, isPending: opening } = useOpenLinkedDocument();

  // A disabled query reports isLoading false, so the switch's own loading is added by hand. A 404 is "not found", not a
  // failure: resolvePageState reads isError before isEmpty, so it has to be taken out of isError to reach the empty state.
  const documentFailed = linkOn && isError;
  const documentMissing = documentFailed && isApiError(error) && error.status === 404;
  const notAvailable = linkOff || documentMissing;
  const entry = notAvailable ? undefined : data;
  const pageState = usePageState({
    permission: "kb:pages:view",
    isLoading: isLoading || configLoading,
    isError: configFailed || (documentFailed && !documentMissing),
    error: configFailed ? configError : error,
    isEmpty: notAvailable,
  });

  const handleRetry = useCallback(() => {
    if (configFailed) void refetchConfig();
    else void refetch();
  }, [configFailed, refetchConfig, refetch]);
  const handleOpen = useCallback(async () => {
    try {
      const { url } = await requestOpen(linkedDocumentId);
      window.open(url, "_blank", "noopener,noreferrer");
      // The signed URL is single use: do not keep it in the mutation's result once it has been handed to the browser.
      forgetOpen();
    } catch (failure) {
      toast.error(getErrorMessage(failure));
    }
  }, [linkedDocumentId, requestOpen, forgetOpen]);

  const notFound = (
    <EmptyState
      illustrationPreset="default"
      title="Document not found"
      description="It may have been withdrawn, or you may not have access to it."
      action={{ label: "Back to company documents", href: KB_COMPANY_DOCUMENTS }}
    />
  );

  const title = entry ? linkedDocumentTitle(entry) : COMPANY_DOCUMENT_TITLE;
  return (
    <PageWrapper
      title={title}
      subtitle="Company document"
      actions={
        entry?.hasFile && entry.status === "active" ? (
          <LoadingButton isPending={opening} onClick={handleOpen} type="button">
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
        {entry ? (
          <div className="flex flex-col gap-6">
            <div className="flex flex-wrap items-center gap-2">
              <SourceBadge kind="hr-document" size="sm" />
              {entry.status !== "active" ? <SemanticBadge tone="warning" label={entry.status === "unpublished" ? "Withdrawn" : "Source removed"} /> : null}
              {entry.versionMode === "PINNED" && entry.pinnedVersion !== null ? <SemanticBadge tone="neutral" label={`Pinned to v${entry.pinnedVersion}`} /> : null}
            </div>
            {entry.name === null && entry.status === "unpublished" ? (
              <Alert>
                <AlertTitle>The details are hidden</AlertTitle>
                <AlertDescription>
                  This HR document can no longer be shared with the company, so its name, description and file are not shown here, even to you. Once it can be shared again, add it back from the document in HR.
                </AlertDescription>
              </Alert>
            ) : null}
            {entry.description ? <p className="max-w-prose text-sm text-foreground">{entry.description}</p> : null}
            <dl className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <Fact label="Category">{entry.category ?? "—"}</Fact>
              <Fact label="Effective from">{entry.effectiveDate ? kbFormatDate(entry.effectiveDate) : "—"}</Fact>
              <Fact label="Version">{entry.version === null ? "—" : `v${entry.version}`}</Fact>
              <Fact label="File">
                {entry.hasFile ? `${entry.fileName ?? "File"}${entry.fileSize ? ` · ${formatFileSize(entry.fileSize)}` : ""}` : "No file to open"}
              </Fact>
            </dl>
            {entry.tags.length > 0 ? (
              <div className="flex flex-wrap gap-1.5">
                {entry.tags.map((tag) => (
                  <SemanticBadge key={tag} tone="neutral" size="xs" label={tag} />
                ))}
              </div>
            ) : null}
            {canPublish ? <PublisherNotes detail={entry} /> : null}
            <p className="text-xs text-muted-foreground">
              This is a company document shared from HR, not a wiki page. <Link href={KB_COMPANY_DOCUMENTS} className="underline">See all company documents</Link>.
            </p>
          </div>
        ) : null}
      </PageState>
    </PageWrapper>
  );
}
