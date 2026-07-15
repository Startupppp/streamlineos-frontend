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
import { Switch } from "@/components/ui/switch";
import { UserCombobox } from "@/components/ui/user-combobox";
import { HrSheet } from "@/features/hr/hr-sheet";
import { useCreateCase } from "@/hooks/api/hr/cases";
import type { CaseCategory, CaseSeverity } from "@/hooks/api/hr/cases";

const schema = z.object({
  category: z.enum([
    "grievance", "disciplinary", "harassment", "ethics",
    "performance", "workplace_conflict", "policy_violation", "other",
  ]),
  severity: z.enum(["low", "medium", "high", "critical"]),
  summary: z.string().min(5, "At least 5 characters").max(300),
  details: z.string().min(10, "At least 10 characters").max(10000),
  subjectEmployeeId: z.string().optional(),
  confidential: z.boolean(),
});

type FormValues = z.infer<typeof schema>;

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
}

const CATEGORY_OPTIONS: { value: CaseCategory; label: string }[] = [
  { value: "grievance", label: "Grievance" },
  { value: "disciplinary", label: "Disciplinary" },
  { value: "harassment", label: "Harassment" },
  { value: "ethics", label: "Ethics" },
  { value: "performance", label: "Performance" },
  { value: "workplace_conflict", label: "Workplace Conflict" },
  { value: "policy_violation", label: "Policy Violation" },
  { value: "other", label: "Other" },
];

const SEVERITY_OPTIONS: { value: CaseSeverity; label: string }[] = [
  { value: "low", label: "Low" },
  { value: "medium", label: "Medium" },
  { value: "high", label: "High" },
  { value: "critical", label: "Critical" },
];

export function NewCaseSheet({ open, onOpenChange }: Props) {
  const createCase = useCreateCase();
  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      category: "grievance",
      severity: "medium",
      summary: "",
      details: "",
      subjectEmployeeId: "",
      confidential: true,
    },
  });

  function handleSubmit(values: FormValues) {
    createCase.mutate(
      {
        ...values,
        subjectEmployeeId: values.subjectEmployeeId || undefined,
      },
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
      title="New HR Case"
      description="Create a new case for investigation"
      onSubmit={form.handleSubmit(handleSubmit)}
      isPending={createCase.isPending}
      submitLabel="Create Case"
    >
      <Form {...form}>
        <div className="space-y-4">
          <FormField
            control={form.control}
            name="category"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Category</FormLabel>
                <Select onValueChange={field.onChange} value={field.value}>
                  <FormControl>
                    <SelectTrigger className="">
                      <SelectValue />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {CATEGORY_OPTIONS.map((o) => (
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
            name="severity"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Severity</FormLabel>
                <Select onValueChange={field.onChange} value={field.value}>
                  <FormControl>
                    <SelectTrigger className="">
                      <SelectValue />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {SEVERITY_OPTIONS.map((o) => (
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
            name="summary"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Summary</FormLabel>
                <FormControl>
                  <Input className="" placeholder="Brief case summary" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="details"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Details</FormLabel>
                <FormControl>
                  <Textarea
                    rows={5}
                    placeholder="Full description of the case..."
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="subjectEmployeeId"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Subject Employee (optional)</FormLabel>
                <FormControl>
                  <UserCombobox
                    value={field.value ?? ""}
                    onChange={field.onChange}
                    allowUnassigned
                    placeholder="Select employee"
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="confidential"
            render={({ field }) => (
              <FormItem className="flex items-center justify-between rounded-lg border p-3">
                <div>
                  <FormLabel className="text-sm font-medium">Confidential</FormLabel>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Restrict access to authorized HR personnel only
                  </p>
                </div>
                <FormControl>
                  <Switch checked={field.value} onCheckedChange={field.onChange} />
                </FormControl>
              </FormItem>
            )}
          />
        </div>
      </Form>
    </HrSheet>
  );
}
