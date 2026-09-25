"use client";

import { useCallback, useState } from "react";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";
import { Plus } from "lucide-react";
import { toast } from "sonner";
import { getErrorMessage } from "@/lib/get-error-message";
import { useCan } from "@/hooks/api/access";
import { PageState } from "@/components/shared/page-state";
import { usePageState } from "@/hooks/api/use-page-state";
import { FormsDataTable } from "./forms-data-table";
import { FormBuilder } from "./form-builder";
import { useHrForms, useCreateHrForm } from "../hooks/use-hr-forms";
import type { CreateHrFormPayload } from "../lib/types";
import { useCursorPager } from "@/components/ui/table-pagination";

export function HrFormsSettingsPage() {
  const canManage = useCan("hr:forms:manage");
  const [open, setOpen] = useState(false);
  const pager = useCursorPager();
  const { data, isLoading, isError, error } = useHrForms({ cursor: pager.cursor, limit: 20 });
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

  const nextCursor = data?.pagination.nextCursor;
  const handleNextPage = useCallback(() => {
    pager.goNext(nextCursor);
  }, [pager, nextCursor]);

  const pageState = usePageState({ permission: "hr:forms:view", isLoading: false, isError, error });

  return (
    <>
      <PageWrapper
        title="HR Forms"
        subtitle="Build forms for requests, intake, and approvals"
        actions={
          canManage ? (
            <Button type="button" size="sm" className="gap-1.5" onClick={handleCreateClick}>
              <Plus className="h-4 w-4" /> New form
            </Button>
          ) : undefined
        }
      >
        <PageState resolution={pageState} loading={null} className="flex-1">
          {isLoading ? (
            <div className="flex flex-1 min-h-0 flex-col gap-2 pt-2">
              {[...Array(4)].map((_, i) => (
                <Skeleton key={i} className="h-12 w-full rounded-lg" />
              ))}
            </div>
          ) : (
            <div className="flex flex-1 min-h-0 flex-col pt-2">
              <FormsDataTable
                forms={data?.data ?? []}
                canManage={canManage}
                pagination={{
                  mode: "cursor",
                  pageSize: 20,
                  hasMore: data?.pagination.hasMore ?? false,
                  hasPrevious: pager.hasPrevious,
                  onNext: handleNextPage,
                  onPrevious: pager.goPrevious,
                }}
              />
            </div>
          )}
        </PageState>
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
