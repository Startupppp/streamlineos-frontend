"use client";

import { useEffect, useMemo, useState } from "react";
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
import {
  actionConfig,
  inputValue,
  sourceValue,
} from "./calendar-source-action-fields";

const repairLabels: Record<CalendarSourceActionRepair, string> = {
  retry: "Retry with owner",
  compensate: "Restore previous value",
  accept_partial: "Accept partial result",
  manual_review: "Mark for manual review",
};

export function CalendarSourceActionPanel({
  event,
}: {
  event: CalendarListItem;
}) {
  const config = useMemo(() => actionConfig(event), [event]);
  const [value, setValue] = useState(() =>
    config ? inputValue(event, config) : "",
  );
  const [proposal, setProposal] = useState<CalendarSourceActionProposal | null>(
    null,
  );
  const capabilities = useCalendarSourceActionCapabilities();
  const createProposal = useCreateCalendarSourceActionProposal();
  const confirmProposal = useConfirmCalendarSourceActionProposal();
  const repairStep = useRepairCalendarSourceActionStep();

  useEffect(() => {
    setProposal(null);
    setValue(config ? inputValue(event, config) : "");
  }, [config, event, event.id, event.sourceVersion]);

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

      {!proposal ? (
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
              onChange={(change) => setValue(change.target.value)}
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
