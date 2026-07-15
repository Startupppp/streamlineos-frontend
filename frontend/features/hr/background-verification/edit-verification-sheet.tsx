"use client";

import { useCallback, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { HrSheet } from "@/features/hr/hr-sheet";
import { getErrorMessage } from "@/lib/get-error-message";
import {
  useUpdateBackgroundVerification,
  type BackgroundVerification,
} from "@/hooks/api/hr/background-verification";
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

const TERMINAL_STATUSES = ["PASSED", "FAILED"] as const;
type TerminalStatus = (typeof TERMINAL_STATUSES)[number];

function isTerminal(status: string): status is TerminalStatus {
  return (TERMINAL_STATUSES as readonly string[]).includes(status);
}

const schema = z
  .object({
    status: z.enum(["PENDING", "IN_PROGRESS", "PASSED", "FAILED"]),
    result: z
      .string()
      .max(500, "Result must be 500 characters or fewer")
      .refine((v) => v === "" || v.trim().length > 0, "Result cannot be blank")
      .optional()
      .or(z.literal("")),
    notes: z
      .string()
      .max(1000, "Notes must be 1000 characters or fewer")
      .optional()
      .or(z.literal("")),
  })
  .superRefine((data, ctx) => {
    if (isTerminal(data.status) && (!data.result || data.result.trim().length === 0)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["result"],
        message: "Result is required when the status is Passed or Failed",
      });
    }
  });

type FormValues = z.infer<typeof schema>;

interface Props {
  bgv: BackgroundVerification | null;
  onClose: () => void;
}

export function EditVerificationSheet({ bgv, onClose }: Props) {
  const update = useUpdateBackgroundVerification();
  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { status: "PENDING", result: "", notes: "" },
  });

  useEffect(() => {
    if (bgv) {
      form.reset({
        status: (bgv.status as FormValues["status"]) ?? "PENDING",
        result: bgv.result ?? "",
        notes: bgv.notes ?? "",
      });
    }
  }, [bgv, form]);

  const handleOpenChange = useCallback(
    (open: boolean) => {
      if (!open) onClose();
    },
    [onClose],
  );

  const onSubmit = useCallback(
    (data: FormValues) => {
      if (!bgv) return;
      update.mutate(
        {
          id: bgv.id,
          status: data.status,
          result: data.result?.trim() || undefined,
          notes: data.notes?.trim() || undefined,
        },
        {
          onSuccess: () => {
            toast.success("Check updated");
            onClose();
          },
          onError: (err) => toast.error(getErrorMessage(err)),
        },
      );
    },
    [bgv, update, onClose],
  );

  const currentStatus = form.watch("status");

  return (
    <HrSheet
      open={!!bgv}
      onOpenChange={handleOpenChange}
      title="Edit Verification"
      onSubmit={form.handleSubmit(onSubmit)}
      submitLabel="Save"
      isPending={update.isPending}
    >
      <Form {...form}>
        <div className="space-y-5">
          <FormField
            control={form.control}
            name="status"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-xs font-semibold text-foreground/80 uppercase tracking-wider">
                  Status
                </FormLabel>
                <Select value={field.value} onValueChange={field.onChange}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent className="w-[var(--radix-select-trigger-width)]">
                    <SelectItem value="PENDING">Pending</SelectItem>
                    <SelectItem value="IN_PROGRESS">In Progress</SelectItem>
                    <SelectItem value="PASSED">Passed</SelectItem>
                    <SelectItem value="FAILED">Failed</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="result"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-xs font-semibold text-foreground/80 uppercase tracking-wider">
                  Result
                  {isTerminal(currentStatus) && (
                    <span className="text-destructive ml-1">*</span>
                  )}
                </FormLabel>
                <FormControl>
                  <Input placeholder="Summary of findings..." {...field} />
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
                    rows={3}
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
