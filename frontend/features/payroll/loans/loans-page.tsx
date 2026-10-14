"use client";

import { useState } from "react";
import { useSearchParams } from "next/navigation";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { useScope } from "@/hooks/api/access";
import { LoansTable } from "./loans-table";
import { CreateLoanDialog } from "./create-loan-dialog";

export function LoansPageContent() {
  const searchParams = useSearchParams();
  // POST /hr/loans honours the chosen employee only for an org-wide approver; anyone else would
  // silently get a loan in their own name, so the admin dialog is offered to exactly that scope.
  const canCreateForOthers = useScope("hr:expenses:approve") === "all";
  const [createOpen, setCreateOpen] = useState(() => searchParams.get("create") === "1");

  function handleOpenCreate() {
    setCreateOpen(true);
  }

  return (
    <PageWrapper
      title="Loans & Advances"
      subtitle="Manage employee salary advances and loan EMI recovery"
      actions={
        canCreateForOthers ? (
          <Button size="sm" className="gap-1.5" onClick={handleOpenCreate}>
            <Plus className="h-3.5 w-3.5" />
            New loan
          </Button>
        ) : undefined
      }
    >
      <div className="flex flex-1 min-h-0 flex-col gap-3">
        <LoansTable />
      </div>
      {canCreateForOthers && <CreateLoanDialog open={createOpen} onOpenChange={setCreateOpen} />}
    </PageWrapper>
  );
}
