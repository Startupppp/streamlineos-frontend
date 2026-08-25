"use client";

import { useState } from "react";
import { toast } from "sonner";
import { getErrorMessage } from "@/lib/get-error-message";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
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
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { LoadingButton } from "@/components/ui/loading-button";
import { Button } from "@/components/ui/button";
import { ShieldAlert, CheckCircle2 } from "lucide-react";
import { useAnonymousReport } from "@/hooks/api/hr/cases";
import type { CaseCategory, CaseSeverity } from "@/hooks/api/hr/cases";

const schema = z.object({
  category: z.enum(["grievance", "harassment", "ethics", "workplace_conflict", "policy_violation", "other"]),
  severity: z.enum(["low", "medium", "high", "critical"]),
  summary: z.string().min(5, "At least 5 characters").max(300),
  details: z.string().min(10, "At least 10 characters").max(10000),
});

type FormValues = z.infer<typeof schema>;

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
}

const CATEGORY_OPTIONS: { value: CaseCategory; label: string }[] = [
  { value: "grievance", label: "Grievance" },
  { value: "harassment", label: "Harassment" },
  { value: "ethics", label: "Ethics Concern" },
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

export function AnonymousReportDialog({ open, onOpenChange }: Props) {
  const report = useAnonymousReport();
  const [submitted, setSubmitted] = useState<string | null>(null);

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      category: "grievance",
      severity: "medium",
      summary: "",
      details: "",
    },
  });

  function handleSubmit(values: FormValues) {
    report.mutate(values, {
      onSuccess: (data) => {
        setSubmitted(data.caseNumber);
        form.reset();
      },
      onError: (err) => toast.error(getErrorMessage(err)),
    });
  }

  function handleClose() {
    onOpenChange(false);
    setSubmitted(null);
    form.reset();
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ShieldAlert className="h-4 w-4 text-primary" />
            Anonymous Report
          </DialogTitle>
          <DialogDescription className="text-xs">
            Your identity will not be recorded. This report is confidential and reviewed by authorized HR personnel only.
          </DialogDescription>
        </DialogHeader>

        {submitted ? (
          <div className="flex flex-col items-center gap-3 py-6 text-center">
            <CheckCircle2 className="h-10 w-10 text-status-success-ink" />
            <p className="text-sm font-semibold text-foreground">Report Submitted</p>
            <p className="text-xs text-muted-foreground">
              Your case reference number is{" "}
              <span className="font-mono font-bold text-foreground">{submitted}</span>
            </p>
            <p className="text-xs text-muted-foreground">
              Save this number if you wish to follow up. No personal information has been stored.
            </p>
            <Button variant="outline" size="sm" onClick={handleClose}>Close</Button>
          </div>
        ) : (
          <Form {...form}>
            <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="category"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Type of Concern</FormLabel>
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
                    <FormLabel>Brief Summary <span className="text-destructive">*</span></FormLabel>
                    <FormControl>
                      <Input className="" placeholder="One-line description" {...field} />
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
                    <FormLabel>Full Details <span className="text-destructive">*</span></FormLabel>
                    <FormControl>
                      <Textarea
                        rows={5}
                        placeholder="Describe the concern in detail, including dates, locations, and individuals involved..."
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <DialogFooter className="gap-2">
                <Button type="button" variant="outline" size="sm" onClick={handleClose}>
                  Cancel
                </Button>
                <LoadingButton type="submit" size="sm" isPending={report.isPending}>
                  Submit Anonymously
                </LoadingButton>
              </DialogFooter>
            </form>
          </Form>
        )}
      </DialogContent>
    </Dialog>
  );
}
