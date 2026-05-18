"use client";

import { useMemo } from "react";
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
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { DatePicker } from "@/components/ui/date-picker";
import { DepartmentCombobox } from "@/components/hr/department-combobox";
import { Briefcase } from "lucide-react";
import { getVaivammEstablishedDate } from "@/lib/constants/company";
import { EMPLOYMENT_FIELD_COPY } from "@/features/hr/employees/employment-field-copy";
import type { EmployeeFormValues } from "@/app/(dashboard)/hr/employees/[employeeId]/edit-employee-form";

interface ProfessionalInfoSectionProps {
  assignableRoles: Array<{ slug: string; name: string }>;
}

export function ProfessionalInfoSection({ assignableRoles }: ProfessionalInfoSectionProps) {
  const { control } = useFormContext<EmployeeFormValues>();
  const minJoiningDate = useMemo(() => getVaivammEstablishedDate().toISOString().split("T")[0], []);

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Briefcase className="h-4 w-4 text-muted-foreground" />
        <h3 className="text-sm font-semibold text-foreground">Professional Information</h3>
      </div>
      <div className="rounded-lg border bg-muted/30 px-4 py-3 text-sm text-muted-foreground">
        <p className="font-medium text-foreground mb-1">How these fields differ</p>
        <ul className="list-disc pl-5 space-y-1 text-xs sm:text-sm">
          <li>
            <span className="font-medium text-foreground">Department</span> — organizational team (not app permissions).
          </li>
          <li>
            <span className="font-medium text-foreground">Job title</span> — official title on record.
          </li>
          <li>
            <span className="font-medium text-foreground">System role</span> — CRM access and permissions.
          </li>
        </ul>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <FormField
          control={control}
          name="departmentId"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{EMPLOYMENT_FIELD_COPY.department.label}</FormLabel>
              <FormControl>
                <DepartmentCombobox
                  value={field.value ?? null}
                  onValueChange={(val) => field.onChange(val ?? undefined)}
                  placeholder={EMPLOYMENT_FIELD_COPY.department.placeholder}
                />
              </FormControl>
              <FormDescription className="text-xs">
                {EMPLOYMENT_FIELD_COPY.department.description}
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={control}
          name="designation"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{EMPLOYMENT_FIELD_COPY.designation.label}</FormLabel>
              <FormControl>
                <Input
                  placeholder={EMPLOYMENT_FIELD_COPY.designation.placeholder}
                  value={field.value ?? ""}
                  onChange={field.onChange}
                  onBlur={field.onBlur}
                  name={field.name}
                  ref={field.ref}
                />
              </FormControl>
              <FormDescription className="text-xs">
                {EMPLOYMENT_FIELD_COPY.designation.description}
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={control}
          name="role"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{EMPLOYMENT_FIELD_COPY.systemRole.label}</FormLabel>
              <Select value={field.value} onValueChange={field.onChange}>
                <FormControl>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder={EMPLOYMENT_FIELD_COPY.systemRole.placeholder} />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {assignableRoles.map((role) => (
                    <SelectItem key={role.slug} value={role.slug}>{role.name}</SelectItem>
                  ))}
                  {assignableRoles.length === 0 && (
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
              <FormDescription className="text-xs">
                {EMPLOYMENT_FIELD_COPY.systemRole.description}
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
                  value={field.value ? new Date(field.value).toISOString().split("T")[0] : ""}
                  onChange={(v) => field.onChange(v ? new Date(v) : undefined)}
                  fromDate={new Date(minJoiningDate)}
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
                  inputMode="numeric"
                  min={1}
                  max={100_000_000}
                  step={1}
                  placeholder="25000"
                  value={field.value ?? ""}
                  onChange={(e) => {
                    const raw = e.target.value;
                    if (raw === "") {
                      field.onChange(undefined);
                      return;
                    }
                    const digitsOnly = raw.replace(/\D/g, "");
                    if (!digitsOnly) return;
                    field.onChange(Number(digitsOnly));
                  }}
                  onBlur={field.onBlur}
                  name={field.name}
                  ref={field.ref}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={control}
          name="experienceYears"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Experience (Years)</FormLabel>
              <FormControl>
                <Input
                  type="number"
                  inputMode="decimal"
                  step="0.1"
                  min={0}
                  max={50}
                  placeholder="e.g. 2.5"
                  value={field.value != null ? field.value : ""}
                  onChange={(e) => {
                    const v = e.target.value;
                    if (v === "") {
                      field.onChange(undefined);
                      return;
                    }
                    if (/^\d*\.?\d*$/.test(v)) {
                      field.onChange(parseFloat(v));
                    }
                  }}
                  onBlur={field.onBlur}
                  name={field.name}
                  ref={field.ref}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={control}
          name="skills"
          render={({ field }) => (
            <FormItem className="md:col-span-2">
              <FormLabel>Skills</FormLabel>
              <FormControl>
                <Input
                  placeholder="React, TypeScript, Node.js"
                  maxLength={500}
                  value={field.value ?? ""}
                  onChange={field.onChange}
                  onBlur={field.onBlur}
                  name={field.name}
                  ref={field.ref}
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
