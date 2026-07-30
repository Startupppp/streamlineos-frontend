"use client";

import { PageWrapper } from "@/components/ui/page-wrapper";
import { EmptyState } from "@/components/ui/empty-state";
import { EmptyTransferIllustration } from "@/components/illustrations";
import { OrgIncomingTransferSection } from "@/features/settings/organization/org-incoming-transfer-section";
import { useIncomingOrgTransfers } from "@/hooks/api/ownership";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export default function IncomingTransferPage() {
  const { data, isLoading } = useIncomingOrgTransfers();
  const hasPendingTransfer = (data?.data.length ?? 0) > 0;

  return (
    <PageWrapper
      title="Incoming Ownership Transfer"
      subtitle="Accept or decline an organization ownership transfer directed to you"
    >
      {isLoading ? (
        <Card>
          <CardContent className="p-6 space-y-3">
            <Skeleton className="h-5 w-48" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-3/4" />
          </CardContent>
        </Card>
      ) : hasPendingTransfer ? (
        <OrgIncomingTransferSection />
      ) : (
        <Card className="flex min-h-0 flex-1 flex-col">
          <CardContent className="flex flex-1 flex-col p-0">
            <EmptyState
              illustration={<EmptyTransferIllustration />}
              title="No pending ownership transfer"
              description="If an organization owner nominates you, the transfer request will appear here."
              className="flex-1 border-0 bg-transparent rounded-none"
            />
          </CardContent>
        </Card>
      )}
    </PageWrapper>
  );
}
