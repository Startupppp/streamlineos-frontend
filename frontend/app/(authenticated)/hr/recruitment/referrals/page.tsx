import { motion } from "framer-motion";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { InternalReferralsTab } from "@/features/hr/recruitment/referrals/internal-referrals-tab";
import { ExternalReferralsTab } from "@/features/hr/recruitment/referrals/external-referrals-tab";
import { InviteReferrersSheet } from "@/features/hr/recruitment/referrals/invite-referrers-sheet";

export default async function ReferralsHRPage() {
  return (
    <PageWrapper
      title="Referrals"
      subtitle="Employee and external referrals — track candidates, hiring outcomes, and reward payments."
      actions={<InviteReferrersSheet />}
    >
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.22, ease: "easeOut" }}
      >
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
      </motion.div>
    </PageWrapper>
  );
}
