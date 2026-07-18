"use client";

import { PageWrapper } from "@/components/ui/page-wrapper";
import { LoansTable } from "./loans-table";

export function LoansPageContent() {
  return (
    <PageWrapper
      title="Loans & Advances"
      subtitle="Manage employee salary advances and loan EMI recovery"
    >
      <div className="flex flex-1 min-h-0 flex-col gap-3">
        <LoansTable />
      </div>
    </PageWrapper>
  );
}
