"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { useCan } from "@/hooks/api/access";
import { PublicationsTab } from "@/features/payroll/payout/payslips/publications-tab";
import { TemplatesTab } from "@/features/payroll/payout/payslips/templates-tab";

type TabValue = "publications" | "templates";

const VALID_TABS: TabValue[] = ["publications", "templates"];

function resolveTab(raw: string | null): TabValue {
  if (raw === "publications" || raw === "templates") return raw;
  return "publications";
}

export function PayslipsContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const activeTab = resolveTab(searchParams.get("tab"));

  const canManage = useCan("payroll:payslips:manage");

  function handleTabChange(value: string) {
    if (!VALID_TABS.includes(value as TabValue)) return;
    const params = new URLSearchParams(searchParams.toString());
    params.set("tab", value);
    router.push(`?${params.toString()}`);
  }

  return (
    <PageWrapper title="Payslips" subtitle="Manage payslip templates and publish to employees">
      <Tabs value={activeTab} onValueChange={handleTabChange} className="flex flex-1 min-h-0 flex-col">
        <TabsList className="mb-4">
          <TabsTrigger value="publications">Publications</TabsTrigger>
          <TabsTrigger value="templates">Templates</TabsTrigger>
        </TabsList>
        <TabsContent value="publications" className="flex flex-1 min-h-0 flex-col mt-0">
          <PublicationsTab canManage={canManage} />
        </TabsContent>
        <TabsContent value="templates" className="flex flex-1 min-h-0 flex-col mt-0">
          <TemplatesTab canManage={canManage} />
        </TabsContent>
      </Tabs>
    </PageWrapper>
  );
}
