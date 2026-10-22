"use client";

import { useEffect, useCallback, useState } from "react";
import { ChevronLeft, Download, FileText } from "lucide-react";
import Link from "next/link";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorState } from "@/components/shared/error-state";
import KbContentRenderer from "@/components/shared/kb-content-renderer";
import { PortalHeader } from "@/features/portal/components/portal-header";
import {
  usePortalDocDetail,
  usePortalDocDownloadUrl,
  usePortalDocRecordAccess,
} from "@/hooks/api/portal/use-portal-docs";
import type { PortalDocDetail } from "@/hooks/api/portal/use-portal-docs";

function DetailSkeleton() {
  return (
    <div className="space-y-4">
      <Skeleton className="h-7 w-2/3" />
      <Skeleton className="h-4 w-32" />
      <Skeleton className="h-40 w-full rounded-xl" />
    </div>
  );
}

function FileCard({ doc, pageId }: { doc: PortalDocDetail; pageId: number }) {
  const downloadMutation = usePortalDocDownloadUrl(pageId);
  const [isPending, setIsPending] = useState(false);

  const handleDownload = useCallback(async () => {
    setIsPending(true);
    try {
      const result = await downloadMutation.mutateAsync();
      window.open(result.url, "_blank", "noopener,noreferrer");
    } finally {
      setIsPending(false);
    }
  }, [downloadMutation]);

  return (
    <div className="rounded-xl border border-border bg-card p-5 space-y-4">
      <div className="flex items-start gap-3">
        <FileText className="h-8 w-8 text-muted-foreground shrink-0 mt-0.5" />
        <div className="min-w-0 flex-1">
          <p className="font-medium text-sm text-foreground truncate">{doc.title}</p>
          <p className="text-xs text-muted-foreground mt-0.5">File</p>
        </div>
      </div>
      {doc.allowDownload && (
        <button
          type="button"
          onClick={handleDownload}
          disabled={isPending}
          aria-label="Download file"
          className="inline-flex items-center gap-2 rounded-lg border border-border bg-card px-4 py-2.5 text-sm font-medium hover:bg-muted disabled:opacity-50 transition-colors"
        >
          <Download className="h-4 w-4 shrink-0" aria-hidden="true" />
          {isPending ? "Preparing…" : "Download"}
        </button>
      )}
    </div>
  );
}

function DocBody({ doc, pageId }: { doc: PortalDocDetail; pageId: number }) {
  if (doc.kind === "file") {
    return <FileCard doc={doc} pageId={pageId} />;
  }
  return (
    <KbContentRenderer
      content={doc.content}
    />
  );
}

interface PortalDocDetailPageProps {
  pageId: number;
}

export function PortalDocDetailPage({ pageId }: PortalDocDetailPageProps) {
  const { data, isLoading, isError, refetch } = usePortalDocDetail(pageId);
  const { mutate: recordAccess } = usePortalDocRecordAccess(pageId);
  const loadedPageId = data?.id;

  useEffect(() => {
    if (loadedPageId !== undefined) recordAccess();
  }, [loadedPageId, recordAccess]);

  const handleRetry = useCallback(() => {
    void refetch();
  }, [refetch]);

  return (
    <div className="flex flex-col min-h-dvh bg-background">
      <PortalHeader showProjectsLink />
      <main className="flex-1 px-4 sm:px-6 py-8 max-w-3xl mx-auto w-full">
        <Link
          href="/shared-docs"
          className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors mb-6"
        >
          <ChevronLeft className="h-3.5 w-3.5" />
          All documents
        </Link>

        {isLoading ? (
          <DetailSkeleton />
        ) : isError ? (
          <ErrorState
            title="Could not load document"
            description="There was a problem fetching this document. Please try again."
            onRetry={handleRetry}
            className="min-h-[280px]"
          />
        ) : !data ? (
          <EmptyState
            illustrationPreset="default"
            title="Document not found"
            description="This document may have been removed or your access has expired."
            className="min-h-[280px]"
          />
        ) : (
          <div className="space-y-6">
            <div className="flex items-center gap-3">
              {data.icon && (
                <span className="text-2xl leading-none" aria-hidden="true">
                  {data.icon}
                </span>
              )}
              <h1 className="text-xl font-semibold text-foreground leading-tight">
                {data.title || "Untitled"}
              </h1>
            </div>
            <DocBody doc={data} pageId={pageId} />
          </div>
        )}
      </main>
    </div>
  );
}
