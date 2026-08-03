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
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { getErrorMessage } from "@/lib/get-error-message";
import { LoadingButton } from "@/components/ui/loading-button";
import {
  useCreateWorkAuth,
  useUpdateWorkAuth,
  type WorkAuthorization,
} from "@/hooks/api/hr/global";

const schema = z.object({
  employmentId: z.string(),
  authType: z.enum(["work_permit", "visa", "right_to_work", "citizenship_proof", "other"]),
  countryCode: z.string().min(2).max(3),
  documentNumberMasked: z.string().max(20).optional(),
  validFrom: z.string().optional(),
  validUntil: z.string().optional(),
  status: z.enum(["active", "expiring", "expired", "pending_renewal"]),
  note: z.string().max(1000).optional(),
});

type FormValues = z.infer<typeof schema>;

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  existing?: WorkAuthorization;
  defaultEmploymentId?: number;
}

export function WorkAuthSheet({ open, onOpenChange, existing, defaultEmploymentId }: Props) {
  const create = useCreateWorkAuth();
  const update = useUpdateWorkAuth(existing?.id ?? 0);

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      employmentId: String(defaultEmploymentId ?? ""),
      authType: "visa",
      countryCode: "IN",
      documentNumberMasked: "",
      validFrom: "",
      validUntil: "",
      status: "active",
      note: "",
    },
  });

  useEffect(() => {
    if (existing) {
      form.reset({
        employmentId: String(existing.employmentId),
        authType: existing.authType,
        countryCode: existing.countryCode,
        documentNumberMasked: existing.documentNumberMasked ?? "",
        validFrom: existing.validFrom ?? "",
        validUntil: existing.validUntil ?? "",
        status: existing.status,
        note: existing.note ?? "",
      });
    } else {
      form.reset({
        employmentId: String(defaultEmploymentId ?? ""),
        authType: "visa",
        countryCode: "IN",
        documentNumberMasked: "",
        validFrom: "",
        validUntil: "",
        status: "active",
        note: "",
      });
    }
  }, [existing, defaultEmploymentId, form, open]);

  const onSubmit = useCallback((values: FormValues) => {
    const body = {
      employmentId: Number(values.employmentId),
      authType: values.authType,
      countryCode: values.countryCode.toUpperCase(),
      documentNumberMasked: values.documentNumberMasked || undefined,
      validFrom: values.validFrom || undefined,
      validUntil: values.validUntil || undefined,
      status: values.status,
      note: values.note || undefined,
    };

    const mutation = existing ? update : create;
    mutation.mutate(body, {
      onSuccess: () => onOpenChange(false),
      onError: (err) => toast.error(getErrorMessage(err)),
    });
  }, [existing, create, update, onOpenChange]);

  const isPending = create.isPending || update.isPending;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="flex w-full flex-col gap-0 overflow-hidden p-0 sm:max-w-md">
        <SheetHeader className="shrink-0 border-b border-border px-6 py-4 text-left">
          <SheetTitle>{existing ? "Edit Work Authorization" : "Add Work Authorization"}</SheetTitle>
        </SheetHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="flex min-h-0 flex-1 flex-col">
            <SheetBody className="space-y-4 px-6 py-5">
            {!defaultEmploymentId && (
              <FormField
                control={form.control}
                name="employmentId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Employment ID</FormLabel>
                    <FormControl><Input {...field} placeholder="123" type="number" /></FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}
            <div className="grid grid-cols-2 gap-3">
              <FormField
                control={form.control}
                name="authType"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Type</FormLabel>
                    <Select value={field.value} onValueChange={field.onChange}>
                      <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                      <SelectContent>
                        {["work_permit", "visa", "right_to_work", "citizenship_proof", "other"].map((t) => (
                          <SelectItem key={t} value={t}>{t.replace(/_/g, " ")}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="countryCode"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Country</FormLabel>
                    <FormControl><Input {...field} placeholder="IN" maxLength={3} className="uppercase" /></FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <FormField
              control={form.control}
              name="documentNumberMasked"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Document (last 4 digits only)</FormLabel>
                  <FormControl><Input {...field} placeholder="1234" maxLength={20} /></FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="grid grid-cols-2 gap-3">
              <FormField control={form.control} name="validFrom" render={({ field }) => (
                <FormItem><FormLabel>Valid From</FormLabel><FormControl><Input {...field} type="date" /></FormControl><FormMessage /></FormItem>
              )} />
              <FormField control={form.control} name="validUntil" render={({ field }) => (
                <FormItem><FormLabel>Valid Until</FormLabel><FormControl><Input {...field} type="date" /></FormControl><FormMessage /></FormItem>
              )} />
            </div>
            <FormField
              control={form.control}
              name="status"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Status</FormLabel>
                  <Select value={field.value} onValueChange={field.onChange}>
                    <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                    <SelectContent>
                      {["active", "expiring", "expired", "pending_renewal"].map((s) => (
                        <SelectItem key={s} value={s}>{s.replace(/_/g, " ")}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="note"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Note</FormLabel>
                  <FormControl><Textarea {...field} rows={3} placeholder="Additional notes..." /></FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            </SheetBody>
            <SheetFooter className="shrink-0 border-t border-border bg-muted/30 px-6 py-4">
              <LoadingButton type="submit" isPending={isPending}>
                {existing ? "Save changes" : "Add"}
              </LoadingButton>
            </SheetFooter>
          </form>
        </Form>
      </SheetContent>
    </Sheet>
  );
}
