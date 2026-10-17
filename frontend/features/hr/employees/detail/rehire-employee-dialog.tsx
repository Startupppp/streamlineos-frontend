"use client";

import { useCallback } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { EntityFormDialog } from "@/components/shared/entity-form-dialog";
import { DatePicker } from "@/components/ui/date-picker";
import {
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { useRehireEmployee } from "@/hooks/api/hr/termination";
import { getErrorMessage } from "@/lib/get-error-message";
import { getTodayString } from "@/lib/date-utils";
import { rehireEmployeeFormSchema, type RehireEmployeeFormValues } from "./rehire-employee-schema";

interface RehireEmployeeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  employeeUserId: string;
  employeeName: string;
  onRehired: () => void;
}

export function RehireEmployeeDialog({
  open,
  onOpenChange,
  employeeUserId,
  employeeName,
  onRehired,
}: RehireEmployeeDialogProps) {
  const rehire = useRehireEmployee();

  const handleSubmit = useCallback(
    (values: RehireEmployeeFormValues) => {
      rehire.mutate(
        { employeeUserId, joiningDate: values.joiningDate },
        {
          onSuccess: () => {
            toast.success(`${employeeName} was rehired and can sign in again`);
            onOpenChange(false);
            onRehired();
          },
          onError: (error) => toast.error(getErrorMessage(error)),
        },
      );
    },
    [rehire, employeeUserId, employeeName, onOpenChange, onRehired],
  );

  return (
    <EntityFormDialog<RehireEmployeeFormValues>
      open={open}
      onOpenChange={onOpenChange}
      title={`Rehire ${employeeName}`}
      description="Restores their membership (it takes a seat on your plan) and reopens their employment record from the date you pick."
      resolver={zodResolver(rehireEmployeeFormSchema)}
      defaultValues={{ joiningDate: getTodayString() }}
      onSubmit={handleSubmit}
      isSubmitting={rehire.isPending}
      submitLabel="Rehire"
      resetOnOpen
    >
      {(form) => (
        <FormField
          control={form.control}
          name="joiningDate"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Rejoining date</FormLabel>
              <FormControl>
                <DatePicker value={field.value} onChange={field.onChange} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      )}
    </EntityFormDialog>
  );
}
