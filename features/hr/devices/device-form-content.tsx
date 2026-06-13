"use client";

import { z } from "zod";
import { type UseFormReturn } from "react-hook-form";
import {
  Form, FormControl, FormField, FormItem, FormLabel, FormMessage,
} from "@/components/ui/form";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";
import type { Employee } from "@/types/hr";

export const deviceSchema = z.object({
  userId: z.string().min(1, "Employee is required"),
  deviceType: z.string().min(1, "Device type is required"),
  deviceName: z
    .string()
    .min(1, "Device name is required")
    .max(100, "Device name is too long")
    .refine((v) => /[a-zA-Z]/.test(v), "Device name must contain at least one letter")
    .refine((v) => !/[!@#$%^&*()_+=\[\]{};:'",<>?\\|`~]{2,}/.test(v), "Device name cannot contain multiple consecutive special characters"),
  serialNumber: z.string().min(1, "Serial number is required").max(100, "Serial number is too long"),
  brand: z.string().min(1, "Brand is required").max(100, "Brand is too long"),
  model: z.string().min(1, "Model is required").max(100, "Model is too long"),
  notes: z.string().max(500, "Notes must be at most 500 characters").optional(),
});

export type DeviceFormValues = z.infer<typeof deviceSchema>;

interface DeviceFormContentProps {
  form: UseFormReturn<DeviceFormValues>;
  employees: Employee[];
  isPending: boolean;
  submitLabel: string;
  onSubmit: (values: DeviceFormValues) => void;
}

export function DeviceFormContent({
  form,
  employees,
  isPending,
  submitLabel,
  onSubmit,
}: DeviceFormContentProps) {
  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
        <FormField
          control={form.control}
          name="userId"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Assign to Employee</FormLabel>
              <Select onValueChange={field.onChange} value={field.value}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Select employee" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent className="max-h-60 overflow-y-auto">
                  {employees.map((emp) => (
                    <SelectItem key={emp.id} value={emp.id}>
                      {emp.firstName} {emp.lastName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="grid grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="deviceType"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Device Type</FormLabel>
                <Select onValueChange={field.onChange} value={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select type" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="Laptop">Laptop</SelectItem>
                    <SelectItem value="Phone">Phone</SelectItem>
                    <SelectItem value="Monitor">Monitor</SelectItem>
                    <SelectItem value="Keyboard">Keyboard</SelectItem>
                    <SelectItem value="Mouse">Mouse</SelectItem>
                    <SelectItem value="Headset">Headset</SelectItem>
                    <SelectItem value="Other">Other</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="deviceName"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Device Name <span className="text-destructive">*</span></FormLabel>
                <FormControl>
                  <Input
                    placeholder="MacBook Pro 14"
                    {...field}
                    onChange={(e) => {
                      const val = e.target.value;
                      field.onChange(val.replace(/\b\w/g, (c) => c.toUpperCase()));
                    }}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="brand"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Brand <span className="text-destructive">*</span></FormLabel>
                <FormControl>
                  <Input
                    placeholder="Apple"
                    {...field}
                    onChange={(e) => {
                      const val = e.target.value;
                      field.onChange(val.replace(/\b\w/g, (c) => c.toUpperCase()));
                    }}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="model"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Model <span className="text-destructive">*</span></FormLabel>
                <FormControl>
                  <Input
                    placeholder="M3 Pro"
                    {...field}
                    onChange={(e) => {
                      const val = e.target.value;
                      field.onChange(val.replace(/\b\w/g, (c) => c.toUpperCase()));
                    }}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <FormField
          control={form.control}
          name="serialNumber"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Serial Number <span className="text-destructive">*</span></FormLabel>
              <FormControl>
                <Input
                  placeholder="SN123456789"
                  className="uppercase"
                  {...field}
                  onChange={(e) => field.onChange(e.target.value.toUpperCase())}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="notes"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Notes</FormLabel>
              <FormControl>
                <Textarea placeholder="Any additional notes..." {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <Button type="submit" className="w-full mt-2" disabled={isPending}>
          {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          {submitLabel}
        </Button>
      </form>
    </Form>
  );
}
