"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { getErrorMessage } from "@/lib/get-error-message";
import { useCan } from "@/hooks/api/access";
import { useAllocateDebitNote, useApDocuments } from "@/hooks/api/accounting/ap";
import type { ApAllocationInput, ApDocumentDetail } from "@/types/accounting-ap";
import { AllocateOpenBillsSheet } from "../shared/allocate-open-bills-sheet";

interface ApplyVendorCreditActionProps {
  document: ApDocumentDetail;
}

export function ApplyVendorCreditAction({ document }: ApplyVendorCreditActionProps) {
  const canApply = useCan("accounting:vendor-credits:manage");
  const [isOpen, setIsOpen] = useState(false);
  const allocateDebitNote = useAllocateDebitNote();

  const openBillsQuery = useApDocuments(
    { documentType: "BILL", partyId: document.partyId, openOnly: true, page: 1, pageSize: 50 },
    { enabled: canApply && isOpen },
  );

  function handleSubmit(allocations: ApAllocationInput[]): void {
    if (allocations.length === 0) {
      toast.error("Enter how much of this credit to put against a bill");
      return;
    }
    allocateDebitNote.mutate(
      { debitNoteId: document.id, allocations },
      {
        onSuccess: () => {
          toast.success("Vendor credit applied");
          setIsOpen(false);
        },
        onError: (error) => toast.error(getErrorMessage(error)),
      },
    );
  }

  if (!canApply) return null;

  return (
    <>
      <Button
        variant="outline"
        size="sm"
        className="flex-1 sm:flex-none"
        onClick={() => setIsOpen(true)}
      >
        Put this against a bill
      </Button>
      {isOpen ? (
        <AllocateOpenBillsSheet
          open={isOpen}
          onOpenChange={setIsOpen}
          title="Use this vendor credit"
          description={`Reduce what you owe ${document.partyName} by spreading this credit across their unpaid bills.`}
          bills={openBillsQuery.data?.items ?? []}
          currency={document.currency}
          availableMinor={document.openMinor}
          submitLabel="Apply credit"
          isSubmitting={allocateDebitNote.isPending}
          onSubmit={handleSubmit}
        />
      ) : null}
    </>
  );
}
