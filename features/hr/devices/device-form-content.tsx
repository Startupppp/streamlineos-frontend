"use client";

import { useState, useCallback } from "react";
import { z } from "zod";
import { type UseFormReturn } from "react-hook-form";
import {
  Form, FormControl, FormField, FormItem, FormLabel, FormMessage,
} from "@/components/ui/form";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Popover, PopoverContent, PopoverTrigger,
} from "@/components/ui/popover";
import {
  Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList,
} from "@/components/ui/command";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Loader2, ChevronsUpDown, Check } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Employee } from "@/types/hr";

export const deviceSchema = z.object({
  userId: z.string().min(1, "Employee is required"),
  deviceType: z.string().min(1, "Device type is required"),
  deviceName: z
    .string()
    .trim()
    .min(2, "Device name must be at least 2 characters")
    .max(100, "Device name is too long")
    .refine((v) => /[a-zA-Z]/.test(v), "Device name must contain at least one letter")
    .refine((v) => !/^[^a-zA-Z0-9]+$/.test(v), "Device name cannot be only special characters"),
  serialNumber: z
    .string()
    .trim()
    .min(3, "Serial number must be at least 3 characters")
    .max(100, "Serial number is too long")
    .refine((v) => /[a-zA-Z0-9]/.test(v), "Serial number must contain alphanumeric characters"),
  brand: z
    .string()
    .trim()
    .min(1, "Brand is required")
    .max(100, "Brand is too long")
    .refine((v) => /[a-zA-Z]/.test(v), "Brand must contain at least one letter"),
  model: z
    .string()
    .trim()
    .min(1, "Model is required")
    .max(100, "Model is too long"),
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
  const [empSearchOpen, setEmpSearchOpen] = useState(false);
  const [empSearch, setEmpSearch] = useState("");

  const filteredEmployees = employees.filter((emp) => {
    const name = `${emp.firstName ?? ""} ${emp.lastName ?? ""}`.toLowerCase();
    return name.includes(empSearch.toLowerCase());
  });

  const handleSelectEmployee = useCallback((userId: string, onChange: (v: string) => void) => {
    onChange(userId);
    setEmpSearchOpen(false);
    setEmpSearch("");
  }, []);

  const handleEmpPopoverChange = useCallback((open: boolean) => {
    setEmpSearchOpen(open);
    if (!open) setEmpSearch("");
  }, []);

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
        <FormField
          control={form.control}
          name="userId"
          render={({ field }) => {
            const selected = employees.find((e) => e.id === field.value);
            return (
              <FormItem>
                <FormLabel>Assign to Employee <span className="text-destructive">*</span></FormLabel>
                <Popover open={empSearchOpen} onOpenChange={handleEmpPopoverChange}>
                  <PopoverTrigger asChild>
                    <FormControl>
                      <Button
                        variant="outline"
                        role="combobox"
                        aria-expanded={empSearchOpen}
                        className="w-full justify-between font-normal"
                      >
                        <span className="truncate">
                          {selected ? `${selected.firstName ?? ""} ${selected.lastName ?? ""}`.trim() : "Select employee"}
                        </span>
                        <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                      </Button>
                    </FormControl>
                  </PopoverTrigger>
                  <PopoverContent className="w-[300px] p-0" align="start">
                    <Command shouldFilter={false}>
                      <CommandInput
                        placeholder="Search employee..."
                        value={empSearch}
                        onValueChange={setEmpSearch}
                      />
                      <CommandList>
                        <CommandEmpty>No employees found</CommandEmpty>
                        <CommandGroup>
                          {filteredEmployees.map((emp) => (
                            <CommandItem
                              key={emp.id}
                              value={emp.id}
                              onSelect={() => handleSelectEmployee(emp.id, field.onChange)}
                            >
                              <Check className={cn("mr-2 h-4 w-4", field.value === emp.id ? "opacity-100" : "opacity-0")} />
                              {emp.firstName ?? ""} {emp.lastName ?? ""}
                            </CommandItem>
                          ))}
                        </CommandGroup>
                      </CommandList>
                    </Command>
                  </PopoverContent>
                </Popover>
                <FormMessage />
              </FormItem>
            );
          }}
        />

        <div className="grid grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="deviceType"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Device Type <span className="text-destructive">*</span></FormLabel>
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
                  <Input placeholder="MacBook Pro 14" {...field} />
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
                  <Input placeholder="Apple" {...field} />
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
                  <Input placeholder="M3 Pro" {...field} />
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
