"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { FILTER_SELECT_TRIGGER } from "@/components/ui/content-fill-panel";
import { Skeleton } from "@/components/ui/skeleton";
import { Plus } from "lucide-react";
import { toast } from "sonner";
import { getErrorMessage } from "@/lib/get-error-message";
import { CustomFieldsDataTable } from "@/features/hr/custom-fields/components/custom-fields-data-table";
import { CustomFieldUpsertSheet } from "@/features/hr/custom-fields/components/custom-field-upsert-sheet";
import { useHrCustomFields, useCreateCustomField } from "@/features/hr/custom-fields/hooks/use-hr-custom-fields";
import { useCan } from "@/hooks/api/access";
import { PageState } from "@/components/shared/page-state";
import { usePageState } from "@/hooks/api/use-page-state";
import type { CreateCustomFieldPayload, UpdateCustomFieldPayload } from "@/features/hr/forms/lib/types";

const ENTITY_TYPES = [
  { value: "employee", label: "Employee" },
  { value: "department", label: "Department" },
  { value: "job_role", label: "Job Role" },
];

export function CustomFieldsSettingsPage() {
  const [entityType, setEntityType] = useState("employee");
  const [open, setOpen] = useState(false);
  const canManage = useCan("hr:custom-fields:manage");
  const { data: fields, isLoading, isError, error, refetch } = useHrCustomFields(entityType, {
    enabled: canManage,
  });
  // FE-42: page state from usePageState, not the useCan boolean, so a permitted
  // user is not shown "Access Restricted" while their access is still loading.
  const pageState = usePageState({
    permission: "hr:custom-fields:manage",
    isLoading,
    isError,
    error,
  });
  const create = useCreateCustomField(entityType);

  async function handleCreate(payload: CreateCustomFieldPayload | UpdateCustomFieldPayload) {
    if (!("entityType" in payload)) return;
    try {
      await create.mutateAsync(payload);
      toast.success("Custom field created");
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

  function handleRetry() {
    void refetch();
  }

  return (
    <>
      <PageWrapper
        title="Custom Fields"
        subtitle="Define additional fields for HR entities"
        filters={
          <Select value={entityType} onValueChange={setEntityType}>
            <SelectTrigger className={cn("w-40", FILTER_SELECT_TRIGGER)}><SelectValue /></SelectTrigger>
            <SelectContent>
              {ENTITY_TYPES.map((t) => (
                <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        }
        actions={
          canManage ? (
            <Button size="sm" className="gap-1.5" onClick={handleCreateClick}>
              <Plus className="h-4 w-4" /> New Field
            </Button>
          ) : undefined
        }
      >
        <PageState
          resolution={pageState}
          onRetry={handleRetry}
          loading={
            <div className="flex flex-1 min-h-0 flex-col gap-2 pt-2">
              {[...Array(4)].map((_, i) => (
                <Skeleton key={i} className="h-12 w-full rounded-lg" />
              ))}
            </div>
          }
        >
          <div className="flex flex-1 min-h-0 flex-col pt-2">
            <CustomFieldsDataTable entityType={entityType} fields={fields ?? []} />
          </div>
        </PageState>
      </PageWrapper>

      <CustomFieldUpsertSheet
        open={open}
        onOpenChange={handleOpenChange}
        entityType={entityType}
        onSave={handleCreate}
        isPending={create.isPending}
      />
    </>
  );
}
