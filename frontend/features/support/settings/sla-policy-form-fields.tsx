"use client";

import { useForm } from "react-hook-form";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  FormField, FormItem, FormLabel, FormControl, FormMessage,
} from "@/components/ui/form";
import {
  NO_PRIORITY, NO_BUSINESS_HOURS, PAUSE_STATUS_OPTIONS, type PolicyForm,
} from "./sla-policy-form.schema";

export interface BusinessHoursOption {
  id: number;
  name: string;
}

interface PolicyFormFieldsProps {
  form: ReturnType<typeof useForm<PolicyForm>>;
  businessHoursOptions: BusinessHoursOption[];
  idPrefix: string;
}

export function PolicyFormFields({ form, businessHoursOptions, idPrefix }: PolicyFormFieldsProps) {
  return (
    <>
      <FormField control={form.control} name="name" render={({ field }) => (
        <FormItem>
          <FormLabel>Policy Name</FormLabel>
          <FormControl><Input {...field} placeholder="e.g. Urgent Ticket SLA" /></FormControl>
          <FormMessage />
        </FormItem>
      )} />
      <div className="grid grid-cols-2 gap-4">
        <FormField control={form.control} name="priority" render={({ field }) => (
          <FormItem>
            <FormLabel>Priority</FormLabel>
            <Select onValueChange={field.onChange} value={field.value}>
              <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
              <SelectContent>
                <SelectItem value={NO_PRIORITY}>Any</SelectItem>
                <SelectItem value="LOW">Low</SelectItem>
                <SelectItem value="MEDIUM">Medium</SelectItem>
                <SelectItem value="HIGH">High</SelectItem>
                <SelectItem value="URGENT">Urgent</SelectItem>
              </SelectContent>
            </Select>
            <FormMessage />
          </FormItem>
        )} />
        <FormField control={form.control} name="category" render={({ field }) => (
          <FormItem>
            <FormLabel>Category</FormLabel>
            <FormControl><Input {...field} placeholder="e.g. billing" /></FormControl>
            <FormMessage />
          </FormItem>
        )} />
        <FormField control={form.control} name="firstResponseTargetMins" render={({ field }) => (
          <FormItem>
            <FormLabel>First Response (mins)</FormLabel>
            <FormControl><Input type="number" min={1} {...field} /></FormControl>
            <FormMessage />
          </FormItem>
        )} />
        <FormField control={form.control} name="resolutionTargetMins" render={({ field }) => (
          <FormItem>
            <FormLabel>Resolution (mins)</FormLabel>
            <FormControl><Input type="number" min={1} {...field} /></FormControl>
            <FormMessage />
          </FormItem>
        )} />
      </div>
      <FormField control={form.control} name="businessHoursId" render={({ field }) => (
        <FormItem>
          <FormLabel>Business Hours</FormLabel>
          <Select onValueChange={field.onChange} value={field.value}>
            <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
            <SelectContent>
              <SelectItem value={NO_BUSINESS_HOURS}>24/7 (no calendar)</SelectItem>
              {businessHoursOptions.map((bh) => (
                <SelectItem key={bh.id} value={String(bh.id)}>{bh.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <FormMessage />
        </FormItem>
      )} />
      <FormField control={form.control} name="pauseStatuses" render={() => (
        <FormItem>
          <FormLabel>Pause SLA on Statuses</FormLabel>
          <div className="grid grid-cols-2 gap-2">
            {PAUSE_STATUS_OPTIONS.map((option) => (
              <label
                key={option.value}
                htmlFor={`${idPrefix}-pause-${option.value}`}
                className="flex items-center gap-2 text-sm cursor-pointer"
              >
                <Checkbox
                  id={`${idPrefix}-pause-${option.value}`}
                  checked={form.watch("pauseStatuses").includes(option.value)}
                  onCheckedChange={(checked) => {
                    const current = form.getValues("pauseStatuses");
                    form.setValue(
                      "pauseStatuses",
                      checked
                        ? [...current, option.value]
                        : current.filter((v) => v !== option.value),
                      { shouldDirty: true },
                    );
                  }}
                />
                {option.label}
              </label>
            ))}
          </div>
          <FormMessage />
        </FormItem>
      )} />
      <FormField control={form.control} name="isEnabled" render={({ field }) => (
        <FormItem className="flex items-center justify-between rounded-lg border border-border px-3 py-2">
          <FormLabel className="mb-0">Enabled</FormLabel>
          <FormControl>
            <Switch checked={field.value} onCheckedChange={field.onChange} />
          </FormControl>
        </FormItem>
      )} />
    </>
  );
}
