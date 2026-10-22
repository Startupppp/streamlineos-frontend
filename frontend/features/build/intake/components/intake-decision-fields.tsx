"use client";

import {
  Fragment,
  type ChangeEvent,
} from "react";
import dynamic from "next/dynamic";
import { Controller, useFormContext } from "react-hook-form";
import { useCycles } from "@/hooks/api/build/cycles";
import { useModules } from "@/hooks/api/build/modules";
import { useProjectMembers } from "@/hooks/api/build/project-members";
import { useProject } from "@/hooks/api/build/projects";
import { useRegisterDirtyState } from "@/components/shared/dirty-state-context";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { getUserDisplayName } from "@/lib/person-display";
import { numericFieldValue } from "@/lib/numeric-field";
import type { IntakeDecisionForm } from "../intake-schema";

const TicketCombobox = dynamic(
  () =>
    import("@/features/build/shared/ticket-combobox").then(
      (module) => module.TicketCombobox,
    ),
  {
    ssr: false,
    loading: () => (
      <p role="status" className="text-sm text-muted-foreground">Loading ticket selection…</p>
    ),
  },
);

const WORK_STATES = [
  "todo",
  "in_progress",
  "in_review",
  "done",
  "cancelled",
];

type DecisionAction = IntakeDecisionForm["action"];

interface DecisionFieldsProps {
  projectId: number;
  action: DecisionAction;
  pending: boolean;
}

export function DecisionFields({
  projectId,
  action,
  pending,
}: DecisionFieldsProps) {
  const form = useFormContext<IntakeDecisionForm>();
  const { data: membersPage } = useProjectMembers(projectId);
  const { data: cycles } = useCycles(projectId);
  const { data: modules } = useModules(projectId);
  const { data: project } = useProject(projectId);
  const planningFields = [
    { name: "cycleId", id: "intake-cycle", label: "Cycle", options: cycles ?? [], placeholder: "Select cycle..." },
    { name: "moduleId", id: "intake-module", label: "Workstream", options: modules ?? [], placeholder: "Select workstream..." },
  ] as const;
  useRegisterDirtyState(form.formState.isDirty);
  function idFieldChange(onChange: (value: number | undefined) => void) {
    return function handleIdFieldChange(value: string) {
      if (!pending) onChange(numericFieldValue(value));
    };
  }
  function reasonFieldChange(
    onChange: (event: ChangeEvent<HTMLTextAreaElement>) => void,
  ) {
    return function handleReasonFieldChange(
      event: ChangeEvent<HTMLTextAreaElement>,
    ) {
      if (!pending) onChange(event);
    };
  }
  return (
    <fieldset disabled={pending} className="space-y-4">
      {action === "accept" ? (
        <>
          <Label htmlFor="intake-state">State</Label>
          <Controller
            control={form.control}
            name="state"
            render={({ field, fieldState }) => (
              <>
                <Select
                  value={field.value ?? ""}
                  onValueChange={(value) => {
                    if (!pending) field.onChange(value);
                  }}
                  disabled={pending}
                >
                  <SelectTrigger id="intake-state">
                    <SelectValue placeholder="Select state..." />
                  </SelectTrigger>
                  <SelectContent>
                    {WORK_STATES.map((state) => (
                      <SelectItem key={state} value={state}>
                        {state
                          .replace(/_/g, " ")
                          .replace(/\b\w/g, (c) => c.toUpperCase())}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {fieldState.error && (
                  <p className="text-xs text-destructive" role="alert">
                    {fieldState.error.message}
                  </p>
                )}
              </>
            )}
          />
          <Label htmlFor="intake-assignee">Assignee</Label>
          <Controller
            control={form.control}
            name="assigneeId"
            render={({ field }) => (
              <Select
                value={field.value ?? ""}
                onValueChange={(value) => {
                  if (!pending) field.onChange(value || undefined);
                }}
                disabled={pending}
              >
                <SelectTrigger id="intake-assignee">
                  <SelectValue placeholder="Select assignee..." />
                </SelectTrigger>
                <SelectContent>
                  {membersPage?.data.map((member) => (
                    <SelectItem key={member.id} value={member.id}>
                      {getUserDisplayName(member)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          />
          {planningFields.map(({ name, id, label, options, placeholder }) => (
            <Fragment key={name}>
              <Label htmlFor={id}>{label}</Label>
              <Controller
                control={form.control}
                name={name}
                render={({ field }) => (
                  <Select
                    value={field.value?.toString() ?? ""}
                    onValueChange={idFieldChange(field.onChange)}
                    disabled={pending}
                  >
                    <SelectTrigger id={id}>
                      <SelectValue placeholder={placeholder} />
                    </SelectTrigger>
                    <SelectContent>
                      {options.map((option) => (
                        <SelectItem key={option.id} value={String(option.id)}>
                          {option.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
            </Fragment>
          ))}
        </>
      ) : action === "decline" ? (
        <>
          <Label htmlFor="decline-reason">Reason</Label>
          <Controller
            control={form.control}
            name="reason"
            render={({ field, fieldState }) => (
              <>
                <Textarea
                  id="decline-reason"
                  placeholder="Why is this being declined?"
                  {...field}
                  value={field.value ?? ""}
                  onChange={reasonFieldChange(field.onChange)}
                />
                {fieldState.error && (
                  <p className="text-xs text-destructive" role="alert">
                    {fieldState.error.message}
                  </p>
                )}
              </>
            )}
          />
        </>
      ) : (
        <>
          <Label>Existing Ticket</Label>
          <Controller
            control={form.control}
            name="linkedWorkItemId"
            render={({ field, fieldState }) => (
              <>
                <TicketCombobox
                  projectId={projectId}
                  projectKey={project?.key ?? ""}
                  value={field.value?.toString() ?? ""}
                  onChange={idFieldChange(field.onChange)}
                  disabled={pending}
                />
                {fieldState.error && (
                  <p className="text-xs text-destructive" role="alert">
                    Select a valid existing ticket.
                  </p>
                )}
              </>
            )}
          />
        </>
      )}
    </fieldset>
  );
}
