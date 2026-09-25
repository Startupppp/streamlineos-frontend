"use client";

import { useEffect, useCallback } from "react";
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
import {
  useCreateContract,
  useUpdateContract,
  type HrContract,
} from "@/hooks/api/hr/global";

const schema = z.object({
  employmentId: z.string(),
  contractType: z.enum(["contractor", "consultant", "intern", "temporary", "agency", "freelancer"]),
  agencyVendor: z.string().optional(),
  startDate: z.string().min(1),
  endDate: z.string().optional(),
  renewalReminderDays: z.string(),
  stipendCents: z.string().optional(),
  timesheetBased: z.boolean(),
  status: z.enum(["active", "expiring", "ended", "renewed", "converted"]),
  documentUrl: z.string().optional(),
});

type FormValues = z.infer<typeof schema>;

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  existing?: HrContract;
  defaultEmploymentId?: number;
}

export function ContractSheet({ open, onOpenChange, existing, defaultEmploymentId }: Props) {
  const create = useCreateContract();
  const update = useUpdateContract(existing?.id ?? 0);

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      employmentId: String(defaultEmploymentId ?? ""),
      contractType: "contractor",
      agencyVendor: "",
      startDate: "",
      endDate: "",
      renewalReminderDays: "30",
      stipendCents: "",
      timesheetBased: false,
      status: "active",
      documentUrl: "",
    },
  });

  useEffect(() => {
    if (existing) {
      form.reset({
        employmentId: String(existing.employmentId),
        contractType: existing.contractType,
        agencyVendor: existing.agencyVendor ?? "",
        startDate: existing.startDate,
        endDate: existing.endDate ?? "",
        renewalReminderDays: String(existing.renewalReminderDays),
        stipendCents: existing.stipendCents ? String(existing.stipendCents) : "",
        timesheetBased: existing.timesheetBased,
        status: existing.status,
        documentUrl: existing.documentUrl ?? "",
      });
    } else {
      form.reset({
        employmentId: String(defaultEmploymentId ?? ""),
        contractType: "contractor",
        agencyVendor: "",
        startDate: "",
        endDate: "",
        renewalReminderDays: "30",
        stipendCents: "",
        timesheetBased: false,
        status: "active",
        documentUrl: "",
      });
    }
  }, [existing, defaultEmploymentId, form, open]);

  const onSubmit = useCallback((values: FormValues) => {
    const body = {
      employmentId: Number(values.employmentId),
      contractType: values.contractType,
      agencyVendor: values.agencyVendor || undefined,
      startDate: values.startDate,
      endDate: values.endDate || undefined,
      renewalReminderDays: Number(values.renewalReminderDays),
      stipendCents: values.stipendCents ? Number(values.stipendCents) : undefined,
      timesheetBased: values.timesheetBased,
      status: values.status,
      documentUrl: values.documentUrl || undefined,
    };

    const mutation = existing ? update : create;
    mutation.mutate(body, {
      onSuccess: () => onOpenChange(false),
    });
  }, [existing, create, update, onOpenChange]);

  const isPending = create.isPending || update.isPending;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="flex w-full flex-col gap-0 overflow-hidden p-0 sm:max-w-lg">
        <SheetHeader className="shrink-0 border-b border-border px-6 py-4 text-left">
          <SheetTitle>{existing ? "Edit Contract" : "New Contract"}</SheetTitle>
        </SheetHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="flex min-h-0 flex-1 flex-col">
            <SheetBody className="space-y-4 px-6 py-5">
            {!defaultEmploymentId && (
              <FormField control={form.control} name="employmentId" render={({ field }) => (
                <FormItem>
                  <FormLabel>Employment ID</FormLabel>
                  <FormControl><Input {...field} type="number" placeholder="123" /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
            )}
            <div className="grid grid-cols-2 gap-3">
              <FormField control={form.control} name="contractType" render={({ field }) => (
                <FormItem>
                  <FormLabel>Type</FormLabel>
                  <Select value={field.value} onValueChange={field.onChange}>
                    <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                    <SelectContent>
                      {["contractor", "consultant", "intern", "temporary", "agency", "freelancer"].map((t) => (
                        <SelectItem key={t} value={t}>{t}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="status" render={({ field }) => (
                <FormItem>
                  <FormLabel>Status</FormLabel>
                  <Select value={field.value} onValueChange={field.onChange}>
                    <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                    <SelectContent>
                      {["active", "expiring", "ended", "renewed", "converted"].map((s) => (
                        <SelectItem key={s} value={s}>{s}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )} />
            </div>
            <FormField control={form.control} name="agencyVendor" render={({ field }) => (
              <FormItem>
                <FormLabel>Agency / Vendor</FormLabel>
                <FormControl><Input {...field} placeholder="Agency name or vendor" /></FormControl>
                <FormMessage />
              </FormItem>
            )} />
            <div className="grid grid-cols-2 gap-3">
              <FormField control={form.control} name="startDate" render={({ field }) => (
                <FormItem><FormLabel>Start Date <span className="text-destructive">*</span></FormLabel><FormControl><Input {...field} type="date" /></FormControl><FormMessage /></FormItem>
              )} />
              <FormField control={form.control} name="endDate" render={({ field }) => (
                <FormItem><FormLabel>End Date</FormLabel><FormControl><Input {...field} type="date" /></FormControl><FormMessage /></FormItem>
              )} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <FormField control={form.control} name="renewalReminderDays" render={({ field }) => (
                <FormItem><FormLabel>Renewal reminder (days)</FormLabel><FormControl><Input {...field} type="number" /></FormControl><FormMessage /></FormItem>
              )} />
              <FormField control={form.control} name="stipendCents" render={({ field }) => (
                <FormItem><FormLabel>Stipend (cents)</FormLabel><FormControl><Input {...field} type="number" placeholder="e.g. 1500000" /></FormControl><FormMessage /></FormItem>
              )} />
            </div>
            <FormField control={form.control} name="timesheetBased" render={({ field }) => (
              <FormItem className="flex items-center gap-3">
                <FormControl><Switch checked={field.value} onCheckedChange={field.onChange} /></FormControl>
                <FormLabel className="!mt-0">Timesheet-based</FormLabel>
              </FormItem>
            )} />
            <FormField control={form.control} name="documentUrl" render={({ field }) => (
              <FormItem>
                <FormLabel>Document URL</FormLabel>
                <FormControl><Input {...field} type="url" placeholder="https://..." /></FormControl>
                <FormMessage />
              </FormItem>
            )} />
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
