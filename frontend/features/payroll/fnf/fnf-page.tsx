"use client";

import { PageWrapper } from "@/components/ui/page-wrapper";
import { FnfTable } from "./fnf-table";

export function FnfPageContent() {
  return (
    <PageWrapper
      title="Full & Final Settlement"
      subtitle="Review and approve exit settlements"
    >
      <div className="flex flex-1 min-h-0 flex-col gap-3">
        <FnfTable />
      </div>
    </PageWrapper>
  );
}
