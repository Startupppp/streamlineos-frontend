"use client";

import { useCallback, useState } from "react";
import { toast } from "sonner";
import { PlusIcon, Trash2Icon } from "@animateicons/react/lucide";
import { AnimatedIconButton } from "@/components/ui/animated-icon-button";

import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { HrSheet } from "@/features/hr/hr-sheet";
import { useHrDepartments } from "@/hooks/api/hr/employees";
import {
  useHrOnboardingTemplates,
  useCreateHrOnboardingTemplate,
  type OnboardingTemplateStep,
} from "@/hooks/api/hr/onboarding";
import { getErrorMessage } from "@/lib/get-error-message";
import { TruncatedText } from "@/components/ui/truncated-text";

const OWNER_ROLES = ["NEW_HIRE", "HR", "MANAGER", "IT"] as const;

function emptyStep(): OnboardingTemplateStep {
  return { title: "", ownerRole: "NEW_HIRE", dueOffsetDays: 0, isRequired: true, isComplianceItem: false };
}

function CreateTemplateSheet({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const [name, setName] = useState("");
  const [departmentId, setDepartmentId] = useState<string>("");
  const [description, setDescription] = useState("");
  const [steps, setSteps] = useState<OnboardingTemplateStep[]>([emptyStep()]);

  const { data: departments } = useHrDepartments();
  const createTemplate = useCreateHrOnboardingTemplate();

  function resetForm() {
    setName("");
    setDepartmentId("");
    setDescription("");
    setSteps([emptyStep()]);
  }

  function updateStep(index: number, patch: Partial<OnboardingTemplateStep>) {
    setSteps((prev) => prev.map((s, i) => (i === index ? { ...s, ...patch } : s)));
  }

  const handleSubmit = useCallback(() => {
    if (!name.trim()) {
      toast.error("Template name is required");
      return;
    }
    const validSteps = steps.filter((s) => s.title.trim().length > 0);
    if (validSteps.length === 0) {
      toast.error("Add at least one step");
      return;
    }
    createTemplate.mutate(
      {
        name: name.trim(),
        departmentId: departmentId ? Number(departmentId) : undefined,
        description: description.trim() || undefined,
        steps: validSteps,
      },
      {
        onSuccess: () => {
          toast.success("Onboarding plan created");
          resetForm();
          onOpenChange(false);
        },
        onError: (err) => toast.error(getErrorMessage(err)),
      },
    );
  }, [name, departmentId, description, steps, createTemplate, onOpenChange]);

  return (
    <HrSheet
      open={open}
      onOpenChange={onOpenChange}
      title="New Onboarding Plan"
      description="Create a reusable plan with steps, owners, and due dates. Department-specific plans are used automatically for employees in that department."
      onSubmit={handleSubmit}
      isPending={createTemplate.isPending}
      submitLabel="Create Plan"
    >
      <div className="space-y-4">
        <div className="space-y-1.5">
          <Label htmlFor="template-name">Plan name</Label>
          <Input id="template-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Engineering Onboarding" />
        </div>

        <div className="space-y-1.5">
          <Label>Department (optional)</Label>
          <Select value={departmentId} onValueChange={setDepartmentId}>
            <SelectTrigger>
              <SelectValue placeholder="All departments (default plan)" />
            </SelectTrigger>
            <SelectContent>
              {(departments ?? []).map((d) => (
                <SelectItem key={d.id} value={String(d.id)}>{d.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="template-description">Description (optional)</Label>
          <Textarea
            id="template-description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="What this plan covers"
            rows={2}
          />
        </div>

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
              onClick={() => setSteps((prev) => [...prev, emptyStep()])}
            >
              Add step
            </AnimatedIconButton>
          </div>

          {steps.map((step, i) => (
            <Card key={i} className="border border-border">
              <CardContent className="p-3 space-y-2">
                <div className="flex items-start gap-2">
                  <Input
                    value={step.title}
                    onChange={(e) => updateStep(i, { title: e.target.value })}
                    placeholder="Step title (e.g. Collect signed offer letter)"
                    className="text-sm flex-1"
                  />
                  {steps.length > 1 && (
                    <AnimatedIconButton
                      icon={Trash2Icon}
                      iconSize={14}
                      type="button"
                      size="icon"
                      variant="ghost"
                      className="h-9 w-9 shrink-0 text-muted-foreground hover:text-destructive"
                      onClick={() => setSteps((prev) => prev.filter((_, idx) => idx !== i))}
                      aria-label="Remove step"
                    />
                  )}
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <Select value={step.ownerRole} onValueChange={(v) => updateStep(i, { ownerRole: v })}>
                    <SelectTrigger className="text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {OWNER_ROLES.map((r) => (
                        <SelectItem key={r} value={r}>{r}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Input
                    type="number"
                    min={0}
                    value={step.dueOffsetDays}
                    onChange={(e) => updateStep(i, { dueOffsetDays: Math.max(0, Number(e.target.value) || 0) })}
                    placeholder="Due (days after joining)"
                    className="text-xs"
                  />
                </div>
                <div className="flex items-center gap-4">
                  <label className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <Checkbox checked={step.isRequired} onCheckedChange={(v) => updateStep(i, { isRequired: v === true })} />
                    Required
                  </label>
                  <label className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <Checkbox checked={step.isComplianceItem} onCheckedChange={(v) => updateStep(i, { isComplianceItem: v === true })} />
                    Compliance item (applies across all plans)
                  </label>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </HrSheet>
  );
}

export function OnboardingTemplatesTab() {
  const { data: templates, isLoading } = useHrOnboardingTemplates();
  const { data: departments } = useHrDepartments();
  const [sheetOpen, setSheetOpen] = useState(false);

  const departmentName = (id: number | null) =>
    id ? (departments ?? []).find((d) => d.id === id)?.name : "All departments";

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          Reusable onboarding plans with steps, owners, and due dates. Department-specific plans are applied
          automatically when launching onboarding for an employee in that department.
        </p>
        <AnimatedIconButton icon={PlusIcon} iconSize={14} iconClassName="mr-1" size="sm" className="gap-1.5 shrink-0" onClick={() => setSheetOpen(true)}>
          New Plan
        </AnimatedIconButton>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {Array.from({ length: 2 }).map((_, i) => (
            <Skeleton key={i} className="h-24 rounded-lg" />
          ))}
        </div>
      ) : !templates || templates.length === 0 ? (
        <EmptyState
          illustrationPreset="documents"
          title="No onboarding plans yet"
          description="Create a plan to standardize onboarding steps for a department or your whole org."
          action={{ label: "New Plan", onClick: () => setSheetOpen(true) }}
          compact
        />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {templates.map((template) => (
            <Card key={template.id} className="rounded-2xl border border-border/70 bg-card/90 shadow-sm">
              <CardContent className="p-4">
                <div className="flex items-center justify-between gap-2">
                  <TruncatedText text={template.name} className="text-sm font-semibold text-foreground" />
                  {!template.isActive && (
                    <span className="text-[10px] font-medium text-muted-foreground border rounded-full px-2 py-0.5 shrink-0">
                      Inactive
                    </span>
                  )}
                </div>
                <p className="text-xs text-muted-foreground mt-0.5">{departmentName(template.departmentId)}</p>
                {template.description && (
                  <p className="text-xs text-muted-foreground mt-1.5">{template.description}</p>
                )}
                <p className="text-[11px] text-muted-foreground mt-2">
                  {template.steps.length} step{template.steps.length === 1 ? "" : "s"}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <CreateTemplateSheet open={sheetOpen} onOpenChange={setSheetOpen} />
    </div>
  );
}
