"use client";

import { useCallback, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { HrSheet } from "@/components/shared/hr-sheet";
import { getErrorMessage } from "@/lib/get-error-message";
import { useCreateBackgroundVerification } from "@/hooks/api/hr/background-verification";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
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
import { EmployeePicker } from "@/features/hr/shared/employee-picker";

const BGV_TYPES = ["Identity", "Education", "Employment", "Criminal", "Address", "Credit"] as const;

const schema = z.object({
  userId: z.string().min(1, "Employee is required"),
  type: z.enum(BGV_TYPES),
  provider: z
    .string()
    .max(200, "Provider name must be 200 characters or fewer")
    .refine((v) => v === "" || v.trim().length > 0, "Provider name cannot be blank")
    .optional()
    .or(z.literal("")),
  referenceNumber: z
    .string()
    .max(100, "Reference number must be 100 characters or fewer")
    .refine((v) => v === "" || v.trim().length > 0, "Reference number cannot be blank")
    .refine(
      (v) => v === "" || /^[a-zA-Z0-9_/-]*$/.test(v.trim()),
      "Reference number may only contain letters, digits, hyphens, underscores, and forward slashes",
    )
    .optional()
    .or(z.literal("")),
  notes: z.string().max(1000, "Notes must be 1000 characters or fewer").optional().or(z.literal("")),
});

type FormValues = z.infer<typeof schema>;

const EMPTY_VALUES: FormValues = {
  userId: "",
  type: "Identity",
  provider: "",
  referenceNumber: "",
  notes: "",
};

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function InitiateBgvSheet({ open, onOpenChange }: Props) {
  const create = useCreateBackgroundVerification();
  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: EMPTY_VALUES,
  });

  useEffect(() => {
    if (!open) form.reset(EMPTY_VALUES);
  }, [open, form]);

  const onSubmit = useCallback(
    (data: FormValues) => {
      create.mutate(
        {
          userId: data.userId,
          type: data.type,
          provider: data.provider?.trim() || undefined,
          referenceNumber: data.referenceNumber?.trim() || undefined,
          notes: data.notes?.trim() || undefined,
        },
        {
          onSuccess: () => {
            toast.success("Verification initiated");
            onOpenChange(false);
          },
          onError: (err) => toast.error(getErrorMessage(err)),
        },
      );
    },
    [create, onOpenChange],
  );

  return (
    <HrSheet
      open={open}
      onOpenChange={onOpenChange}
      title="Initiate BGV"
      onSubmit={form.handleSubmit(onSubmit)}
      submitLabel="Initiate"
      isPending={create.isPending}
    >
      <Form {...form}>
        <div className="space-y-5">
          <FormField
            control={form.control}
            name="userId"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-xs font-semibold text-foreground/80 uppercase tracking-wider">
                  Employee <span className="text-destructive">*</span>
                </FormLabel>
                <FormControl>
                  <EmployeePicker
                    value={field.value}
                    onChange={field.onChange}
                    placeholder="Select employee…"
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="type"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-xs font-semibold text-foreground/80 uppercase tracking-wider">
                  Verification Type <span className="text-destructive">*</span>
                </FormLabel>
                <Select value={field.value} onValueChange={field.onChange}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent className="min-w-[var(--radix-select-trigger-width)]">
                    {BGV_TYPES.map((t) => (
                      <SelectItem key={t} value={t}>
                        {t}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="provider"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-xs font-semibold text-foreground/80 uppercase tracking-wider">
                  Provider / Agency
                </FormLabel>
                <FormControl>
                  <Input placeholder="e.g., AuthBridge" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="referenceNumber"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-xs font-semibold text-foreground/80 uppercase tracking-wider">
                  Reference Number
                </FormLabel>
                <FormControl>
                  <Input placeholder="Tracking reference" {...field} />
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
                <FormLabel className="text-xs font-semibold text-foreground/80 uppercase tracking-wider">
                  Notes
                </FormLabel>
                <FormControl>
                  <Textarea
                    placeholder="Additional notes..."
                    rows={2}
                    className="resize-none w-full"
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
      </Form>
    </HrSheet>
  );
}
