"use client";

import { useCallback } from "react";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { EmptyState } from "@/components/ui/empty-state";
import { EmptyTransferIllustration } from "@/components/illustrations";
import { OrgIncomingTransferSection } from "@/features/settings/organization/org-incoming-transfer-section";
import { useIncomingOrgTransfers } from "@/hooks/api/ownership";
import { useAccess } from "@/hooks/api/access";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { getErrorMessage } from "@/lib/get-error-message";

export default function IncomingTransferPage() {
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
    >
      {isLoading ? (
        <Card>
          <CardContent className="p-6 space-y-3">
            <Skeleton className="h-5 w-48" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-3/4" />
          </CardContent>
        </Card>
      ) : isError ? (
        <EmptyState
          illustrationPreset="alert"
          title="Couldn't load transfers"
          description={getErrorMessage(error)}
          action={{ label: "Retry", onClick: handleRetry }}
          className="flex-1 border-0 bg-transparent"
        />
      ) : hasPendingTransfer ? (
        <OrgIncomingTransferSection />
      ) : (
        <Card className="flex min-h-0 flex-1 flex-col">
          <CardContent className="flex flex-1 flex-col p-0">
            <EmptyState
              illustration={<EmptyTransferIllustration />}
              title="No pending ownership transfer"
              description="If an organization or module owner nominates you, the transfer request will appear here."
              className="flex-1 border-0 bg-transparent rounded-none"
            />
          </CardContent>
        </Card>
      )}
    </PageWrapper>
  );
}
