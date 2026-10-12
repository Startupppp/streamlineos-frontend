"use client";

import { useCallback, useMemo } from "react";
import type { UseFormReturn } from "react-hook-form";
import { FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { FIELD_CONTROL_CLASS } from "@/components/ui/field-control";
import { useEpics } from "@/hooks/api/build/epics";
import type { AcceptFormValues } from "./opportunity-accept-schema";
import { FieldSelect, type NumericItem } from "./opportunity-accept-field-select";
import { AcceptRoadmapField } from "./opportunity-accept-roadmap-field";

export interface NamedItem {
  id: number;
  name: string;
}
export interface TitledItem {
  id: number;
  title: string;
}
export interface Release {
  id: number;
  name: string;
  version: string;
}

export interface SelectorProps<T> {
  items: T[];
  isError: boolean;
  error: unknown;
  onRetry: () => void;
  onSearchChange?: (search: string) => void;
  footer?: React.ReactNode;
}

type FormRef = UseFormReturn<AcceptFormValues>;

interface AcceptFieldsProps {
  form: FormRef;
  managedProductId: number;
  enabled: boolean;
  goals: SelectorProps<TitledItem>;
  projects: SelectorProps<NamedItem>;
  releases: SelectorProps<Release>;
}

export function AcceptFields({ form, managedProductId, enabled, goals, projects, releases }: AcceptFieldsProps) {
  const selectedProjectId = form.watch("projectId");
  const { data: epics } = useEpics(selectedProjectId ?? 0);

  const clearEpic = useCallback(() => {
    form.setValue("epicTicketId", undefined);
  }, [form]);

  const goalItems = useMemo<NumericItem[]>(
    () => goals.items.map((g) => ({ id: g.id, label: g.title })),
    [goals.items],
  );
  const projectItems = useMemo<NumericItem[]>(
    () => projects.items.map((p) => ({ id: p.id, label: p.name })),
    [projects.items],
  );
  const epicItems = useMemo<NumericItem[]>(
    () => (epics ?? []).map((e) => ({ id: e.id, label: e.title })),
    [epics],
  );
  const releaseItems = useMemo<NumericItem[]>(
    () => releases.items.map((r) => ({ id: r.id, label: `${r.name} ${r.version}` })),
    [releases.items],
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
              <FormControl>
                <SelectTrigger className={FIELD_CONTROL_CLASS} data-testid="horizon-select">
                  <SelectValue />
                </SelectTrigger>
              </FormControl>
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
      {(goals.isError || goalItems.length > 0) && (
        <FieldSelect
          form={form}
          name="goalId"
          label="Goal (optional)"
          testId="goal-select"
          items={goalItems}
          placeholder="Link to goal"
          isError={goals.isError}
          error={goals.error}
          onRetry={goals.onRetry}
          onSearchChange={goals.onSearchChange}
        />
      )}
      {(projects.isError || projectItems.length > 0) && (
        <FieldSelect
          form={form}
          name="projectId"
          label="Project (optional)"
          testId="project-select"
          items={projectItems}
          placeholder="Select project"
          onChangeSideEffect={clearEpic}
          isError={projects.isError}
          error={projects.error}
          onRetry={projects.onRetry}
          onSearchChange={projects.onSearchChange}
          footer={projects.footer}
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
      {(releases.isError || releaseItems.length > 0) && (
        <FieldSelect
          form={form}
          name="releaseId"
          label="Release (optional)"
          testId="release-select"
          items={releaseItems}
          placeholder="Select release"
          isError={releases.isError}
          error={releases.error}
          onRetry={releases.onRetry}
          footer={releases.footer}
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
      <AcceptRoadmapField form={form} managedProductId={managedProductId} enabled={enabled} />
      <FormField
        control={form.control}
        name="note"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Note (optional)</FormLabel>
            <FormControl>
              <Textarea
                {...field}
                className={FIELD_CONTROL_CLASS}
                placeholder="Why are you accepting this opportunity?"
                rows={3}
              />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
      <Input type="hidden" {...form.register("expectedVersion", { valueAsNumber: true })} />
    </div>
  );
}
