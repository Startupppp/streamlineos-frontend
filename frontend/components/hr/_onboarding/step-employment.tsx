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
import Link from "next/link";
import { useCan } from "@/hooks/api/access";
import { useOrgJobRoles } from "@/hooks/api/hr/hr-org";
import { useSeedDefaultRoles } from "@/hooks/api/roles";
import { toast } from "sonner";
import { getErrorMessage } from "@/lib/get-error-message";
import { LoadingButton } from "@/components/ui/loading-button";

type FormValues = z.infer<typeof onboardEmployeeInputSchema>;

const JOB_ROLE_LIST_ID = "hr-onboarding-job-roles";

interface Role { slug: string; name: string }

interface StepEmploymentProps {
  form: UseFormReturn<FormValues>;
  assignableRoles: Role[];
  departments: Array<{ id: string; name: string }>;
}

export function StepEmployment({
  form,
  assignableRoles,
  departments,
}: StepEmploymentProps) {
  const canCreateDept = useCan("hr:employees:manage");
  const canManageRbac = useCan("settings:rbac:manage");
  const { data: jobRoles } = useOrgJobRoles();
  const definedRoles = (jobRoles ?? []).filter((role) => role.isActive);
  const hasJobArchitecture = definedRoles.length > 0;
  const seedRoles = useSeedDefaultRoles();
  const onlyAdminAvailable =
    assignableRoles.length > 0 &&
    assignableRoles.every((r) => r.slug === "ADMINISTRATOR" || r.slug === "ADMIN");

  function handleSeedRoles() {
    seedRoles.mutate(undefined, {
      onSuccess: (result) => {
        toast.success(
          result.created.length > 0
            ? `Added ${result.created.length} standard roles`
            : "Standard roles already exist",
        );
      },
      onError: (err) => toast.error(getErrorMessage(err)),
    });
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
              <Input
                placeholder="e.g., Senior Engineer"
                list={hasJobArchitecture ? JOB_ROLE_LIST_ID : undefined}
                {...field}
              />
            </FormControl>
            {hasJobArchitecture ? (
              <datalist id={JOB_ROLE_LIST_ID}>
                {definedRoles.map((role) => (
                  <option key={role.id} value={role.name} />
                ))}
              </datalist>
            ) : null}
            <FormDescription>
              {hasJobArchitecture ? (
                <>Matching a job role from your architecture keeps reporting consistent.</>
              ) : (
                <>
                  No job roles are defined yet, so this is recorded as a
                  provisional title on the employment record only.{" "}
                  <Link
                    href="/hr/org"
                    className="text-primary underline underline-offset-2"
                  >
                    Set up job architecture
                  </Link>{" "}
                  to make designations selectable.
                </>
              )}
            </FormDescription>
            <FormMessage />
          </FormItem>
        )}
      />
      <FormField
        control={form.control}
        name="role"
        render={({ field }) => (
          <FormItem>
            <FormLabel>System Role <span className="text-destructive">*</span></FormLabel>
            <Select value={field.value} onValueChange={field.onChange}>
              <FormControl>
                <SelectTrigger><SelectValue placeholder="Select role" /></SelectTrigger>
              </FormControl>
              <SelectContent>
                {assignableRoles.length > 0 ? (
                  assignableRoles.map((role) => (
                    <SelectItem key={role.slug} value={role.slug}>{role.name}</SelectItem>
                  ))
                ) : (
                  <>
                    <SelectItem value="ENGINEERING">Engineering</SelectItem>
                    <SelectItem value="HR">HR</SelectItem>
                    <SelectItem value="SALES">Sales</SelectItem>
                    <SelectItem value="CUSTOMER_SUPPORT">Customer Support</SelectItem>
                    <SelectItem value="DESIGN">Design</SelectItem>
                    <SelectItem value="VIDEO_EDITOR">Video Editor</SelectItem>
                    <SelectItem value="DIGITAL_MARKETING">Digital Marketing</SelectItem>
                  </>
                )}
              </SelectContent>
            </Select>
            <FormDescription className="text-xs">Permission level for system access</FormDescription>
            {onlyAdminAvailable && (
              <div className="flex flex-col gap-1.5 rounded-lg border border-status-warning-rule bg-status-warning-surface px-3 py-2">
                <p className="text-xs text-status-warning-ink">
                  Only the Administrator role exists — every hire would get full access.
                  {canManageRbac
                    ? " Add the standard department roles first."
                    : " Ask an admin to add standard roles in Settings → Roles."}
                </p>
                {canManageRbac && (
                  <LoadingButton
                    type="button"
                    size="sm"
                    variant="outline"
                    className="w-fit"
                    isPending={seedRoles.isPending}
                    onClick={handleSeedRoles}
                  >
                    Add standard roles
                  </LoadingButton>
                )}
              </div>
            )}
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
