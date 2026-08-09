"use client";

import { useCallback } from "react";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { EmptyState } from "@/components/ui/empty-state";
import {
  CONTENT_FILL_PANEL,
  PAGE_BODY_EMPTY_CLASS,
  PAGE_BODY_SKELETON_CLASS,
} from "@/components/ui/content-fill-panel";
import { EmptyTransferIllustration } from "@/components/illustrations";
import { OrgIncomingTransferSection } from "@/features/settings/organization/org-incoming-transfer-section";
import { useIncomingOrgTransfers } from "@/hooks/api/ownership";
import { useAccess } from "@/hooks/api/access";
import { Skeleton } from "@/components/ui/skeleton";
import { getErrorMessage } from "@/lib/get-error-message";
import { cn } from "@/lib/utils";

export function IncomingTransferPage() {
  const { isPending: accessPending } = useAccess();
  const { data, isPending, isError, error, refetch } = useIncomingOrgTransfers();
  const isLoading = accessPending || isPending;
  const hasPendingTransfer = (data?.data.length ?? 0) > 0;

  const handleRetry = useCallback(() => {
    void refetch();
  }, [refetch]);

  return (
    <PageWrapper
      title="Incoming Ownership Transfer"
      subtitle="Accept or decline a pending ownership transfer directed to you"
      noInternalScroll
      contentClassName="flex min-h-0 flex-1 flex-col"
    >
      <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
        {isLoading ? (
          <div className={PAGE_BODY_SKELETON_CLASS}>
            <Skeleton className="h-5 w-48" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-5 w-24 rounded-full" />
            <div className="mt-auto flex justify-end gap-2">
              <Skeleton className="h-9 w-24" />
              <Skeleton className="h-9 w-24" />
            </div>
          </div>
        ) : isError ? (
          <EmptyState
            illustrationPreset="alert"
            title="Couldn't load transfers"
            description={getErrorMessage(error)}
            action={{ label: "Retry", onClick: handleRetry }}
            className={cn(CONTENT_FILL_PANEL, PAGE_BODY_EMPTY_CLASS)}
          />
        ) : hasPendingTransfer ? (
          <div className="min-h-0 flex-1 overflow-y-auto">
            <OrgIncomingTransferSection showTitle={false} />
          </div>
        ) : (
          <EmptyState
            illustration={<EmptyTransferIllustration />}
            title="No pending ownership transfer"
            description="If an organization or module owner nominates you, the transfer request will appear here."
            className={cn(CONTENT_FILL_PANEL, PAGE_BODY_EMPTY_CLASS)}
          />
        )}
      </div>
    </PageWrapper>
  );
}
