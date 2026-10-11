"use client";

import { useCallback, useMemo } from "react";
import type { UseFormReturn } from "react-hook-form";
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
import { FIELD_CONTROL_CLASS } from "@/components/ui/field-control";
import { useEpics } from "@/hooks/api/build/epics";
import type { AcceptFormValues } from "./opportunity-accept-schema";
import { FieldSelect, type NumericItem } from "./opportunity-accept-field-select";

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

type FormRef = UseFormReturn<AcceptFormValues>;

interface AcceptFieldsProps {
  form: FormRef;
  projects: NamedItem[];
  releases: Release[];
  goals: TitledItem[];
  roadmapItems: TitledItem[];
}

export function AcceptFields({ form, projects, releases, goals, roadmapItems }: AcceptFieldsProps) {
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
