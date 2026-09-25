"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Form,
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { UserCombobox } from "@/components/ui/user-combobox";
import { LoadingButton } from "@/components/ui/loading-button";
import { SimulationResult } from "./simulation-result";
import { useSimulateApprovalRouting } from "@/hooks/api/hr/enterprise-ops-simulator";

const schema = z.object({
  employeeId: z.string().min(1),
  objectType: z.string().min(1),
});

type FormValues = z.infer<typeof schema>;

export function ApprovalSimulator() {
  const simulate = useSimulateApprovalRouting();
  const [result, setResult] = useState<Record<string, unknown> | null>(null);

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { employeeId: "", objectType: "leave_request" },
  });

  function onSubmit(values: FormValues) {
    simulate.mutate(
      { ...values, hypotheticalContext: {} },
      { onSuccess: (data) => setResult(data) },
    );
  }

  return (
    <div className="grid md:grid-cols-2 gap-6">
      <div className="rounded-xl border border-border bg-card p-4 space-y-4">
        <p className="text-sm font-medium">Approval Routing Dry-Run</p>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-3">
            <FormField control={form.control} name="employeeId" render={({ field }) => (
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
            )} />
            <FormField control={form.control} name="objectType" render={({ field }) => (
              <FormItem>
                <FormLabel>Object Type</FormLabel>
                <FormControl><Input placeholder="e.g. leave_request, expense" {...field} /></FormControl>
                <FormMessage />
              </FormItem>
            )} />
            <LoadingButton type="submit" isPending={simulate.isPending} loadingText="Resolving…" className="w-full">
              Resolve Approvers
            </LoadingButton>
          </form>
        </Form>
      </div>
      <SimulationResult result={result} label="Which approvers WOULD be notified" />
    </div>
  );
}
