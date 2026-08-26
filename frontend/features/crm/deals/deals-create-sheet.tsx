"use client";

import { useCallback } from "react";
import { toast } from "sonner";
import {
  Sheet,
  SheetBody,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { getErrorMessage } from "@/lib/get-error-message";
import { useCreateDeal } from "@/hooks/api/crm";
import { DealForm, toCreateInput, type DealSubmission } from "./deal-form";

interface DealsCreateSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  employees: Array<{ id: string; name: string | null }>;
  onSuccess: () => void;
}

export function DealsCreateSheet({
  open,
  onOpenChange,
  employees,
  onSuccess,
}: DealsCreateSheetProps) {
  const createDeal = useCreateDeal();

  const handleCancel = useCallback(() => onOpenChange(false), [onOpenChange]);

  const handleSubmit = useCallback(
    (submission: DealSubmission) => {
      createDeal.mutate(toCreateInput(submission), {
        onSuccess: () => {
          toast.success("Deal created");
          onSuccess();
        },
        onError: (error) => toast.error(getErrorMessage(error)),
      });
    },
    [createDeal, onSuccess],
  );

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="flex w-full flex-col gap-0 overflow-hidden p-0 sm:max-w-lg">
        <SheetHeader className="shrink-0 border-b border-border px-6 py-4 text-left">
          <SheetTitle>New deal</SheetTitle>
          <SheetDescription>
            A deal tracks one opportunity through your pipeline — its value, its stage
            and when you expect it to close.
          </SheetDescription>
        </SheetHeader>

        <SheetBody className="px-6 py-4">
          <DealForm
            mode="create"
            employees={employees}
            isSubmitting={createDeal.isPending}
            submitLabel="Create deal"
            onSubmit={handleSubmit}
            onCancel={handleCancel}
          />
        </SheetBody>
      </SheetContent>
    </Sheet>
  );
}
