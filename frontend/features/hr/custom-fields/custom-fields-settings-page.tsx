"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { FILTER_SELECT_TRIGGER, FILTER_TOOLBAR_ROW } from "@/components/ui/content-fill-panel";
import { Skeleton } from "@/components/ui/skeleton";
import { Plus } from "lucide-react";
import { toast } from "sonner";
import { getErrorMessage } from "@/lib/get-error-message";
import { CustomFieldsDataTable } from "@/features/hr/custom-fields/components/custom-fields-data-table";
import { CustomFieldUpsertSheet } from "@/features/hr/custom-fields/components/custom-field-upsert-sheet";
import { useHrCustomFields, useCreateCustomField } from "@/features/hr/custom-fields/hooks/use-hr-custom-fields";
import { useCan } from "@/hooks/api/access";
import { ErrorState, NoPermissionState } from "@/components/shared";
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
  const { data: fields, isLoading, isError, refetch } = useHrCustomFields(entityType, {
    enabled: canManage,
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

  if (!canManage) {
    return (
      <PageWrapper title="Custom Fields" subtitle="Define additional fields for HR entities">
        <NoPermissionState
          permission="hr:custom-fields:manage"
          title="Access Restricted"
          description="You don't have permission to view custom field definitions."
        />
      </PageWrapper>
    );
  }

  return (
    <>
      <PageWrapper
        title="Custom Fields"
        subtitle="Define additional fields for HR entities"
        filters={
          <div className={FILTER_TOOLBAR_ROW}>
            <Select value={entityType} onValueChange={setEntityType}>
              <SelectTrigger className={cn("w-40 shrink-0", FILTER_SELECT_TRIGGER)}><SelectValue /></SelectTrigger>
              <SelectContent>
                {ENTITY_TYPES.map((t) => (
                  <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        }
        actions={
          canManage ? (
            <Button size="sm" className="gap-1.5" onClick={handleCreateClick}>
              <Plus className="h-4 w-4" /> New Field
            </Button>
          ) : undefined
        }
      >
        {isLoading ? (
          <div className="flex flex-1 min-h-0 flex-col gap-2 pt-2">
            {[...Array(4)].map((_, i) => (
              <Skeleton key={i} className="h-12 w-full rounded-lg" />
            ))}
          </div>
        ) : isError ? (
          <ErrorState
            title="Couldn't load custom fields"
            description="Check your connection and try again."
            onRetry={handleRetry}
          />
        ) : (
          <div className="flex flex-1 min-h-0 flex-col pt-2">
            <CustomFieldsDataTable entityType={entityType} fields={fields ?? []} />
          </div>
        )}
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
