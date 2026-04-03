"use client";

import { UseFormReturn } from "react-hook-form";
import { z } from "zod";
import { onboardEmployeeInputSchema } from "../../../lib/validations/hr";
import { format } from "date-fns";
import { CalendarIcon } from "lucide-react";
import { cn } from "../../../lib/utils";

import { Button } from "../../ui/button";
import { Input } from "../../ui/input";
import {
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "../../ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../../ui/select";
import { Calendar } from "../../ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "../../ui/popover";

type FormValues = z.infer<typeof onboardEmployeeInputSchema>;

interface Department {
  id: number;
  name: string;
}

interface Role {
  slug: string;
  name: string;
}

interface StepEmploymentProps {
  form: UseFormReturn<FormValues>;
  departments: Department[] | undefined;
  allDepartmentOptions: (Department & { isCommon?: boolean })[];
  assignableRoles: Role[];
}

export function StepEmployment({
  form,
  departments,
  allDepartmentOptions,
  assignableRoles,
}: StepEmploymentProps) {
  return (
    <div className="grid gap-5 md:grid-cols-2">
      <FormField
        control={form.control}
        name="departmentId"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Department <span className="text-red-500">*</span></FormLabel>
            <Select
              value={field.value !== undefined && field.value !== null ? field.value.toString() : ""}
              onValueChange={(val) => {
                if (val && val !== "") {
                  const numVal = parseInt(val, 10);
                  if (!isNaN(numVal)) {
                    field.onChange(numVal);
                    form.trigger("departmentId");
                  }
                } else {
                  field.onChange(undefined);
                }
              }}
            >
              <FormControl>
                <SelectTrigger>
                  <SelectValue placeholder="Select Department" />
                </SelectTrigger>
              </FormControl>
              <SelectContent>
                {departments?.map((dept) => (
                  <SelectItem key={dept.id} value={dept.id.toString()}>
                    {dept.name}
                  </SelectItem>
                ))}
                {allDepartmentOptions
                  .filter(dept => dept.id < 0)
                  .map((dept) => (
                    <SelectItem key={dept.id} value={dept.id.toString()}>
                      {dept.name}
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
            <FormDescription className="text-xs">
              Select from existing departments or common roles.
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
            <FormLabel>Designation <span className="text-red-500">*</span></FormLabel>
            <FormControl>
              <Input placeholder="e.g., Senior Software Engineer" {...field} />
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
            <FormLabel>System Role <span className="text-red-500">*</span></FormLabel>
            <Select value={field.value} onValueChange={field.onChange}>
              <FormControl>
                <SelectTrigger>
                  <SelectValue placeholder="Select Role" />
                </SelectTrigger>
              </FormControl>
              <SelectContent>
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
                    <SelectItem value="CUSTOMER_SUPPORT">Customer Support</SelectItem>
                    <SelectItem value="DESIGN">Design</SelectItem>
                    <SelectItem value="VIDEO_EDITOR">Video Editor</SelectItem>
                    <SelectItem value="DIGITAL_MARKETING">Digital Marketing</SelectItem>
                  </>
                )}
              </SelectContent>
            </Select>
            <FormDescription className="text-xs">
              Permission level for system access.
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
            <FormLabel>Joining Date <span className="text-red-500">*</span></FormLabel>
            <Popover>
              <PopoverTrigger asChild>
                <FormControl>
                  <Button
                    variant={"outline"}
                    className={cn(
                      "w-full pl-3 text-left font-normal",
                      !field.value && "text-muted-foreground"
                    )}
                  >
                    {field.value ? format(field.value, "PPP") : <span>Pick a date</span>}
                    <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                  </Button>
                </FormControl>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={field.value}
                  onSelect={field.onChange}
                  disabled={(date) =>
                    date > new Date() || date < new Date("1900-01-01")
                  }
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
          <FormItem>
            <FormLabel>Employee ID</FormLabel>
            <FormControl>
              <Input placeholder="Auto-generated if blank" {...field} />
            </FormControl>
            <FormDescription className="text-xs">
              Leave blank to auto-generate, or enter a custom employee ID.
            </FormDescription>
            <FormMessage />
          </FormItem>
        )}
      />
    </div>
  );
}
