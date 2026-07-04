"use client";

import { PageWrapper } from "@/components/ui/page-wrapper";
import { LoansTable } from "./loans-table";

export function LoansPageContent() {
  return (
    <PageWrapper
      title="Loans & Advances"
      eyebrow="Payroll"
      subtitle="Manage employee salary advances and loan EMI recovery"
      noInternalScroll
    >
      <LoansTable />
    </PageWrapper>
  );
}
