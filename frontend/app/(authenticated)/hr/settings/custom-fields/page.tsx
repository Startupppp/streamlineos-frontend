"use client";

import { useState } from "react";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Plus } from "lucide-react";
import { toast } from "sonner";
import { getErrorMessage } from "@/lib/get-error-message";
import { CustomFieldsDataTable } from "@/features/hr/custom-fields/components/custom-fields-data-table";
import { CustomFieldUpsertDialog } from "@/features/hr/custom-fields/components/custom-field-upsert-dialog";
import { useHrCustomFields, useCreateCustomField } from "@/features/hr/custom-fields/hooks/use-hr-custom-fields";
import type { CreateCustomFieldPayload } from "@/features/hr/forms/lib/types";

const ENTITY_TYPES = [
  { value: "employee", label: "Employee" },
  { value: "department", label: "Department" },
  { value: "job_role", label: "Job Role" },
];

export default function HrCustomFieldsPage() {
  const [entityType, setEntityType] = useState("employee");
  const [open, setOpen] = useState(false);
  const { data: fields, isLoading } = useHrCustomFields(entityType);
  const create = useCreateCustomField(entityType);

  async function handleCreate(payload: CreateCustomFieldPayload) {
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

  return (
    <>
      <PageWrapper
        title="Custom Fields"
        subtitle="Define additional fields for HR entities"
        filters={
          <Select value={entityType} onValueChange={setEntityType}>
            <SelectTrigger className="h-8 text-sm w-40"><SelectValue /></SelectTrigger>
            <SelectContent>
              {ENTITY_TYPES.map((t) => (
                <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        }
        actions={
          <Button size="sm" className="h-8 gap-1.5" onClick={handleCreateClick}>
            <Plus className="h-4 w-4" /> New Field
          </Button>
        }
      >
        {isLoading ? (
          <div className="space-y-2 pt-2">
            {[...Array(4)].map((_, i) => (
              <Skeleton key={i} className="h-12 w-full rounded-lg" />
            ))}
          </div>
        ) : (
          <div className="pt-2">
            <CustomFieldsDataTable entityType={entityType} fields={fields ?? []} />
          </div>
        )}
      </PageWrapper>

      <CustomFieldUpsertDialog
        open={open}
        onOpenChange={handleOpenChange}
        entityType={entityType}
        onSave={handleCreate}
        isPending={create.isPending}
      />
    </>
  );
}
