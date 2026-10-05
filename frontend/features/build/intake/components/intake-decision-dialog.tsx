"use client";

import { useCallback, useLayoutEffect, useRef, useState, type ChangeEvent, type ReactNode } from "react";
import { useSession } from "next-auth/react";
import dynamic from "next/dynamic";
import { Controller, useFormContext } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { useCan } from "@/hooks/api/access";
import { useAcceptIntakeRequest } from "@/hooks/api/build/intake-mutations";
import { useUpdateIntakeRequest, useCycles, useModules } from "@/hooks/api/build/advanced";
import { useProjectMembers } from "@/hooks/api/build/project-members";
import { useProject } from "@/hooks/api/build/projects";
import { useRegisterDirtyState } from "@/components/shared/dirty-state-context";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { intakeDecisionSchema, type IntakeDecisionForm } from "../intake-schema";
import { authenticatedScope } from "@/lib/query-scope";
import { getErrorMessage } from "@/lib/get-error-message";
import { getUserDisplayName } from "@/lib/person-display";
import { numericFieldValue } from "@/lib/numeric-field";
import type { IntakeRequest } from "@/types/projects";

type DecisionAction = IntakeDecisionForm["action"];
type Decision = { requestId: number; action: DecisionAction };
type Actions = {
  onAccept: (requestId: number) => void;
  onDecline: (requestId: number) => void;
  onDuplicate: (requestId: number) => void;
};
type Props = { projectId: number; children: (actions: Actions) => ReactNode };

const WORK_STATES = ["backlog", "todo", "in_progress", "in_review", "done", "cancelled"];
const TITLES = { accept: "Accept Intake Item", decline: "Decline Intake Item", duplicate: "Mark Intake Item as Duplicate" };
const SUBMIT_LABELS = { accept: "Accept & Create", decline: "Decline Item", duplicate: "Mark as Duplicate" };

const DecisionFormDialog = dynamic(
  () => import("@/components/shared/entity-form-dialog").then((module) => module.EntityFormDialog<IntakeDecisionForm>),
  { ssr: false, loading: () => <p role="status" className="text-sm text-muted-foreground">Loading decision form…</p> },
);
const TicketCombobox = dynamic(
  () => import("@/features/build/shared/ticket-combobox").then((module) => module.TicketCombobox),
  { ssr: false, loading: () => <p role="status" className="text-sm text-muted-foreground">Loading ticket selection…</p> },
);

export function IntakeDecisionDialog({ projectId, children }: Props) {
  const { data: session, status } = useSession();
  const canManage = useCan("build:workspace:manage");
  const identity = status === "authenticated" && session?.orgId && session.user?.id
    ? authenticatedScope(session.orgId, session.user.id) : "";
  return (
    <DecisionOwner key={`${projectId}:${identity}:${canManage}`} projectId={projectId} orgId={session?.orgId ?? ""} enabled={!!identity && canManage}>
      {children}
    </DecisionOwner>
  );
}

function DecisionOwner({ projectId, orgId, enabled, children }: Props & { orgId: string; enabled: boolean }) {
  const [decision, setDecision] = useState<Decision | null>(null);
  const [pending, setPending] = useState(false);
  const active = useRef<Decision | null>(null);
  const inFlight = useRef(false);
  const acceptMutation = useAcceptIntakeRequest();
  const updateMutation = useUpdateIntakeRequest();

  useLayoutEffect(() => {
    active.current = decision;
    return () => { active.current = null; };
  }, [decision]);

  const openDecision = useCallback((requestId: number, action: DecisionAction) => {
    if (!enabled || pending) return;
    setDecision({ requestId, action });
  }, [enabled, pending]);
  const onAccept = useCallback((id: number) => openDecision(id, "accept"), [openDecision]);
  const onDecline = useCallback((id: number) => openDecision(id, "decline"), [openDecision]);
  const onDuplicate = useCallback((id: number) => openDecision(id, "duplicate"), [openDecision]);
  const onOpenChange = useCallback((open: boolean) => {
    if (open || inFlight.current) return;
    active.current = null;
    setDecision(null);
  }, []);

  const onSubmit = useCallback((data: IntakeDecisionForm) => {
    const submitted = active.current;
    if (!enabled || !submitted || submitted.action !== data.action || inFlight.current) return;
    inFlight.current = true;
    setPending(true);
    const onError = (error: Error) => {
      if (active.current !== submitted) return;
      inFlight.current = false;
      setPending(false);
      toast.error(getErrorMessage(error));
    };
    const onSuccess = (result: IntakeRequest) => {
      if (active.current !== submitted) return;
      const expectedStatus = data.action === "accept" ? "accepted" : data.action === "decline" ? "declined" : "duplicate";
      if (result.id !== submitted.requestId || result.projectId !== projectId || result.orgId !== orgId || result.status !== expectedStatus ||
        (data.action === "duplicate" && result.linkedWorkItemId !== data.linkedWorkItemId)) {
        onError(new Error("The decision response did not match this request. Please retry."));
        return;
      }
      active.current = null;
      inFlight.current = false;
      setPending(false);
      setDecision(null);
      if (submitted.action === "accept" && result.linkedWorkItemId) {
        const ticketId = result.linkedWorkItemId;
        toast.success("Item accepted — ticket created", {
          action: { label: "View ticket", onClick: () => {
            window.open(`/build/${projectId}/tickets/${ticketId}`, "_blank");
          } },
        });
      } else {
        toast.success(submitted.action === "accept" ? "Item accepted and work item created"
          : submitted.action === "decline" ? "Item declined" : "Item marked as duplicate");
      }
    };
    const target = { intakeRequestId: submitted.requestId, projectId };
    if (data.action === "accept") {
      acceptMutation.mutate({ ...target, status: "accepted", state: data.state,
        assigneeId: data.assigneeId, cycleId: data.cycleId, moduleId: data.moduleId }, { onSuccess, onError });
    } else {
      updateMutation.mutate(data.action === "decline"
        ? { ...target, status: "declined", declineReason: data.reason }
        : { ...target, status: "duplicate", linkedWorkItemId: data.linkedWorkItemId }, { onSuccess, onError });
    }
  }, [enabled, projectId, orgId, acceptMutation, updateMutation]);

  return (
    <>
      {children({ onAccept, onDecline, onDuplicate })}
      {decision && (
        <DecisionFormDialog
          key={`${decision.requestId}:${decision.action}`}
          open onOpenChange={onOpenChange} title={TITLES[decision.action]}
          description={decision.action === "duplicate" ? "Select the existing ticket this request duplicates." : "Review this request before submitting your decision."}
          resolver={zodResolver(intakeDecisionSchema)}
          defaultValues={decision.action === "accept" ? { action: "accept", state: "" }
            : decision.action === "decline" ? { action: "decline", reason: "" } : { action: "duplicate" }}
          onSubmit={onSubmit} isSubmitting={pending} submitLabel={SUBMIT_LABELS[decision.action]}
        >
          {() => <DecisionFields projectId={projectId} action={decision.action} pending={pending} />}
        </DecisionFormDialog>
      )}
    </>
  );
}

function DecisionFields({ projectId, action, pending }: { projectId: number; action: DecisionAction; pending: boolean }) {
  const form = useFormContext<IntakeDecisionForm>();
  const { data: membersPage } = useProjectMembers(projectId);
  const { data: cycles } = useCycles(projectId);
  const { data: modules } = useModules(projectId);
  const { data: project } = useProject(projectId);
  useRegisterDirtyState(form.formState.isDirty);
  function idFieldChange(onChange: (value: number | undefined) => void) {
    return function handleIdFieldChange(value: string) {
      if (!pending) onChange(numericFieldValue(value));
    };
  }
  function reasonFieldChange(onChange: (event: ChangeEvent<HTMLTextAreaElement>) => void) {
    return function handleReasonFieldChange(event: ChangeEvent<HTMLTextAreaElement>) {
      if (!pending) onChange(event);
    };
  }
  return (
    <fieldset disabled={pending} className="space-y-4">
      {action === "accept" ? (
        <>
          <Label htmlFor="intake-state">State</Label>
          <Controller control={form.control} name="state" render={({ field, fieldState }) => (
            <>
              <Select value={field.value ?? ""} onValueChange={(value) => { if (!pending) field.onChange(value); }} disabled={pending}>
                <SelectTrigger id="intake-state"><SelectValue placeholder="Select state..." /></SelectTrigger>
                <SelectContent>{WORK_STATES.map((state) => <SelectItem key={state} value={state}>{state.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())}</SelectItem>)}</SelectContent>
              </Select>
              {fieldState.error && <p className="text-xs text-destructive" role="alert">{fieldState.error.message}</p>}
            </>
          )} />
          <Label htmlFor="intake-assignee">Assignee</Label>
          <Controller control={form.control} name="assigneeId" render={({ field }) => (
            <Select value={field.value ?? ""} onValueChange={(value) => { if (!pending) field.onChange(value || undefined); }} disabled={pending}>
              <SelectTrigger id="intake-assignee"><SelectValue placeholder="Select assignee..." /></SelectTrigger>
              <SelectContent>{membersPage?.data.map((member) => <SelectItem key={member.id} value={member.id}>{getUserDisplayName(member)}</SelectItem>)}</SelectContent>
            </Select>
          )} />
          <Label htmlFor="intake-cycle">Cycle</Label>
          <Controller control={form.control} name="cycleId" render={({ field }) => (
            <Select value={field.value?.toString() ?? ""} onValueChange={idFieldChange(field.onChange)} disabled={pending}>
              <SelectTrigger id="intake-cycle"><SelectValue placeholder="Select cycle..." /></SelectTrigger>
              <SelectContent>{cycles?.map((cycle) => <SelectItem key={cycle.id} value={String(cycle.id)}>{cycle.name}</SelectItem>)}</SelectContent>
            </Select>
          )} />
          <Label htmlFor="intake-module">Workstream</Label>
          <Controller control={form.control} name="moduleId" render={({ field }) => (
            <Select value={field.value?.toString() ?? ""} onValueChange={idFieldChange(field.onChange)} disabled={pending}>
              <SelectTrigger id="intake-module"><SelectValue placeholder="Select module..." /></SelectTrigger>
              <SelectContent>{modules?.map((module) => <SelectItem key={module.id} value={String(module.id)}>{module.name}</SelectItem>)}</SelectContent>
            </Select>
          )} />
        </>
      ) : action === "decline" ? (
        <>
          <Label htmlFor="decline-reason">Reason</Label>
          <Controller control={form.control} name="reason" render={({ field, fieldState }) => (
            <>
              <Textarea id="decline-reason" placeholder="Why is this being declined?" {...field} value={field.value ?? ""}
                onChange={reasonFieldChange(field.onChange)} />
              {fieldState.error && <p className="text-xs text-destructive" role="alert">{fieldState.error.message}</p>}
            </>
          )} />
        </>
      ) : (
        <>
          <Label>Existing Ticket</Label>
          <Controller control={form.control} name="linkedWorkItemId" render={({ field, fieldState }) => (
            <>
              <TicketCombobox projectId={projectId} projectKey={project?.key ?? ""}
                value={field.value?.toString() ?? ""} onChange={idFieldChange(field.onChange)} disabled={pending} />
              {fieldState.error && <p className="text-xs text-destructive" role="alert">Select a valid existing ticket.</p>}
            </>
          )} />
        </>
      )}
    </fieldset>
  );
}
