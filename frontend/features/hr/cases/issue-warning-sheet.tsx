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
    },
  });

  function handleSubmit(values: FormValues) {
    create.mutate(
      { ...values, caseId },
      {
        onSuccess: () => {
          onOpenChange(false);
          form.reset();
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
                <FormLabel>Employee</FormLabel>
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
                    <SelectTrigger className="h-8">
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
                <FormLabel>Effective Date</FormLabel>
                <FormControl>
                  <Input type="date" className="h-8" {...field} />
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
        </div>
      </Form>
    </HrSheet>
  );
}
