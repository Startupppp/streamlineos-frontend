"use client";

import { PageWrapper } from "@/components/ui/page-wrapper";
import { useCan } from "@/hooks/api/access";
import { DimensionsTable } from "@/features/accounting/core/dimensions-table";

export default function DimensionsPage() {
  const canManage = useCan("accounting:dimensions:manage");

  return (
    <PageWrapper
      title="Dimensions"
      subtitle="Cost centres, projects, and departments for GL entry tagging and reporting."
    >
      <div className="flex flex-1 min-h-0 flex-col">
        <DimensionsTable canManage={canManage} />
      </div>
    </PageWrapper>
  );
}
