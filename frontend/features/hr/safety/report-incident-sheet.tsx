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
import { HrSheet } from "@/features/hr/hr-sheet";
import { toast } from "sonner";
import { getErrorMessage } from "@/lib/get-error-message";
import { useReportIncident } from "@/hooks/api/hr/safety";
import type { IncidentType, IncidentSeverity } from "@/hooks/api/hr/safety";

const schema = z.object({
  type: z.enum(["injury", "accident", "near_miss", "hazard", "environmental", "other"]),
  location: z.string().min(1, "Location required"),
  occurredAt: z.string().min(1, "Date required"),
  description: z.string().min(10, "At least 10 characters").max(10000),
  severity: z.enum(["low", "medium", "high", "critical"]),
  medicalAttention: z.boolean(),
});

type FormValues = z.infer<typeof schema>;

const TYPE_OPTIONS: { value: IncidentType; label: string }[] = [
  { value: "injury", label: "Injury" },
  { value: "accident", label: "Accident" },
  { value: "near_miss", label: "Near Miss" },
  { value: "hazard", label: "Hazard" },
  { value: "environmental", label: "Environmental" },
  { value: "other", label: "Other" },
];

const SEVERITY_OPTIONS: { value: IncidentSeverity; label: string }[] = [
  { value: "low", label: "Low" },
  { value: "medium", label: "Medium" },
  { value: "high", label: "High" },
  { value: "critical", label: "Critical" },
];

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
}

export function ReportIncidentSheet({ open, onOpenChange }: Props) {
  const report = useReportIncident();
  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      type: "accident",
      location: "",
      occurredAt: new Date().toISOString().slice(0, 16),
      description: "",
      severity: "medium",
      medicalAttention: false,
    },
  });

  function handleSubmit(values: FormValues) {
    report.mutate(values, {
      onSuccess: () => {
        toast.success("Incident reported successfully");
        onOpenChange(false);
        form.reset();
      },
      onError: (err) => toast.error(getErrorMessage(err)),
    });
  }

  return (
    <HrSheet
      open={open}
      onOpenChange={onOpenChange}
      title="Report Safety Incident"
      description="Document a workplace safety incident or hazard"
      onSubmit={form.handleSubmit(handleSubmit)}
      isPending={report.isPending}
      submitLabel="Submit Report"
    >
      <Form {...form}>
        <div className="space-y-4">
          <FormField
            control={form.control}
            name="type"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Incident Type</FormLabel>
                <Select onValueChange={field.onChange} value={field.value}>
                  <FormControl>
                    <SelectTrigger className="">
                      <SelectValue />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {TYPE_OPTIONS.map((o) => (
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
            name="location"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Location <span className="text-destructive">*</span></FormLabel>
                <FormControl>
                  <Input className="" placeholder="Where did this occur?" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="occurredAt"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Date & Time <span className="text-destructive">*</span></FormLabel>
                <FormControl>
                  <Input type="datetime-local" className="" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="description"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Description <span className="text-destructive">*</span></FormLabel>
                <FormControl>
                  <Textarea rows={5} placeholder="Describe what happened..." {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="medicalAttention"
            render={({ field }) => (
              <FormItem className="flex items-center justify-between rounded-lg border p-3">
                <div>
                  <FormLabel className="text-sm font-medium">Medical Attention Required</FormLabel>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Was or will medical attention be needed?
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
