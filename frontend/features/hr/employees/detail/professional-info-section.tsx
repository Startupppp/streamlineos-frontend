"use client";

import { useFormContext } from "react-hook-form";
import {
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { DatePicker } from "@/components/ui/date-picker";
import { DepartmentCombobox } from "@/components/hr/department-combobox";
import { Briefcase } from "lucide-react";
import type { EmployeeFormValues } from "@/features/hr/employees/detail/employee-form-schema";

function joiningDateChange(
  onChange: (value: Date | undefined) => void,
): (value: string) => void {
  return function handleJoiningDateChange(value) {
    onChange(value ? new Date(value) : undefined);
  };
}

export function ProfessionalInfoSection() {
  const { control } = useFormContext<EmployeeFormValues>();

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Briefcase className="h-4 w-4 text-muted-foreground" />
        <h3 className="text-sm font-semibold text-foreground">
          Professional Information
        </h3>
      </div>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <FormField
          control={control}
          name="designation"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Designation</FormLabel>
              <FormControl>
                <Input {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={control}
          name="departmentId"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Department</FormLabel>
              <FormControl>
                <DepartmentCombobox
                  value={field.value ?? null}
                  onValueChange={(value) => field.onChange(value ?? undefined)}
                  placeholder="Select Department"
                />
        {/* HRM-15: managers change only through the Reporting line card, which carries the
            effective date, reason and repeated-change guard this form cannot. */}
        <p className="text-xs text-muted-foreground md:col-span-2">
          Reporting managers are changed from the Reporting line card on the Overview tab.
        </p>
              </FormControl>
              <FormDescription>
                Organizational unit (e.g. Engineering, Sales)
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={control}
          name="joiningDate"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Joining Date</FormLabel>
              <FormControl>
                <DatePicker
                  value={
                    field.value
                      ? new Date(field.value).toISOString().split("T")[0]
                      : ""
                  }
                  onChange={joiningDateChange(field.onChange)}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      </div>
    </div>
  );
}
