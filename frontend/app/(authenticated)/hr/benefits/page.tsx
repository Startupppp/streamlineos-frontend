"use client";

import { FileText, LayoutGrid, Shield } from "lucide-react";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { BenefitsClaimsTab } from "@/features/hr/benefits/benefits-claims-tab";
import { BenefitsMyTab } from "@/features/hr/benefits/benefits-my-tab";
import { BenefitsPlansAdminTab } from "@/features/hr/benefits/benefits-plans-admin-tab";
import { useCan } from "@/hooks/api/access";

export default function BenefitsPage() {
  const canManage = useCan("hr:benefits:manage");

  return (
    <PageWrapper
      title="Benefits"
      subtitle="Manage employee benefit plans, enrollments, and insurance claims"
    >
      <Tabs defaultValue="my-benefits" className="flex min-h-0 flex-1 flex-col gap-4">
        <TabsList>
          <TabsTrigger value="my-benefits" className="gap-1.5">
            <Shield className="h-3.5 w-3.5" />
            My benefits
          </TabsTrigger>
          <TabsTrigger value="claims" className="gap-1.5">
            <FileText className="h-3.5 w-3.5" />
            Claims
          </TabsTrigger>
          {canManage ? (
            <TabsTrigger value="plans" className="gap-1.5">
              <LayoutGrid className="h-3.5 w-3.5" />
              Manage plans
            </TabsTrigger>
          ) : null}
        </TabsList>

        <TabsContent value="my-benefits" className="mt-0 flex min-h-0 flex-1 flex-col">
          <BenefitsMyTab />
        </TabsContent>
        <TabsContent value="claims" className="mt-0 flex min-h-0 flex-1 flex-col">
          <BenefitsClaimsTab canManage={canManage} />
        </TabsContent>
        {canManage ? (
          <TabsContent value="plans" className="mt-0 flex min-h-0 flex-1 flex-col">
            <BenefitsPlansAdminTab canManage={canManage} />
          </TabsContent>
        ) : null}
      </Tabs>
    </PageWrapper>
  );
}
