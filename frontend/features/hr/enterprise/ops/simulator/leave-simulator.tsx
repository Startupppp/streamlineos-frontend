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
import { useSimulateLeaveBalance } from "@/hooks/api/hr/enterprise-ops-simulator";

const schema = z.object({
  employeeId: z.string().min(1),
  leaveTypeId: z.string().min(1),
  projectionDate: z.string().min(1),
  hypotheticalAccrualRate: z.string().optional(),
});

type FormValues = z.infer<typeof schema>;

export function LeaveSimulator() {
  const simulate = useSimulateLeaveBalance();
  const [result, setResult] = useState<Record<string, unknown> | null>(null);

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { employeeId: "", leaveTypeId: "1", projectionDate: "", hypotheticalAccrualRate: "" },
  });

  function onSubmit(values: FormValues) {
    simulate.mutate(
      {
        employeeId: values.employeeId,
        leaveTypeId: parseInt(values.leaveTypeId, 10),
        projectionDate: values.projectionDate,
        hypotheticalAccrualRate: values.hypotheticalAccrualRate
          ? parseFloat(values.hypotheticalAccrualRate)
          : undefined,
      },
      { onSuccess: (data) => setResult(data) },
    );
  }

  return (
    <div className="grid md:grid-cols-2 gap-6">
      <div className="rounded-xl border border-border bg-card p-4 space-y-4">
        <p className="text-sm font-medium text-foreground">Leave Balance Projection</p>
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
            <FormField control={form.control} name="leaveTypeId" render={({ field }) => (
              <FormItem>
                <FormLabel>Leave Type ID</FormLabel>
                <FormControl><Input type="number" {...field} /></FormControl>
                <FormMessage />
              </FormItem>
            )} />
            <FormField control={form.control} name="projectionDate" render={({ field }) => (
              <FormItem>
                <FormLabel>Projection Date</FormLabel>
                <FormControl><Input type="date" {...field} /></FormControl>
                <FormMessage />
              </FormItem>
            )} />
            <FormField control={form.control} name="hypotheticalAccrualRate" render={({ field }) => (
              <FormItem>
                <FormLabel>Hypothetical Accrual Rate <span className="text-muted-foreground font-normal">(optional)</span></FormLabel>
                <FormControl><Input type="number" step="0.1" placeholder="e.g. 2.0 days/month" {...field} /></FormControl>
                <FormMessage />
              </FormItem>
            )} />
            <LoadingButton type="submit" isPending={simulate.isPending} loadingText="Simulating…" className="w-full">
              Project Balance
            </LoadingButton>
          </form>
        </Form>
      </div>
      <SimulationResult result={result} label="Projected leave balance" />
    </div>
  );
}
