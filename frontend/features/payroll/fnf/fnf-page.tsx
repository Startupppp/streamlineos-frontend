"use client";

import { PageWrapper } from "@/components/ui/page-wrapper";
import { FnfTable } from "./fnf-table";

export function FnfPageContent() {
  return (
    <PageWrapper
      title="Full & Final Settlement"
      eyebrow="Payroll"
      subtitle="Review and approve exit settlements"
    >
      <FnfTable />
    </PageWrapper>
  );
}
