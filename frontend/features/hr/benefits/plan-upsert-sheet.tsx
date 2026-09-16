"use client";

import { useCallback } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { HrSheet } from "@/components/shared/hr-sheet";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useCreateBenefitPlan, useUpdateBenefitPlan, type BenefitPlan } from "@/hooks/api/hr";
import { getErrorMessage } from "@/lib/get-error-message";

const PLAN_CATEGORIES = [
  "health",
  "life",
  "accident",
  "retirement",
  "wellness",
  "perk",
  "other",
] as const;
const PLAN_STATUSES = ["draft", "active", "archived"] as const;

const planSchema = z.object({
  name: z.string().min(1, "Name is required"),
  category: z.enum(PLAN_CATEGORIES),
  provider: z.string().optional(),
  description: z.string().optional(),
  premiumCents: z.string().optional(),
  employerContributionPct: z.string().optional(),
  effectiveFrom: z.string().min(1, "Effective from is required"),
  effectiveTo: z.string().optional(),
  status: z.enum(PLAN_STATUSES).optional(),
});

type PlanFormValues = z.infer<typeof planSchema>;

const CATEGORIES = [
  { value: "health", label: "Health" },
  { value: "life", label: "Life Insurance" },
  { value: "accident", label: "Accident" },
  { value: "retirement", label: "Retirement" },
  { value: "wellness", label: "Wellness" },
  { value: "perk", label: "Perk" },
  { value: "other", label: "Other" },
] as const;

const STATUSES = [
  { value: "draft", label: "Draft" },
  { value: "active", label: "Active" },
  { value: "archived", label: "Archived" },
] as const;

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  plan?: BenefitPlan;
}

export function PlanUpsertSheet({ open, onOpenChange, plan }: Props) {
  const createPlan = useCreateBenefitPlan();
  const updatePlan = useUpdateBenefitPlan();

  const form = useForm<PlanFormValues>({
    resolver: zodResolver(planSchema),
    defaultValues: plan
      ? {
          name: plan.name,
          category: plan.category,
          provider: plan.provider ?? "",
          description: plan.description ?? "",
          premiumCents: plan.premiumCents != null ? String(plan.premiumCents) : "",
          employerContributionPct: String(plan.employerContributionPct),
          effectiveFrom: plan.effectiveFrom,
          effectiveTo: plan.effectiveTo ?? "",
          status: plan.status,
        }
      : {
          name: "",
          category: "health",
          provider: "",
          description: "",
          premiumCents: "",
          employerContributionPct: "0",
          effectiveFrom: "",
          effectiveTo: "",
          status: "draft",
        },
  });

  const handleOpenChange = useCallback(
    (o: boolean) => {
      if (!o) form.reset();
      onOpenChange(o);
    },
    [form, onOpenChange],
  );

  const handleSubmit = useCallback(() => {
    void form.handleSubmit((values) => {
      const payload = {
        name: values.name,
        category: values.category,
        provider: values.provider || undefined,
        description: values.description || undefined,
        premiumCents: values.premiumCents ? parseInt(values.premiumCents, 10) : undefined,
        employerContributionPct: values.employerContributionPct
          ? parseInt(values.employerContributionPct, 10)
          : 0,
        effectiveFrom: values.effectiveFrom,
        effectiveTo: values.effectiveTo || undefined,
        status: values.status ?? "draft",
      };

      const promise = plan
        ? updatePlan.mutateAsync({ planId: plan.id, ...payload })
        : createPlan.mutateAsync(payload as Parameters<typeof createPlan.mutateAsync>[0]);

      toast.promise(promise, {
        loading: plan ? "Updating plan..." : "Creating plan...",
        success: () => {
          onOpenChange(false);
          form.reset();
          return plan ? "Plan updated" : "Plan created";
        },
        error: (e: unknown) => getErrorMessage(e),
      });
    })();
  }, [form, plan, createPlan, updatePlan, onOpenChange]);

  const isPending = createPlan.isPending || updatePlan.isPending;

  function handleCategoryChange(v: string) {
    const next = PLAN_CATEGORIES.find((candidate) => candidate === v);
    if (next) form.setValue("category", next);
  }

  function handlePlanStatusChange(v: string) {
    const next = PLAN_STATUSES.find((candidate) => candidate === v);
    if (next) form.setValue("status", next);
  }

  return (
    <HrSheet
      open={open}
      onOpenChange={handleOpenChange}
      title={plan ? "Edit Benefit Plan" : "New Benefit Plan"}
      description="Configure the benefit plan details and coverage"
      onSubmit={handleSubmit}
      submitLabel={plan ? "Save Changes" : "Create Plan"}
      isPending={isPending}
    >
      <div className="space-y-1.5">
        <Label htmlFor="name">Name <span className="text-destructive">*</span></Label>
        <Input id="name" placeholder="Health Insurance Premium" {...form.register("name")} />
        {form.formState.errors.name && (
          <p className="text-xs text-destructive">{form.formState.errors.name.message}</p>
        )}
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label>Category <span className="text-destructive">*</span></Label>
          <Select
            defaultValue={form.getValues("category")}
            onValueChange={handleCategoryChange}
          >
            <SelectTrigger className="text-sm">
              <SelectValue placeholder="Select category" />
            </SelectTrigger>
            <SelectContent>
              {CATEGORIES.map((c) => (
                <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1.5">
          <Label>Status</Label>
          <Select
            defaultValue={form.getValues("status") ?? "draft"}
            onValueChange={handlePlanStatusChange}
          >
            <SelectTrigger className="text-sm">
              <SelectValue placeholder="Select status" />
            </SelectTrigger>
            <SelectContent>
              {STATUSES.map((s) => (
                <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="provider">Provider</Label>
        <Input id="provider" placeholder="Star Health, LIC..." {...form.register("provider")} />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="description">Description</Label>
        <Textarea id="description" rows={3} placeholder="Describe coverage details..." {...form.register("description")} />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label htmlFor="premiumCents">Monthly Premium (paise)</Label>
          <Input id="premiumCents" type="number" min="0" placeholder="0" {...form.register("premiumCents")} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="employerContributionPct">Employer Contribution %</Label>
          <Input id="employerContributionPct" type="number" min="0" max="100" placeholder="0" {...form.register("employerContributionPct")} />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label htmlFor="effectiveFrom">Effective From <span className="text-destructive">*</span></Label>
          <Input id="effectiveFrom" type="date" {...form.register("effectiveFrom")} />
          {form.formState.errors.effectiveFrom && (
            <p className="text-xs text-destructive">{form.formState.errors.effectiveFrom.message}</p>
          )}
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="effectiveTo">Effective To</Label>
          <Input id="effectiveTo" type="date" {...form.register("effectiveTo")} />
        </div>
      </div>
    </HrSheet>
  );
}
