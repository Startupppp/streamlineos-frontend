"use client";

import { useMemo, useState } from "react";
import { format } from "date-fns";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import type { CalendarListItem } from "@/hooks/api/calendar";
import {
  useCalendarSourceActionCapabilities,
  useConfirmCalendarSourceActionProposal,
  useCreateCalendarSourceActionProposal,
  useRepairCalendarSourceActionStep,
} from "@/hooks/api/calendar-source-actions";
import type {
  CalendarSourceActionProposal,
  CalendarSourceActionRepair,
} from "@/hooks/api/calendar-source-actions-schema";
import { getErrorMessage } from "@/lib/get-error-message";
import { toast } from "sonner";
import { useApplyCalendarScenario, usePreviewCalendarScenario } from "@/hooks/api/calendar-scenarios";
import type { CalendarScenarioPreview } from "@/hooks/api/calendar-scenario-schema";
import type { CommitmentReference } from "@/hooks/api/calendar-commitment-schema";
import {
  actionConfig,
  inputValue,
  sourceValue,
} from "./calendar-source-action-fields";
import type { CalendarScenarioDraftStep } from "./calendar-scenario-draft";

const repairLabels: Record<CalendarSourceActionRepair, string> = {
  retry: "Retry with owner",
  compensate: "Restore previous value",
  accept_partial: "Accept partial result",
  manual_review: "Mark for manual review",
};

function scenarioRoot(event: CalendarListItem): CommitmentReference | null {
  const source = event.sourceKey === "build" ? "build" :
    event.sourceKey === "tasks" ? "tasks" :
      ["crm", "crm-deals"].includes(event.sourceKey) ? "crm" :
        ["finance", "accounting", "accounting-receivables"].includes(event.sourceKey) ? "finance" :
          ["inventory", "inventory-purchase-orders"].includes(event.sourceKey) ? "inventory" :
            event.sourceKey === "hr-interviews" ? "hr" : null;
  if (!source || !event.entityType) return null;
  const type = source === "inventory" && event.entityType === "purchase-order" ? "purchase_order" : event.entityType;
  return { source, type, recordId: event.sourceRecordId };
}

export function CalendarSourceActionPanel({
  event,
  onQueueScenarioStep,
}: {
  event: CalendarListItem;
  onQueueScenarioStep?: (draft: CalendarScenarioDraftStep) => void;
}) {
  const config = useMemo(() => actionConfig(event), [event]);
  const [value, setValue] = useState(() =>
    config ? inputValue(event, config) : "",
  );
  const [proposal, setProposal] = useState<CalendarSourceActionProposal | null>(
    null,
  );
  const [scenario, setScenario] = useState<CalendarScenarioPreview | null>(null);
  const previewScenarioMutation = usePreviewCalendarScenario();
  const applyScenarioMutation = useApplyCalendarScenario();
  const root = scenarioRoot(event);
  const capabilities = useCalendarSourceActionCapabilities();
  const createProposal = useCreateCalendarSourceActionProposal();
  const confirmProposal = useConfirmCalendarSourceActionProposal();
  const repairStep = useRepairCalendarSourceActionStep();

  const supported = Boolean(
    config &&
    event.actions.edit &&
    event.sourceVersion &&
    event.entityType &&
    capabilities.data?.sourceKeys.includes(event.sourceKey),
  );
  if (!supported || !config || !event.sourceVersion || !event.entityType)
    return null;

  const step = proposal?.steps[0] ?? null;
  const pending =
    createProposal.isPending ||
    previewScenarioMutation.isPending ||
    applyScenarioMutation.isPending ||
    confirmProposal.isPending ||
    repairStep.isPending;

  async function preview() {
    if (!value || !config) return;
    try {
      const next = await createProposal.mutateAsync({
        idempotencyKey: `calendar-source-${crypto.randomUUID()}`,
        expiresInSeconds: 900,
        steps: [
          {
            sourceKey: event.sourceKey,
            sourceRecordId: event.sourceRecordId,
            entityType: event.entityType ?? "",
            sourceActionId: "reschedule",
            expectedSourceVersion: event.sourceVersion ?? "",
            intendedEffect: `Reschedule ${event.title}`,
            input: { [config.field]: sourceValue(value, config) },
          },
        ],
      });
      setProposal(next);
    } catch (error) {
      toast.error(getErrorMessage(error));
    }
  }

  async function previewScenario() {
    if (!value || !config || !root || !event.sourceVersion || !event.entityType) return;
    try {
      const next = await previewScenarioMutation.mutateAsync({
        root,
        steps: [{
          sourceKey: event.sourceKey,
          sourceRecordId: event.sourceRecordId,
          entityType: event.entityType,
          sourceActionId: "reschedule",
          expectedSourceVersion: event.sourceVersion,
          intendedEffect: `Reschedule ${event.title}`,
          input: { [config.field]: sourceValue(value, config) },
        }],
      });
      setScenario(next);
    } catch (error) {
      toast.error(getErrorMessage(error));
    }
  }

  function queueScenarioStep() {
    if (!value || !config || !root || !event.sourceVersion || !event.entityType || !onQueueScenarioStep) return;
    onQueueScenarioStep({
      root,
      label: event.title,
      step: {
        sourceKey: event.sourceKey,
        sourceRecordId: event.sourceRecordId,
        entityType: event.entityType,
        sourceActionId: "reschedule",
        expectedSourceVersion: event.sourceVersion,
        intendedEffect: `Reschedule ${event.title}`,
        input: { [config.field]: sourceValue(value, config) },
      },
    });
  }

  async function applyScenario() {
    if (!scenario) return;
    try {
      const next = await applyScenarioMutation.mutateAsync({
        token: scenario.token,
        selected: [0],
        idempotencyKey: `calendar-scenario-${crypto.randomUUID()}`,
      });
      setProposal(next);
      setScenario(null);
      toast.success("Source owner processed the scenario");
    } catch (error) {
      toast.error(getErrorMessage(error));
    }
  }

  async function decide(decision: "CONFIRM" | "DECLINE") {
    if (!proposal || !step) return;
    try {
      const next = await confirmProposal.mutateAsync({
        proposalId: proposal.id,
        expectedVersion: proposal.version,
        decisions: [{ stepId: step.id, decision }],
      });
      setProposal(next);
      toast.success(
        decision === "CONFIRM"
          ? "Source owner processed the change"
          : "Change declined",
      );
    } catch (error) {
      toast.error(getErrorMessage(error));
    }
  }

  async function repair(action: CalendarSourceActionRepair) {
    if (!proposal || !step) return;
    try {
      const next = await repairStep.mutateAsync({
        proposalId: proposal.id,
        stepId: step.id,
        expectedStepVersion: step.version,
        action,
      });
      setProposal(next);
      toast.success("Repair request processed");
    } catch (error) {
      toast.error(getErrorMessage(error));
    }
  }

  return (
    <div className="border-t px-5 py-4 space-y-3">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-xs font-semibold">Source-owned change</p>
          <p className="text-micro text-muted-foreground">
            The owning module rechecks access and version before applying.
          </p>
        </div>
        {proposal ? (
          <Badge variant="outline">{proposal.status.toLowerCase()}</Badge>
        ) : null}
      </div>

      {scenario ? <div className="space-y-3 rounded-md border p-3">
        <p className="text-xs font-semibold">What-if preview · no changes made</p>
        <p className="text-xs text-muted-foreground">Current commitment: {scenario.before.risk.replaceAll("_", " ")}. Projected outcome: {scenario.after.risk.replaceAll("_", " ")} ({scenario.confidence} confidence).</p>
        {scenario.affected.commitments.length > 0 ? <p className="text-xs text-muted-foreground">Visible commitments in this chain: {scenario.affected.commitments.join(", ")}</p> : null}
        {scenario.affected.people.length > 0 ? <p className="text-xs text-muted-foreground">Visible owners: {scenario.affected.people.join(", ")}</p> : null}
        {scenario.scheduleChanges.map((change) => <p key={`${change.index}:${change.field}`} className="text-xs text-muted-foreground">{change.title} · {change.field}: {change.direction}{change.deltaMinutes === null ? "" : ` by ${Math.abs(change.deltaMinutes)} minutes`}</p>)}
        {scenario.impacts.map((impact) => <div key={impact.index} className="space-y-1"><p className="text-sm font-medium">{impact.title}</p><p className="text-xs">{impact.summary}</p>{impact.changes.map((change) => <p key={change.field} className="text-xs text-muted-foreground">{change.field}: {change.before ?? "Not set"} → {change.after ?? "Not set"}</p>)}{impact.warnings.map((warning) => <p key={warning} className="text-xs text-status-warning-foreground">{warning}</p>)}</div>)}
        <p className="text-xs text-muted-foreground">Expires {format(new Date(scenario.expiresAt), "PPp")}. Applying rechecks graph, permission, source version, and owner policy.</p>
        <div className="flex justify-end gap-2"><Button size="sm" variant="ghost" disabled={pending} onClick={() => setScenario(null)}>Discard</Button><Button size="sm" disabled={pending} onClick={() => { void applyScenario(); }}>Apply selected change</Button></div>
      </div> : !proposal ? (
        <div className="space-y-2">
          <label
            className="text-xs font-medium"
            htmlFor={`source-action-${event.id}`}
          >
            {config.label}
          </label>
          <div className="flex gap-2">
            <Input
              id={`source-action-${event.id}`}
              type={config.inputType}
              value={value}
              onChange={(change) => { setValue(change.target.value); setScenario(null); }}
              className="h-8 text-xs"
            />
            <Button
              size="sm"
              variant="outline"
              disabled={!value || pending}
              onClick={preview}
            >
              Preview
            </Button>
            {root ? <Button size="sm" variant="outline" disabled={!value || pending} onClick={() => { void previewScenario(); }}>What if</Button> : null}
            {root && onQueueScenarioStep ? <Button size="sm" variant="outline" disabled={!value || pending} onClick={queueScenarioStep}>Add to scenario</Button> : null}
          </div>
        </div>
      ) : step ? (
        <div className="space-y-3">
          <div className="rounded-md border bg-muted/30 p-3 space-y-2">
            <p className="text-xs font-medium">{step.impactPreview.summary}</p>
            {step.impactPreview.changes.map((change) => (
              <div
                key={change.field}
                className="grid grid-cols-[1fr_auto_1fr] items-center gap-2 text-micro text-muted-foreground"
              >
                <span className="truncate">{change.before ?? "Not set"}</span>
                <span aria-hidden>→</span>
                <span className="truncate text-foreground">
                  {change.after ?? "Not set"}
                </span>
              </div>
            ))}
            {step.impactPreview.warnings.map((warning) => (
              <p
                key={warning}
                className="text-micro text-status-warning-foreground"
              >
                {warning}
              </p>
            ))}
            <p className="text-micro text-muted-foreground">
              Expires {format(new Date(proposal.expiresAt), "PPp")}
            </p>
          </div>

          {step.outcomeMessage ? (
            <div className="rounded-md border px-3 py-2">
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-medium">
                  {step.status.toLowerCase()}
                </span>
                {step.outcomeCode ? (
                  <Badge variant="outline">{step.outcomeCode}</Badge>
                ) : null}
              </div>
              <p className="mt-1 text-micro text-muted-foreground">
                {step.outcomeMessage}
              </p>
            </div>
          ) : null}

          {proposal.status === "PROPOSED" ? (
            <div className="flex justify-end gap-2">
              <Button
                size="sm"
                variant="ghost"
                disabled={pending}
                onClick={() => void decide("DECLINE")}
              >
                Decline
              </Button>
              <Button
                size="sm"
                disabled={pending}
                onClick={() => void decide("CONFIRM")}
              >
                Confirm and apply
              </Button>
            </div>
          ) : null}

          {step.repairOptions.length > 0 ? (
            <div className="flex flex-wrap justify-end gap-2">
              {step.repairOptions.map((action) => (
                <Button
                  key={action}
                  size="sm"
                  variant="outline"
                  disabled={pending}
                  onClick={() => void repair(action)}
                >
                  {repairLabels[action]}
                </Button>
              ))}
            </div>
          ) : null}

          {proposal.status !== "PROPOSED" && step.repairOptions.length === 0 ? (
            <div className="flex justify-end">
              <Button
                size="sm"
                variant="ghost"
                onClick={() => setProposal(null)}
              >
                Preview another change
              </Button>
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
