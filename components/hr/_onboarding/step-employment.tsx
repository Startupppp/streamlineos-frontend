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
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <FormField
        control={form.control}
        name="departmentId"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Department <span className="text-destructive">*</span></FormLabel>
            <Select
              value={field.value !== undefined && field.value !== null ? field.value.toString() : ""}
              onValueChange={(val) => {
                const num = parseInt(val, 10);
                field.onChange(isNaN(num) ? undefined : num);
                form.trigger("departmentId");
              }}
            >
              <FormControl>
                <SelectTrigger><SelectValue placeholder="Select department" /></SelectTrigger>
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
                <Calendar mode="single" selected={field.value} onSelect={field.onChange} initialFocus />
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
