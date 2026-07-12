"use client";

import { useState } from "react";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";
import { Plus } from "lucide-react";
import { toast } from "sonner";
import { getErrorMessage } from "@/lib/get-error-message";
import { useCan } from "@/hooks/api/access";
import { NoPermissionState } from "@/components/shared/no-permission-state";
import { FormsDataTable } from "@/features/hr/forms/components/forms-data-table";
import { FormBuilder } from "@/features/hr/forms/components/form-builder";
import { useHrForms, useCreateHrForm } from "@/features/hr/forms/hooks/use-hr-forms";
import type { CreateHrFormPayload } from "@/features/hr/forms/lib/types";

export default function HrFormsSettingsPage() {
  const canView = useCan("hr:forms:view");
  const canManage = useCan("hr:forms:manage");
  const [open, setOpen] = useState(false);
  const { data, isLoading, isError, refetch } = useHrForms();
  const create = useCreateHrForm();

  async function handleCreate(payload: CreateHrFormPayload) {
    try {
      await create.mutateAsync(payload);
      toast.success("Form created");
      setOpen(false);
    } catch (err) {
      toast.error(getErrorMessage(err));
    }
  }

  function handleOpenChange(v: boolean) {
    setOpen(v);
  }

  function handleCreateClick() {
    setOpen(true);
  }

  if (!canView) {
    return (
      <PageWrapper title="HR Forms" subtitle="Build forms for requests, intake, and approvals">
        <NoPermissionState
          permission="hr:forms:view"
          title="Access Restricted"
          description="You don't have permission to view HR forms. HR Admin role is required."
        />
      </PageWrapper>
    );
  }

  return (
    <>
      <PageWrapper
        title="HR Forms"
        subtitle="Build forms for requests, intake, and approvals"
        actions={
          canManage ? (
            <Button size="sm" className="h-8 gap-1.5" onClick={handleCreateClick}>
              <Plus className="h-4 w-4" /> New Form
            </Button>
          ) : undefined
        }
      >
        {isLoading ? (
          <div className="space-y-2 pt-2">
            {[...Array(4)].map((_, i) => (
              <Skeleton key={i} className="h-12 w-full rounded-lg" />
            ))}
          </div>
        ) : isError ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <p className="text-sm text-muted-foreground mb-3">Failed to load forms.</p>
            <Button variant="outline" size="sm" onClick={() => void refetch()}>
              Retry
            </Button>
          </div>
        ) : (
          <div className="pt-2">
            <FormsDataTable forms={data?.data ?? []} />
          </div>
        )}
      </PageWrapper>

      <Sheet open={open} onOpenChange={handleOpenChange}>
        <SheetContent className="w-full sm:max-w-3xl overflow-hidden flex flex-col">
          <SheetHeader className="shrink-0 pb-3 border-b">
            <SheetTitle className="text-base">Create Form</SheetTitle>
          </SheetHeader>
          <div className="flex-1 min-h-0 overflow-hidden py-4">
            <FormBuilder onSave={handleCreate} isPending={create.isPending} />
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}
