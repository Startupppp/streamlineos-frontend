"use client";

import { ArrowRightLeft } from "lucide-react";
import { PageWrapper } from "@/components/ui/page-wrapper";
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
        <Card>
          <CardContent className="py-12 flex flex-col items-center gap-3 text-center">
            <ArrowRightLeft className="h-8 w-8 text-muted-foreground/40" />
            <p className="text-sm text-muted-foreground">No pending ownership transfer</p>
            <p className="text-xs text-muted-foreground/60">
              If an organization owner nominates you, the transfer request will appear here.
            </p>
          </CardContent>
        </Card>
      )}
    </PageWrapper>
  );
}
