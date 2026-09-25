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
import { useSimulatePolicy } from "@/hooks/api/hr/enterprise-ops-simulator";

const schema = z.object({
  employeeId: z.string().min(1, "Employee ID required"),
  policyType: z.string().min(1, "Policy type required"),
});

type FormValues = z.infer<typeof schema>;

export function PolicySimulator() {
  const simulate = useSimulatePolicy();
  const [result, setResult] = useState<Record<string, unknown> | null>(null);

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { employeeId: "", policyType: "leave" },
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
        <p className="text-sm font-medium text-foreground">Policy Match Input</p>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-3">
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
              name="policyType"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Policy Type</FormLabel>
                  <FormControl><Input placeholder="e.g. leave, attendance" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <LoadingButton type="submit" isPending={simulate.isPending} loadingText="Simulating…" className="w-full">
              Run Simulation
            </LoadingButton>
          </form>
        </Form>
      </div>

      <SimulationResult result={result} label="Which policy WOULD apply" />
    </div>
  );
}
