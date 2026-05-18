"use client";

import { useMemo } from "react";
import { type UseFormReturn } from "react-hook-form";
import { z } from "zod";
import { onboardEmployeeInputSchema } from "@/lib/validations/hr";
import { getVaivammEstablishedDate } from "@/lib/constants/company";
import { format } from "date-fns";
import { CalendarIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { EMPLOYMENT_FIELD_COPY } from "@/features/hr/employees/employment-field-copy";

type FormValues = z.infer<typeof onboardEmployeeInputSchema>;

interface Department { id: number; name: string }
interface Role { slug: string; name: string }

interface StepEmploymentProps {
  form: UseFormReturn<FormValues>;
  departments: Department[] | undefined;
  allDepartmentOptions: (Department & { isCommon?: boolean })[];
  assignableRoles: Role[];
}

export function StepEmployment({ form, departments, allDepartmentOptions, assignableRoles }: StepEmploymentProps) {
  const companyEstablishedDate = useMemo(() => getVaivammEstablishedDate(), []);

  return (
    <div className="space-y-4">
      <EmploymentFieldsIntro />
      <div className="grid gap-4 sm:grid-cols-2">
      <FormField
        control={form.control}
        name="departmentId"
        render={({ field }) => (
          <FormItem>
            <FormLabel>
              {EMPLOYMENT_FIELD_COPY.department.label}{" "}
              <span className="text-destructive">*</span>
            </FormLabel>
            <Select
              value={field.value !== undefined && field.value !== null ? field.value.toString() : ""}
              onValueChange={(val) => {
                const num = parseInt(val, 10);
                field.onChange(isNaN(num) ? undefined : num);
                form.trigger("departmentId");
              }}
            >
              <FormControl>
                <SelectTrigger>
                  <SelectValue placeholder={EMPLOYMENT_FIELD_COPY.department.placeholder} />
                </SelectTrigger>
              </FormControl>
              <SelectContent>
                {departments?.map((dept) => (
                  <SelectItem key={dept.id} value={dept.id.toString()}>{dept.name}</SelectItem>
                ))}
                {allDepartmentOptions.filter((d) => d.id < 0).map((dept) => (
                  <SelectItem key={dept.id} value={dept.id.toString()}>{dept.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <FormDescription className="text-xs">
              {EMPLOYMENT_FIELD_COPY.department.description}
            </FormDescription>
            <FormMessage />
          </FormItem>
        )}
      />
      <FormField
        control={form.control}
        name="designation"
        render={({ field }) => (
          <FormItem>
            <FormLabel>
              {EMPLOYMENT_FIELD_COPY.designation.label}{" "}
              <span className="text-destructive">*</span>
            </FormLabel>
            <FormControl>
              <Input placeholder={EMPLOYMENT_FIELD_COPY.designation.placeholder} {...field} />
            </FormControl>
            <FormDescription className="text-xs">
              {EMPLOYMENT_FIELD_COPY.designation.description}
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
            <FormLabel>
              {EMPLOYMENT_FIELD_COPY.systemRole.label}{" "}
              <span className="text-destructive">*</span>
            </FormLabel>
            <Select value={field.value} onValueChange={field.onChange}>
              <FormControl>
                <SelectTrigger>
                  <SelectValue placeholder={EMPLOYMENT_FIELD_COPY.systemRole.placeholder} />
                </SelectTrigger>
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
            <FormDescription className="text-xs">
              {EMPLOYMENT_FIELD_COPY.systemRole.description}
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
            <FormDescription className="text-xs">
              Cannot be before {format(companyEstablishedDate, "MMMM d, yyyy")} (company establishment).
            </FormDescription>
            <Popover>
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
                  disabled={(date) => {
                    const day = new Date(date.getFullYear(), date.getMonth(), date.getDate());
                    const min = new Date(
                      companyEstablishedDate.getFullYear(),
                      companyEstablishedDate.getMonth(),
                      companyEstablishedDate.getDate(),
                    );
                    return day < min;
                  }}
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
              <Input
                placeholder="Auto-generated if blank"
                maxLength={20}
                value={field.value ?? ""}
                onChange={(e) => {
                  const next = e.target.value.replace(/[^A-Za-z0-9]/g, "").slice(0, 20);
                  field.onChange(next || undefined);
                }}
                onBlur={field.onBlur}
                name={field.name}
                ref={field.ref}
              />
            </FormControl>
            <FormDescription className="text-xs">Leave blank to auto-generate</FormDescription>
            <FormMessage />
          </FormItem>
        )}
      />
      </div>
    </div>
  );
}

function EmploymentFieldsIntro() {
  return (
    <div className="rounded-lg border bg-muted/30 px-4 py-3 text-sm text-muted-foreground">
      <p className="font-medium text-foreground mb-1">How these fields differ</p>
      <ul className="list-disc pl-5 space-y-1 text-xs sm:text-sm">
        <li>
          <span className="font-medium text-foreground">Department</span> — which team they sit in (org structure).
        </li>
        <li>
          <span className="font-medium text-foreground">Job title</span> — their role name on paper (e.g. Senior Engineer).
        </li>
        <li>
          <span className="font-medium text-foreground">System role</span> — what they can do in this app (permissions).
        </li>
      </ul>
    </div>
  );
}
