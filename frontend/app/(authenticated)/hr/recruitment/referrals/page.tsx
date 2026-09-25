import { PageWrapper } from "@/components/ui/page-wrapper";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { InternalReferralsTab } from "@/features/recruitment/referrals/internal-referrals-tab";
import { ExternalReferralsTab } from "@/features/recruitment/referrals/external-referrals-tab";
import { InviteReferrersSheet } from "@/features/recruitment/referrals/invite-referrers-sheet";

export default async function ReferralsHRPage() {
  return (
    <PageWrapper
      title="Referrals"
      subtitle="Employee and external referrals — track candidates, hiring outcomes, and reward payments."
      actions={<InviteReferrersSheet />}
    >
      <div>
        <Tabs defaultValue="internal">
          <TabsList className="mb-4">
            <TabsTrigger value="internal">Internal (Employees)</TabsTrigger>
            <TabsTrigger value="external">External (Affiliates)</TabsTrigger>
          </TabsList>
          <TabsContent value="internal">
            <InternalReferralsTab />
          </TabsContent>
          <TabsContent value="external">
            <ExternalReferralsTab />
          </TabsContent>
        </Tabs>
      </div>
    </PageWrapper>
  );
}
