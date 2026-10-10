"use client";

import { useMemo, useCallback } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import type { UseFormReturn } from "react-hook-form";
import { z } from "zod";
import { FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { EntityFormSheet } from "@/components/shared/entity-form-sheet";
import { FIELD_CONTROL_CLASS } from "@/components/ui/field-control";
import { useGoals } from "@/hooks/api/goals";
import { useEpics } from "@/hooks/api/build/epics";
import { useRoadmapItems } from "@/hooks/api/build/roadmap";
import type { AcceptOpportunityInput } from "@/hooks/api/build/product-discovery-mutations";

const acceptSchema = z.object({
  horizon: z.enum(["now", "next", "later"]),
  title: z.string().optional(),
  projectId: z.number().int().positive().optional(),
  goalId: z.number().int().positive().optional(),
  releaseId: z.number().int().positive().optional(),
  epicTicketId: z.number().int().positive().optional(),
  isPublic: z.boolean().optional(),
  dependsOnIds: z.array(z.number().int().positive()).optional(),
  note: z.string().optional(),
  expectedVersion: z.number().int(),
});

type AcceptFormValues = z.infer<typeof acceptSchema>;

interface NamedItem {
  id: number;
  name: string;
}
interface TitledItem {
  id: number;
  title: string;
}
interface Release {
  id: number;
  name: string;
  version: string;
}

type FormRef = UseFormReturn<AcceptFormValues>;

interface OpportunityAcceptDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  opportunityTitle: string;
  expectedVersion: number;
  managedProductId: number;
  projects?: NamedItem[];
  releases?: Release[];
  isSubmitting: boolean;
  onAccept: (data: AcceptOpportunityInput) => void;
}

function idSelectValue(id: number | undefined) {
  return id !== undefined ? String(id) : "";
}

interface NumericItem {
  id: number;
  label: string;
}
type NumericFieldName = "goalId" | "projectId" | "epicTicketId" | "releaseId";

interface FieldSelectProps {
  form: FormRef;
  name: NumericFieldName;
  label: string;
  items: NumericItem[];
  placeholder?: string;
  testId?: string;
  onChangeSideEffect?: () => void;
}

function FieldSelect({
  form,
  name,
  label,
  items,
  placeholder,
  testId,
  onChangeSideEffect,
}: FieldSelectProps) {
  const value = form.watch(name) as number | undefined;
  const handleChange = useCallback(
    (v: string) => {
      form.setValue(name, v ? Number(v) : undefined);
      onChangeSideEffect?.();
    },
    [form, name, onChangeSideEffect],
  );
  return (
    <FormField
      control={form.control}
      name={name}
      render={() => (
        <FormItem>
          <FormLabel>{label}</FormLabel>
          <Select value={idSelectValue(value)} onValueChange={handleChange}>
            <SelectTrigger className={FIELD_CONTROL_CLASS} data-testid={testId}>
              <SelectValue placeholder={placeholder} />
            </SelectTrigger>
            <SelectContent>
              {items.map((i) => (
                <SelectItem key={i.id} value={String(i.id)}>
                  {i.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <FormMessage />
        </FormItem>
      )}
    />
  );
}

interface AcceptFieldsProps {
  form: FormRef;
  projects: NamedItem[];
  releases: Release[];
  goals: TitledItem[];
  roadmapItems: TitledItem[];
}

function AcceptFields({ form, projects, releases, goals, roadmapItems }: AcceptFieldsProps) {
  const selectedProjectId = form.watch("projectId");
  const { data: epics } = useEpics(selectedProjectId ?? 0);

  const clearEpic = useCallback(() => {
    form.setValue("epicTicketId", undefined);
  }, [form]);

  const goalItems = useMemo<NumericItem[]>(
    () => goals.map((g) => ({ id: g.id, label: g.title })),
    [goals],
  );
  const projectItems = useMemo<NumericItem[]>(
    () => projects.map((p) => ({ id: p.id, label: p.name })),
    [projects],
  );
  const epicItems = useMemo<NumericItem[]>(
    () => (epics ?? []).map((e) => ({ id: e.id, label: e.title })),
    [epics],
  );
  const releaseItems = useMemo<NumericItem[]>(
    () => releases.map((r) => ({ id: r.id, label: `${r.name} ${r.version}` })),
    [releases],
  );

  return (
    <div className="space-y-4">
      <FormField
        control={form.control}
        name="horizon"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Horizon</FormLabel>
            <Select value={field.value} onValueChange={(v) => v && field.onChange(v)}>
              <SelectTrigger className={FIELD_CONTROL_CLASS} data-testid="horizon-select">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="now">Now</SelectItem>
                <SelectItem value="next">Next</SelectItem>
                <SelectItem value="later">Later</SelectItem>
              </SelectContent>
            </Select>
            <FormMessage />
          </FormItem>
        )}
      />
      {goalItems.length > 0 && (
        <FieldSelect
          form={form}
          name="goalId"
          label="Goal (optional)"
          testId="goal-select"
          items={goalItems}
          placeholder="Link to goal"
        />
      )}
      {projectItems.length > 0 && (
        <FieldSelect
          form={form}
          name="projectId"
          label="Project (optional)"
          testId="project-select"
          items={projectItems}
          placeholder="Select project"
          onChangeSideEffect={clearEpic}
        />
      )}
      {selectedProjectId != null && epicItems.length > 0 && (
        <FieldSelect
          form={form}
          name="epicTicketId"
          label="Epic (optional)"
          testId="epic-select"
          items={epicItems}
          placeholder="Select epic"
        />
      )}
      {releaseItems.length > 0 && (
        <FieldSelect
          form={form}
          name="releaseId"
          label="Release (optional)"
          testId="release-select"
          items={releaseItems}
          placeholder="Select release"
        />
      )}

      <FormField
        control={form.control}
        name="isPublic"
        render={({ field }) => (
          <FormItem>
            <div className="flex items-center gap-3">
              <FormControl>
                <Switch
                  checked={field.value ?? false}
                  onCheckedChange={field.onChange}
                  data-testid="is-public-switch"
                />
              </FormControl>
              <FormLabel className="cursor-pointer">Visible to customers</FormLabel>
            </div>
            <FormMessage />
          </FormItem>
        )}
      />

      {roadmapItems.length > 0 && (
        <FormField
          control={form.control}
          name="dependsOnIds"
          render={({ field }) => {
            const selected: number[] = field.value ?? [];
            const toggle = (id: number) => {
              const next = selected.includes(id)
                ? selected.filter((x) => x !== id)
                : [...selected, id];
              field.onChange(next.length > 0 ? next : undefined);
            };
            return (
              <FormItem>
                <FormLabel>Depends on (optional)</FormLabel>
                <div
                  className="rounded-md border border-input max-h-36 overflow-y-auto"
                  data-testid="depends-on-list"
                >
                  {roadmapItems.map((item) => (
                    <label
                      key={item.id}
                      className="flex items-center gap-2 px-3 py-2 text-sm cursor-pointer hover:bg-accent"
                    >
                      <Checkbox
                        checked={selected.includes(item.id)}
                        onCheckedChange={() => toggle(item.id)}
                      />
                      {item.title}
                    </label>
                  ))}
                </div>
                <FormMessage />
              </FormItem>
            );
          }}
        />
      )}

      <FormField
        control={form.control}
        name="note"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Note (optional)</FormLabel>
            <Textarea
              {...field}
              className={FIELD_CONTROL_CLASS}
              placeholder="Why are you accepting this opportunity?"
              rows={3}
            />
            <FormMessage />
          </FormItem>
        )}
      />
      <Input type="hidden" {...form.register("expectedVersion", { valueAsNumber: true })} />
    </div>
  );
}

export function OpportunityAcceptDialog({
  open,
  onOpenChange,
  opportunityTitle,
  expectedVersion,
  managedProductId,
  projects = [],
  releases = [],
  isSubmitting,
  onAccept,
}: OpportunityAcceptDialogProps) {
  const { data: goalsRaw } = useGoals({ managedProductId });
  const goals = useMemo<TitledItem[]>(() => goalsRaw ?? [], [goalsRaw]);
  const { data: roadmapPage } = useRoadmapItems({ managedProductId });
  const roadmapItems = useMemo<TitledItem[]>(() => roadmapPage?.data ?? [], [roadmapPage]);

  return (
    <EntityFormSheet<AcceptFormValues>
      open={open}
      onOpenChange={onOpenChange}
      title="Accept opportunity"
      description={`Accepting "${opportunityTitle}" will create a linked roadmap initiative.`}
      resolver={zodResolver(acceptSchema)}
      defaultValues={{ horizon: "next", expectedVersion, isPublic: false }}
      onSubmit={onAccept}
      isSubmitting={isSubmitting}
      submitLabel="Accept"
      resetOnOpen
    >
      {(form) => (
        <AcceptFields
          form={form}
          projects={projects}
          releases={releases}
          goals={goals}
          roadmapItems={roadmapItems}
        />
      )}
    </EntityFormSheet>
  );
}
