"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { UserCombobox } from "@/components/ui/user-combobox";
import { HrSheet } from "@/features/hr/hr-sheet";
import { toast } from "sonner";
import { getErrorMessage } from "@/lib/get-error-message";
import { useCreateDisciplinaryAction } from "@/hooks/api/hr/cases";
import type { DisciplinaryActionType } from "@/hooks/api/hr/cases";

const schema = z.object({
  employeeId: z.string().min(1, "Employee is required"),
  actionType: z.enum([
    "verbal_warning", "written_warning", "final_warning",
    "suspension", "termination_recommended",
  ]),
  effectiveDate: z.string().min(1, "Effective date required"),
  note: z.string().max(5000).optional(),
  forceEscalate: z.boolean().optional(),
});

type FormValues = z.infer<typeof schema>;

const ACTION_OPTIONS: { value: DisciplinaryActionType; label: string }[] = [
  { value: "verbal_warning", label: "Verbal Warning" },
  { value: "written_warning", label: "Written Warning" },
  { value: "final_warning", label: "Final Warning" },
  { value: "suspension", label: "Suspension" },
  { value: "termination_recommended", label: "Termination Recommended" },
];

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  caseId?: number;
}

export function IssueWarningSheet({ open, onOpenChange, caseId }: Props) {
  const create = useCreateDisciplinaryAction();
  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      employeeId: "",
      actionType: "verbal_warning",
      effectiveDate: new Date().toISOString().slice(0, 10),
      note: "",
      forceEscalate: false,
    },
  });

  function handleSubmit(values: FormValues) {
    create.mutate(
      { ...values, caseId, forceEscalate: values.forceEscalate || undefined },
      {
        onSuccess: () => {
          toast.success("Disciplinary action issued");
          onOpenChange(false);
          form.reset();
        },
        onError: (err) => {
          const msg = getErrorMessage(err);
          toast.error(msg);
          if (/progressive|forceEscalate|prior/i.test(msg)) {
            form.setValue("forceEscalate", true);
            toast.message("Enable force escalate to skip the progressive ladder (audited)");
          }
        },
      },
    );
  }

  return (
    <HrSheet
      open={open}
      onOpenChange={onOpenChange}
      title="Issue Disciplinary Action"
      description="Document a disciplinary action for an employee"
      onSubmit={form.handleSubmit(handleSubmit)}
      isPending={create.isPending}
      submitLabel="Issue Action"
    >
      <Form {...form}>
        <div className="space-y-4">
          <FormField
            control={form.control}
            name="employeeId"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Employee <span className="text-destructive">*</span></FormLabel>
                <FormControl>
                  <UserCombobox
                    value={field.value}
                    onChange={field.onChange}
                    placeholder="Select employee"
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="actionType"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Action Type</FormLabel>
                <Select onValueChange={field.onChange} value={field.value}>
                  <FormControl>
                    <SelectTrigger className="">
                      <SelectValue />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {ACTION_OPTIONS.map((o) => (
                      <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="effectiveDate"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Effective Date <span className="text-destructive">*</span></FormLabel>
                <FormControl>
                  <Input type="date" className="" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="note"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Notes (optional)</FormLabel>
                <FormControl>
                  <Textarea rows={4} placeholder="Additional notes..." {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="forceEscalate"
            render={({ field }) => (
              <FormItem className="flex flex-row items-start gap-2 space-y-0 rounded-md border border-border p-3">
                <FormControl>
                  <input
                    type="checkbox"
                    className="mt-1 h-3.5 w-3.5"
                    checked={Boolean(field.value)}
                    onChange={(e) => field.onChange(e.target.checked)}
                  />
                </FormControl>
                <div className="space-y-0.5">
                  <FormLabel className="text-[12px] font-medium">
                    Force escalate (skip progressive ladder)
                  </FormLabel>
                  <p className="text-[10px] text-muted-foreground leading-snug">
                    Product policy only — not legal advice. Override is audited when enabled.
                  </p>
                </div>
              </FormItem>
            )}
          />
        </div>
      </Form>
    </HrSheet>
  );
}
