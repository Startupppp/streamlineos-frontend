"use client";

import { PageWrapper } from "@/components/ui/page-wrapper";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { InternalReferralsTab } from "@/features/hr/recruitment/referrals/internal-referrals-tab";
import { ExternalReferralsTab } from "@/features/hr/recruitment/referrals/external-referrals-tab";
import { InviteReferrersSheet } from "@/features/hr/recruitment/referrals/invite-referrers-sheet";

export default function ReferralsHRPage() {
  return (
    <PageWrapper
      title="Referrals"
      subtitle="Employee and external referrals — track candidates, hiring outcomes, and reward payments."
      actions={<InviteReferrersSheet />}
    >
      <Tabs defaultValue="internal">
        <TabsList>
          <TabsTrigger value="internal">Internal (Employees)</TabsTrigger>
          <TabsTrigger value="external">External (Affiliates)</TabsTrigger>
        </TabsList>
        <TabsContent value="internal" className="mt-4">
          <InternalReferralsTab />
        </TabsContent>
        <TabsContent value="external" className="mt-4">
          <ExternalReferralsTab />
        </TabsContent>
      </Tabs>
    </PageWrapper>
  );
}
