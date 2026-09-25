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
import { AnimatedIconButton } from "@/components/ui/animated-icon-button";
import { PlusIcon, Trash2Icon } from "@animateicons/react/lucide";
import { SimulationResult } from "./simulation-result";
import { useSimulatePayrollImpact } from "@/hooks/api/hr/enterprise-ops-simulator";

const COMPONENT_TYPES = ["earning", "deduction"] as const;

const schema = z.object({
  employeeId: z.string().min(1),
  effectiveDate: z.string().min(1),
});

type FormValues = z.infer<typeof schema>;
type Component = { name: string; amount: number; type: "earning" | "deduction" };

export function PayrollSimulator() {
  const simulate = useSimulatePayrollImpact();
  const [result, setResult] = useState<Record<string, unknown> | null>(null);
  const [components, setComponents] = useState<Component[]>([]);
  const [newName, setNewName] = useState("");
  const [newAmount, setNewAmount] = useState("");
  const [newType, setNewType] = useState<(typeof COMPONENT_TYPES)[number]>("earning");

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { employeeId: "", effectiveDate: "" },
  });

  function handleNewTypeChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const next = COMPONENT_TYPES.find((candidate) => candidate === e.target.value);
    if (next) setNewType(next);
  }

  function addComponent() {
    if (!newName.trim() || !newAmount) return;
    setComponents((c) => [...c, { name: newName.trim(), amount: parseFloat(newAmount), type: newType }]);
    setNewName("");
    setNewAmount("");
  }

  function handleRemoveComponent(index: number) {
    return function removeComponent(): void {
      setComponents((cs) => cs.filter((_, i) => i !== index));
    };
  }

  function onSubmit(values: FormValues) {
    simulate.mutate(
      { ...values, hypotheticalComponents: components },
      { onSuccess: (data) => setResult(data) },
    );
  }

  return (
    <div className="grid md:grid-cols-2 gap-6">
      <div className="rounded-xl border border-border bg-card p-4 space-y-4">
        <p className="text-sm font-medium">Payroll Impact Projection</p>
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
            <FormField control={form.control} name="effectiveDate" render={({ field }) => (
              <FormItem>
                <FormLabel>Effective Date</FormLabel>
                <FormControl><Input type="date" {...field} /></FormControl>
                <FormMessage />
              </FormItem>
            )} />

            <div className="space-y-2">
              <p className="text-xs font-medium text-muted-foreground">Hypothetical Components</p>
              <div className="flex gap-1.5">
                <Input placeholder="Name" value={newName} onChange={(e) => setNewName(e.target.value)} className="flex-1" />
                <Input type="number" placeholder="Amount" value={newAmount} onChange={(e) => setNewAmount(e.target.value)} className="w-24" />
                <select
                  aria-label="Component type"
                  className="rounded-md border border-border bg-background px-2 text-sm"
                  value={newType}
                  onChange={handleNewTypeChange}
                >
                  <option value="earning">Earning</option>
                  <option value="deduction">Deduction</option>
                </select>
                <AnimatedIconButton
                  icon={PlusIcon}
                  iconSize={16}
                  type="button"
                  size="icon"
                  variant="outline"
                  onClick={addComponent}
                  aria-label="Add component"
                />
              </div>
              {components.map((c, i) => (
                <div key={i} className="flex items-center justify-between text-sm rounded-md border border-border px-3 py-1.5">
                  <span>{c.name}</span>
                  <div className="flex items-center gap-2">
                    <span className={c.type === "earning" ? "text-status-success-ink" : "text-status-danger-ink"}>
                      {c.type === "earning" ? "+" : "-"}{c.amount}
                    </span>
                    <AnimatedIconButton
                      icon={Trash2Icon}
                      iconSize={12}
                      type="button"
                      size="icon"
                      variant="ghost"
                      className="h-5 w-5 text-destructive"
                      onClick={handleRemoveComponent(i)}
                      aria-label={`Remove ${c.name}`}
                    />
                  </div>
                </div>
              ))}
            </div>

            <LoadingButton type="submit" isPending={simulate.isPending} loadingText="Projecting…" className="w-full">
              Project Impact
            </LoadingButton>
          </form>
        </Form>
      </div>
      <SimulationResult result={result} label="Gross pay delta projection" />
    </div>
  );
}
