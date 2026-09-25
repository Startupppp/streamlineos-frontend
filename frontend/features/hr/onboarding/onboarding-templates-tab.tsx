"use client";

import { useState } from "react";
import { useFieldArray, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { PlusIcon, Trash2Icon } from "@animateicons/react/lucide";
import { AnimatedIconButton } from "@/components/ui/animated-icon-button";

import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
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
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { PageState } from "@/components/shared/page-state";
import { usePageState } from "@/hooks/api/use-page-state";
import { useCan } from "@/hooks/api/access";
import { HrSheet } from "@/components/shared/hr-sheet";
import {
  useHrOnboardingTemplates,
  useCreateHrOnboardingTemplate,
  useOnboardingTemplateDepartments,
} from "@/hooks/api/hr/onboarding";
import { getErrorMessage } from "@/lib/get-error-message";
import { TruncatedText } from "@/components/ui/truncated-text";
import {
  ONBOARDING_PLAN_DEFAULTS,
  ONBOARDING_STEP_OWNER_ROLES,
  emptyOnboardingPlanStep,
  onboardingPlanSchema,
  type OnboardingPlanFormValues,
} from "@/features/hr/onboarding/onboarding-plan-schema";

function CreateTemplateSheet({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const { data: departments } = useOnboardingTemplateDepartments();
  const createTemplate = useCreateHrOnboardingTemplate();
  const form = useForm<OnboardingPlanFormValues>({
    resolver: zodResolver(onboardingPlanSchema),
    defaultValues: ONBOARDING_PLAN_DEFAULTS,
  });
  const steps = useFieldArray({ control: form.control, name: "steps" });
  const stepsError = form.formState.errors.steps?.root?.message ?? form.formState.errors.steps?.message;

  function handleDiscard() {
    form.reset(ONBOARDING_PLAN_DEFAULTS);
  }

  function handleAddStep(): void {
    steps.append(emptyOnboardingPlanStep());
  }

  function handleRemoveStep(index: number) {
    return function removeStep(): void {
      steps.remove(index);
    };
  }

  function handleSubmit(values: OnboardingPlanFormValues) {
    createTemplate.mutate(
      {
        name: values.name,
        departmentId: values.departmentId || undefined,
        description: values.description || undefined,
        steps: values.steps,
      },
      {
        onSuccess: () => {
          toast.success("Onboarding plan created");
          form.reset(ONBOARDING_PLAN_DEFAULTS);
          onOpenChange(false);
        },
        onError: (err) => toast.error(getErrorMessage(err)),
      },
    );
  }

  return (
    <HrSheet
      open={open}
      onOpenChange={onOpenChange}
      title="Create onboarding plan"
      description="Create a reusable plan with steps, owners, and due dates. Department-specific plans are used automatically for employees in that department."
      onSubmit={form.handleSubmit(handleSubmit)}
      isPending={createTemplate.isPending}
      submitLabel="Create plan"
      isDirty={form.formState.isDirty}
      onDiscard={handleDiscard}
    >
      <Form {...form}>
        <div className="space-y-4">
          <FormField
            control={form.control}
            name="name"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Plan name</FormLabel>
                <FormControl>
                  <Input placeholder="e.g. Engineering onboarding" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="departmentId"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Department (optional)</FormLabel>
                <Select value={field.value || "all"} onValueChange={(v) => field.onChange(v === "all" ? "" : v)}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="All departments (default plan)" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="all">All departments (default plan)</SelectItem>
                    {(departments ?? []).map((d) => (
                      <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="description"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Description (optional)</FormLabel>
                <FormControl>
                  <Textarea placeholder="What this plan covers" rows={2} {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>Steps</Label>
              <AnimatedIconButton
                icon={PlusIcon}
                iconSize={12}
                iconClassName="mr-1"
                type="button"
                size="sm"
                variant="outline"
                className="text-xs gap-1"
                onClick={handleAddStep}
              >
                Add step
              </AnimatedIconButton>
            </div>
            {stepsError ? (
              <p className="text-destructive text-xs" role="alert">
                {stepsError}
              </p>
            ) : null}

            {steps.fields.map((step, i) => (
              <Card key={step.id} className="border border-border">
                <CardContent className="p-3 space-y-2">
                  <div className="flex items-start gap-2">
                    <FormField
                      control={form.control}
                      name={`steps.${i}.title`}
                      render={({ field }) => (
                        <FormItem className="flex-1">
                          <FormControl>
                            <Input
                              placeholder="Step title (e.g. Collect signed offer letter)"
                              className="text-sm"
                              aria-label={`Step ${i + 1} title`}
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    {steps.fields.length > 1 && (
                      <AnimatedIconButton
                        icon={Trash2Icon}
                        iconSize={14}
                        type="button"
                        size="icon"
                        variant="ghost"
                        className="h-9 w-9 shrink-0 text-muted-foreground hover:text-destructive"
                        onClick={handleRemoveStep(i)}
                        aria-label="Remove step"
                      />
                    )}
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <FormField
                      control={form.control}
                      name={`steps.${i}.ownerRole`}
                      render={({ field }) => (
                        <FormItem>
                          <Select value={field.value} onValueChange={field.onChange}>
                            <FormControl>
                              <SelectTrigger aria-label={`Step ${i + 1} owner`}>
                                <SelectValue />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {ONBOARDING_STEP_OWNER_ROLES.map((r) => (
                                <SelectItem key={r} value={r}>{r}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name={`steps.${i}.dueOffsetDays`}
                      render={({ field }) => (
                        <FormItem>
                          <FormControl>
                            <Input
                              type="number"
                              inputMode="numeric"
                              min={0}
                              step={1}
                              placeholder="Due (days after joining)"
                              aria-label={`Step ${i + 1} due day`}
                              value={field.value}
                              onChange={(e) => field.onChange(e.target.valueAsNumber)}
                              onBlur={field.onBlur}
                              name={field.name}
                              ref={field.ref}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  <div className="flex items-center gap-4">
                    <FormField
                      control={form.control}
                      name={`steps.${i}.isRequired`}
                      render={({ field }) => (
                        <label className="flex items-center gap-1.5 text-xs text-muted-foreground">
                          <Checkbox checked={field.value} onCheckedChange={(v) => field.onChange(v === true)} />
                          Required
                        </label>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name={`steps.${i}.isComplianceItem`}
                      render={({ field }) => (
                        <label className="flex items-center gap-1.5 text-xs text-muted-foreground">
                          <Checkbox checked={field.value} onCheckedChange={(v) => field.onChange(v === true)} />
                          Compliance item (applies across all plans)
                        </label>
                      )}
                    />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </Form>
    </HrSheet>
  );
}

export function OnboardingTemplatesTab() {
  const { data: templates, isLoading, isError, error, refetch } = useHrOnboardingTemplates();
  const { data: departments } = useOnboardingTemplateDepartments();
  const [sheetOpen, setSheetOpen] = useState(false);
  const canManage = useCan("hr:onboarding:manage");
  const pageState = usePageState({
    permission: "hr:onboarding:manage",
    isLoading,
    isError,
    error,
    isEmpty: !templates || templates.length === 0,
  });

  function handleOpenSheet() {
    setSheetOpen(true);
  }

  function handleRetry() {
    void refetch();
  }

  const departmentName = (id: string | null) =>
    id ? (departments ?? []).find((d) => d.id === id)?.name ?? "Department" : "All departments";

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          Reusable onboarding plans with steps, owners, and due dates. Department-specific plans are applied
          automatically when launching onboarding for an employee in that department.
        </p>
        {canManage && (
          <AnimatedIconButton icon={PlusIcon} iconSize={14} iconClassName="mr-1" size="sm" className="gap-1.5 shrink-0" onClick={handleOpenSheet}>
            Create plan
          </AnimatedIconButton>
        )}
      </div>

      <PageState
        resolution={pageState}
        onRetry={handleRetry}
        compact
        loading={
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {Array.from({ length: 2 }).map((_, i) => (
              <Skeleton key={i} className="h-24 rounded-lg" />
            ))}
          </div>
        }
        empty={
          <EmptyState
            illustrationPreset="documents"
            title="No onboarding plans yet"
            description="Create a plan to standardize onboarding steps for a department or your whole org."
            action={canManage ? { label: "Create plan", onClick: handleOpenSheet } : undefined}
            compact
          />
        }
      >
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {(templates ?? []).map((template) => (
            <Card key={template.id} className="rounded-2xl border border-border/70 bg-card/90 shadow-sm">
              <CardContent className="p-4">
                <div className="flex items-center justify-between gap-2">
                  <TruncatedText text={template.name} className="text-sm font-semibold text-foreground" />
                  {!template.isActive && (
                    <span className="text-micro font-medium text-muted-foreground border rounded-full px-2 py-0.5 shrink-0">
                      Inactive
                    </span>
                  )}
                </div>
                <p className="text-xs text-muted-foreground mt-0.5">{departmentName(template.departmentId)}</p>
                {template.description && (
                  <p className="text-xs text-muted-foreground mt-1.5">{template.description}</p>
                )}
                <p className="text-dense text-muted-foreground mt-2">
                  {template.steps.length} step{template.steps.length === 1 ? "" : "s"}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      </PageState>

      <CreateTemplateSheet open={sheetOpen} onOpenChange={setSheetOpen} />
    </div>
  );
}
