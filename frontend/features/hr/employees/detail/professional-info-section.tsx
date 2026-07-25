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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { DatePicker } from "@/components/ui/date-picker";
import { DepartmentCombobox } from "@/components/hr/department-combobox";
import { Briefcase } from "lucide-react";
import type { EmployeeFormValues } from "@/features/hr/employees/detail/edit-employee-form";

interface ProfessionalInfoSectionProps {
  assignableRoles: Array<{ slug: string; name: string }>;
}

export function ProfessionalInfoSection({
  assignableRoles,
}: ProfessionalInfoSectionProps) {
  const { control } = useFormContext<EmployeeFormValues>();

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Briefcase className="h-4 w-4 text-muted-foreground" />
        <h3 className="text-sm font-semibold text-foreground">
          Professional Information
        </h3>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
          name="role"
          render={({ field }) => (
            <FormItem>
              <FormLabel>System Role</FormLabel>
              <Select onValueChange={field.onChange} defaultValue={field.value}>
                <FormControl>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select role" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent className="min-w-[var(--radix-select-trigger-width)]">
                  {assignableRoles.map((role) => (
                    <SelectItem key={role.slug} value={role.slug}>
                      {role.name}
                    </SelectItem>
                  ))}
                  {assignableRoles.length === 0 && (
                    <>
                      <SelectItem value="ENGINEERING">Engineering</SelectItem>
                      <SelectItem value="HR">HR</SelectItem>
                      <SelectItem value="SALES">Sales</SelectItem>
                      <SelectItem value="CUSTOMER_SUPPORT">
                        Customer Support
                      </SelectItem>
                      <SelectItem value="DESIGN">Design</SelectItem>
                      <SelectItem value="VIDEO_EDITOR">Video Editor</SelectItem>
                      <SelectItem value="DIGITAL_MARKETING">
                        Digital Marketing
                      </SelectItem>
                    </>
                  )}
                </SelectContent>
              </Select>
              <FormDescription>
                Platform access level (e.g. HR Manager, Employee)
              </FormDescription>
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
                  onValueChange={(val) => field.onChange(val ?? undefined)}
                  placeholder="Select Department"
                />
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
                  onChange={(v) => field.onChange(v ? new Date(v) : undefined)}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={control}
          name="monthlySalary"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Monthly Salary (₹)</FormLabel>
              <FormControl>
                <Input
                  type="number"
                  placeholder="0"
                  value={field.value ?? ""}
                  onChange={(e) =>
                    field.onChange(
                      e.target.value ? parseFloat(e.target.value) : undefined,
                    )
                  }
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
