"use client";

import { useCallback, useEffect, useMemo } from "react";
import { useForm, FormProvider } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { LoadingButton } from "@/components/ui/loading-button";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import { getErrorMessage } from "@/lib/get-error-message";
import { useRouter } from "next/navigation";
import { useUpdateProfile } from "@/hooks/api/hr";
import { Save } from "lucide-react";
import { useRoles } from "@/hooks/api/roles";
import { PersonalInfoSection } from "@/features/hr/employees/detail/personal-info-section";
import { ProfessionalInfoSection } from "@/features/hr/employees/detail/professional-info-section";
import { UnsavedChangesDialog } from "@/components/ui/unsaved-changes-dialog";
import { useUnsavedChangesGuard } from "@/hooks/common/use-unsaved-changes-guard";
import {
  employeeFormSchema,
  type EmployeeFormValues,
} from "@/features/hr/employees/detail/employee-form-schema";
import type { EmployeeData } from "@/features/hr/employees/detail/employee-data";

export type { EmployeeData } from "@/features/hr/employees/detail/employee-data";

interface EditEmployeeFormProps {
  employee: EmployeeData;
  onDirtyChange?: (dirty: boolean) => void;
  /** Parent can register leave interception (Back / tab change). */
  registerLeaveGuard?: (api: {
    isDirty: boolean;
    requestLeave: (action: () => void) => void;
  } | null) => void;
}

export function EditEmployeeForm({
  employee,
  onDirtyChange,
  registerLeaveGuard,
}: EditEmployeeFormProps) {
  const router = useRouter();
  const updateProfileMutation = useUpdateProfile();
  const { data: orgRoles } = useRoles();
  const assignableRoles = useMemo(
    () => (orgRoles || []).filter((r) => r.slug !== "FINAL"),
    [orgRoles],
  );

  const defaultValues = useMemo<EmployeeFormValues>(
    () => ({
      firstName: employee.firstName || "",
      lastName: employee.lastName || "",
      role: employee.role || "ENGINEERING",
      designation: employee.designation || "",
      departmentId: employee.orgDepartmentId || undefined,
      phone: employee.phone || "",
      gender: employee.gender ?? undefined,
      joiningDate: employee.joiningDate
        ? new Date(employee.joiningDate)
        : undefined,
    }),
    [employee],
  );

  const form = useForm<EmployeeFormValues>({
    resolver: zodResolver(employeeFormSchema),
    defaultValues,
  });

  const isDirty = form.formState.isDirty;

  useEffect(() => {
    onDirtyChange?.(isDirty);
  }, [isDirty, onDirtyChange]);

  const persist = useCallback(
    async (values: EmployeeFormValues) => {
      await updateProfileMutation.mutateAsync({
        userId: employee.id,
        firstName: values.firstName,
        lastName: values.lastName,
        role: values.role as string,
        designation: values.designation,
        departmentId: values.departmentId,
        phone: values.phone,
        gender: values.gender,
        joiningDate: values.joiningDate?.toISOString().slice(0, 10),
      });
      form.reset(values);
      router.refresh();
    },
    [employee.id, form, router, updateProfileMutation],
  );

  const { requestLeave, dialogProps } = useUnsavedChangesGuard({
    isDirty,
    onDiscard: () => form.reset(defaultValues),
    onSave: async () => {
      const valid = await form.trigger();
      if (!valid) throw new Error("Validation failed");
      await persist(form.getValues());
      toast.success("Employee updated successfully!");
    },
  });

  useEffect(() => {
    registerLeaveGuard?.({ isDirty, requestLeave });
    return () => registerLeaveGuard?.(null);
  }, [isDirty, registerLeaveGuard, requestLeave]);

  const onSubmit = useCallback(
    async (values: EmployeeFormValues) => {
      try {
        await persist(values);
        toast.success("Employee updated successfully!");
      } catch (err) {
        toast.error(getErrorMessage(err));
      }
    },
    [persist],
  );

  const handleCancel = useCallback(() => {
    requestLeave(() => router.back());
  }, [requestLeave, router]);

  return (
    <FormProvider {...form}>
      <form
        onSubmit={form.handleSubmit(onSubmit)}
        className="flex flex-col"
      >
        <div className="overflow-hidden rounded-2xl border border-border/70 bg-card/90 shadow-[0_1px_2px_rgba(15,23,42,0.04),0_12px_32px_-14px_rgba(15,23,42,0.12)] backdrop-blur-sm">
          <div className="p-5">
            <PersonalInfoSection />
          </div>
          <Separator />
          <div className="p-5">
            <ProfessionalInfoSection assignableRoles={assignableRoles} />
          </div>
          <div className="flex shrink-0 justify-end gap-2 border-t border-border bg-muted/30 px-5 py-3.5">
            <Button
              variant="outline"
              size="sm"
              type="button"
              className="gap-1.5"
              onClick={handleCancel}
              disabled={updateProfileMutation.isPending}
            >
              Cancel
            </Button>
            <LoadingButton
              size="sm"
              type="submit"
              className="gap-1.5"
              isPending={updateProfileMutation.isPending}
              loadingText="Saving..."
            >
              <Save className="h-3.5 w-3.5" />
              Save Changes
            </LoadingButton>
          </div>
        </div>
      </form>
      <UnsavedChangesDialog {...dialogProps} />
    </FormProvider>
  );
}
