"use client";

import { type UseFormReturn } from "react-hook-form";
import { z } from "zod";
import { onboardEmployeeInputSchema } from "@/lib/validation/hr";
import { format } from "date-fns";
import { CalendarIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage,
} from "@/components/ui/form";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { DepartmentCombobox } from "@/components/hr/department-combobox";
import { UserCombobox } from "@/components/ui/user-combobox";
import { Checkbox } from "@/components/ui/checkbox";
import { useCan } from "@/hooks/api/access";
import { USER_INVITE_ROLES } from "@/lib/constants/user-invite-roles";

type FormValues = z.infer<typeof onboardEmployeeInputSchema>;

interface StepEmploymentProps {
  form: UseFormReturn<FormValues>;
  departments: Array<{ id: string; name: string }>;
}

export function StepEmployment({ form, departments }: StepEmploymentProps) {
  const canCreateDept = useCan("hr:employees:manage");
  const topLevelRole = form.watch("topLevelRole") === true;

  function handleTopLevelRoleChange(checked: boolean | "indeterminate") {
    const isTopLevel = checked === true;
    form.setValue("topLevelRole", isTopLevel, { shouldDirty: true });
    if (isTopLevel) form.setValue("reportingManagerUserId", undefined, { shouldDirty: true });
    else form.setValue("topLevelRoleReason", undefined, { shouldDirty: true });
    void form.trigger(["reportingManagerUserId", "topLevelRole", "topLevelRoleReason"]);
  }

  function handleReportingManagerChange(userId: string) {
    form.setValue("reportingManagerUserId", userId || undefined, { shouldDirty: true });
    void form.trigger("reportingManagerUserId");
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <FormField
        control={form.control}
        name="departmentId"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Department <span className="text-destructive">*</span></FormLabel>
            <FormControl>
              <DepartmentCombobox
                value={field.value ?? null}
                departments={departments}
                onValueChange={(val) => {
                  field.onChange(val);
                  form.trigger("departmentId");
                }}
                placeholder="Select department"
                allowCreate={canCreateDept}
              />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
      <FormField
        control={form.control}
        name="designation"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Designation <span className="text-destructive">*</span></FormLabel>
            <FormControl>
              <Input placeholder="e.g., Senior Engineer" {...field} />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
      <FormField
        control={form.control}
        name="reportingManagerUserId"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Reports to {!topLevelRole && <span className="text-destructive">*</span>}</FormLabel>
            <FormControl>
              <UserCombobox
                value={field.value ?? ""}
                onChange={handleReportingManagerChange}
                placeholder="Select reporting manager"
                disabled={topLevelRole}
              />
            </FormControl>
            <FormDescription className="text-xs">
              Approves this employee&apos;s leave, time and expenses unless a policy overrides it.
            </FormDescription>
            <FormMessage />
          </FormItem>
        )}
      />
      <div className="flex flex-col gap-3">
        <FormField
          control={form.control}
          name="topLevelRole"
          render={({ field }) => (
            <FormItem className="flex items-center gap-2 space-y-0 pt-7">
              <FormControl>
                <Checkbox checked={field.value === true} onCheckedChange={handleTopLevelRoleChange} />
              </FormControl>
              <FormLabel className="text-sm font-normal cursor-pointer">Top-level role — no reporting manager</FormLabel>
            </FormItem>
          )}
        />
        {topLevelRole && (
          <FormField
            control={form.control}
            name="topLevelRoleReason"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Reason <span className="text-destructive">*</span></FormLabel>
                <FormControl>
                  <Input placeholder="e.g. Founder and chief executive" {...field} value={field.value ?? ""} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        )}
      </div>
      <FormField
        control={form.control}
        name="role"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Organization Role <span className="text-destructive">*</span></FormLabel>
            <Select value={field.value} onValueChange={field.onChange}>
              <FormControl>
                <SelectTrigger><SelectValue placeholder="Select role" /></SelectTrigger>
              </FormControl>
              <SelectContent>
                {USER_INVITE_ROLES.map((role) => (
                  <SelectItem key={role.value} value={role.value}>{role.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <FormDescription className="text-xs">
              Member covers everyday access. Org Admin can administer the organization.
              Module access is granted afterwards in Settings → Roles.
            </FormDescription>
            <FormMessage />
          </FormItem>
        )}
      />
      <FormField
        control={form.control}
        name="joiningDate"
        render={({ field }) => (
          <FormItem className="flex flex-col">
            <FormLabel>Joining Date <span className="text-destructive">*</span></FormLabel>
            <Popover modal>
              <PopoverTrigger asChild>
                <FormControl>
                  <Button
                    variant="outline"
                    className={cn("w-full pl-3 text-left font-normal", !field.value && "text-muted-foreground")}
                  >
                    {field.value ? format(field.value, "PPP") : "Pick a date"}
                    <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                  </Button>
                </FormControl>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={field.value}
                  onSelect={field.onChange}
                  fromYear={new Date().getFullYear() - 5}
                  toYear={new Date().getFullYear() + 10}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
            <FormMessage />
          </FormItem>
        )}
      />
      <FormField
        control={form.control}
        name="employeeId"
        render={({ field }) => (
          <FormItem className="sm:col-span-2">
            <FormLabel>Employee ID</FormLabel>
            <FormControl>
              <Input placeholder="Auto-generated if blank" {...field} />
            </FormControl>
            <FormDescription className="text-xs">Leave blank to auto-generate</FormDescription>
            <FormMessage />
          </FormItem>
        )}
      />
    </div>
  );
}
