"use client";

import React, { useEffect, useCallback } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetBody,
  SheetFooter,
} from "@/components/ui/sheet";
import {
  Form,
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { LoadingButton } from "@/components/ui/loading-button";
import { toast } from "sonner";
import { getErrorMessage } from "@/lib/get-error-message";
import {
  useCreateComplianceRequirement,
  useUpdateComplianceRequirement,
  type ComplianceRequirement,
} from "@/hooks/api/hr/global";

const schema = z.object({
  name: z.string().min(1),
  countryCode: z.string().optional(),
  stateCode: z.string().optional(),
  category: z.enum(["statutory_filing", "registration", "posting", "training", "audit", "other"]),
  frequency: z.enum(["once", "monthly", "quarterly", "yearly"]),
  dueRuleMonth: z.string().optional(),
  dueRuleDay: z.string().optional(),
  dueRuleOffsetDays: z.string().optional(),
  reminderDaysBefore: z.string(),
  active: z.boolean(),
});

type FormValues = z.infer<typeof schema>;

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  existing?: ComplianceRequirement;
}

export function ComplianceRequirementSheet({ open, onOpenChange, existing }: Props) {
  const create = useCreateComplianceRequirement();
  const update = useUpdateComplianceRequirement(existing?.id ?? 0);

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: "",
      countryCode: "",
      stateCode: "",
      category: "statutory_filing",
      frequency: "monthly",
      dueRuleMonth: "",
      dueRuleDay: "",
      dueRuleOffsetDays: "",
      reminderDaysBefore: "7",
      active: true,
    },
  });

  useEffect(() => {
    if (existing) {
      form.reset({
        name: existing.name,
        countryCode: existing.countryCode ?? "",
        stateCode: existing.stateCode ?? "",
        category: existing.category,
        frequency: existing.frequency,
        dueRuleMonth: String(existing.dueRule.month ?? ""),
        dueRuleDay: String(existing.dueRule.day ?? ""),
        dueRuleOffsetDays: String(existing.dueRule.offsetDays ?? ""),
        reminderDaysBefore: String(existing.reminderDaysBefore),
        active: existing.active,
      });
    } else {
      form.reset({ name: "", countryCode: "", stateCode: "", category: "statutory_filing", frequency: "monthly", dueRuleMonth: "", dueRuleDay: "", dueRuleOffsetDays: "", reminderDaysBefore: "7", active: true });
    }
  }, [existing, form, open]);

  const onSubmit = useCallback((values: FormValues) => {
    const body = {
      name: values.name,
      countryCode: values.countryCode || undefined,
      stateCode: values.stateCode || undefined,
      category: values.category,
      frequency: values.frequency,
      dueRule: {
        month: values.dueRuleMonth ? Number(values.dueRuleMonth) : undefined,
        day: values.dueRuleDay ? Number(values.dueRuleDay) : undefined,
        offsetDays: values.dueRuleOffsetDays ? Number(values.dueRuleOffsetDays) : undefined,
      },
      reminderDaysBefore: Number(values.reminderDaysBefore),
      active: values.active,
    };

    const mutation = existing ? update : create;
    mutation.mutate(body, {
      onSuccess: () => {
        toast.success(existing ? "Requirement updated" : "Requirement created");
        onOpenChange(false);
      },
      onError: (err) => toast.error(getErrorMessage(err)),
    });
  }, [existing, create, update, onOpenChange]);

  const isPending = create.isPending || update.isPending;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="flex w-full flex-col gap-0 overflow-hidden p-0 sm:max-w-lg">
        <SheetHeader className="shrink-0 border-b border-border px-6 py-4 text-left">
          <SheetTitle>{existing ? "Edit Requirement" : "New Compliance Requirement"}</SheetTitle>
        </SheetHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="flex min-h-0 flex-1 flex-col">
            <SheetBody className="space-y-4 px-6 py-5">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Name <span className="text-destructive">*</span></FormLabel>
                  <FormControl><Input {...field} placeholder="PF Monthly Filing" /></FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="grid grid-cols-2 gap-3">
              <FormField
                control={form.control}
                name="countryCode"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Country Code</FormLabel>
                    <FormControl><Input {...field} placeholder="IN" maxLength={3} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="stateCode"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>State Code</FormLabel>
                    <FormControl><Input {...field} placeholder="MH" maxLength={10} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <FormField
                control={form.control}
                name="category"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Category</FormLabel>
                    <Select value={field.value} onValueChange={field.onChange}>
                      <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                      <SelectContent>
                        {["statutory_filing", "registration", "posting", "training", "audit", "other"].map((c) => (
                          <SelectItem key={c} value={c}>{c.replace(/_/g, " ")}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="frequency"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Frequency</FormLabel>
                    <Select value={field.value} onValueChange={field.onChange}>
                      <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                      <SelectContent>
                        {["once", "monthly", "quarterly", "yearly"].map((f) => (
                          <SelectItem key={f} value={f}>{f}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <div className="grid grid-cols-3 gap-3">
              <FormField control={form.control} name="dueRuleMonth" render={({ field }) => (
                <FormItem><FormLabel>Month</FormLabel><FormControl><Input {...field} placeholder="1-12" /></FormControl><FormMessage /></FormItem>
              )} />
              <FormField control={form.control} name="dueRuleDay" render={({ field }) => (
                <FormItem><FormLabel>Day</FormLabel><FormControl><Input {...field} placeholder="1-31" /></FormControl><FormMessage /></FormItem>
              )} />
              <FormField control={form.control} name="dueRuleOffsetDays" render={({ field }) => (
                <FormItem><FormLabel>Offset Days</FormLabel><FormControl><Input {...field} placeholder="30" /></FormControl><FormMessage /></FormItem>
              )} />
            </div>
            <FormField
              control={form.control}
              name="reminderDaysBefore"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Reminder days before due</FormLabel>
                  <FormControl><Input {...field} placeholder="7" /></FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="active"
              render={({ field }) => (
                <FormItem className="flex items-center gap-3">
                  <FormControl><Switch checked={field.value} onCheckedChange={field.onChange} /></FormControl>
                  <FormLabel className="!mt-0">Active</FormLabel>
                </FormItem>
              )}
            />
            </SheetBody>
            <SheetFooter className="shrink-0 border-t border-border bg-muted/30 px-6 py-4">
              <LoadingButton type="submit" isPending={isPending}>
                {existing ? "Save changes" : "Create"}
              </LoadingButton>
            </SheetFooter>
          </form>
        </Form>
      </SheetContent>
    </Sheet>
  );
}
