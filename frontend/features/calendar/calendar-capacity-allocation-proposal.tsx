"use client";

import { useState, useId } from "react";
import { format } from "date-fns";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { LoadingButton } from "@/components/ui/loading-button";
import { getErrorMessage } from "@/lib/get-error-message";
import {
  useCreateCalendarSourceActionProposal,
  useConfirmCalendarSourceActionProposal,
  useCalendarSourceActionProposal,
} from "@/hooks/api/calendar-source-actions";
import type { CalendarCapacityAllocationItem } from "@/hooks/api/calendar-capacity-schema";

const RESOURCE_STATE_LABEL: Record<string, string> = {
  committed: "Confirmed by owner",
  pending: "Awaiting owner approval",
  rejected: "Refused by owner",
};

function ResourceReceipts({ receipt }: { receipt: Record<string, unknown> | null | undefined }) {
  const decisions = Array.isArray(receipt?.["decisions"]) ? receipt["decisions"] : [];
  const rows = decisions.flatMap((item: unknown) =>
    item && typeof item === "object" && "resourceId" in item && "state" in item
      ? [{ resourceId: String(item.resourceId), state: String(item.state) }]
      : [],
  );
  if (rows.length === 0) return null;
  return (
    <ul className="space-y-1">
      {rows.map((row) => (
        <li key={row.resourceId} className="text-xs text-muted-foreground">
          Resource {row.resourceId}: {RESOURCE_STATE_LABEL[row.state] ?? row.state}
        </li>
      ))}
    </ul>
  );
}

interface Props {
  allocation: CalendarCapacityAllocationItem;
  onDone: () => void;
}

export function CalendarCapacityAllocationProposal({ allocation, onDone }: Props) {
  const startId = useId();
  const endId = useId();
  const [newStart, setNewStart] = useState(() => format(new Date(allocation.start), "yyyy-MM-dd'T'HH:mm"));
  const [newEnd, setNewEnd] = useState(() => format(new Date(allocation.end), "yyyy-MM-dd'T'HH:mm"));
  const [proposalId, setProposalId] = useState<string | null>(null);
  const create = useCreateCalendarSourceActionProposal();
  const confirm = useConfirmCalendarSourceActionProposal();
  const proposal = useCalendarSourceActionProposal(proposalId);
  const step = proposal.data?.steps[0] ?? null;

  const handlePropose = () => {
    const startIso = new Date(newStart).toISOString();
    const endIso = new Date(newEnd).toISOString();
    if (!startIso || !endIso || new Date(endIso) <= new Date(startIso)) return;
    create.mutate(
      {
        idempotencyKey: `alloc-reschedule-${allocation.id}-${Date.now()}`,
        expiresInSeconds: 300,
        steps: [{
          sourceKey: "calendar-booking",
          sourceRecordId: allocation.bookingId,
          entityType: "booking",
          sourceActionId: "reschedule",
          expectedSourceVersion: allocation.bookingLifecycleVersion,
          intendedEffect: "Reschedule booking",
          input: { newStart: startIso, newEnd: endIso },
        }],
      },
      { onSuccess: (p) => setProposalId(p.id) },
    );
  };

  const handleConfirm = () => {
    if (!proposal.data || !step) return;
    confirm.mutate(
      {
        proposalId: proposal.data.id,
        expectedVersion: proposal.data.version,
        decisions: [{ stepId: step.id, decision: "CONFIRM" }],
      },
      { onSuccess: () => onDone() },
    );
  };

  if (proposal.data?.status === "COMPLETED") {
    const receipt = step?.sourceReceipt;
    return (
      <div className="space-y-2 rounded-md border p-3">
        <p className="text-sm font-medium text-status-success-ink">Rescheduled</p>
        {receipt && typeof receipt["newStart"] === "string" ? (
          <p className="text-xs text-muted-foreground">
            New window: {new Date(receipt["newStart"]).toLocaleString()} – {new Date(String(receipt["newEnd"] ?? "")).toLocaleString()}
          </p>
        ) : null}
        <ResourceReceipts receipt={receipt} />
        <Button variant="outline" size="sm" onClick={onDone}>Done</Button>
      </div>
    );
  }

  if (step && step.status !== "PENDING") {
    return (
      <div className="space-y-2 rounded-md border p-3">
        <p className="text-sm font-medium">
          {step.status === "COMMITTED" ? "Committed" : step.status === "DECLINED" ? "Declined" : "Processing"}
        </p>
        {step.outcomeMessage ? <p className="text-xs text-muted-foreground">{step.outcomeMessage}</p> : null}
        <ResourceReceipts receipt={step.sourceReceipt} />
        <Button variant="outline" size="sm" onClick={onDone}>Done</Button>
      </div>
    );
  }

  if (step?.impactPreview) {
    const impact = step.impactPreview;
    return (
      <div className="space-y-3 rounded-md border p-3">
        <p className="text-sm font-medium">{impact.title}</p>
        <p className="text-xs text-muted-foreground">{impact.summary}</p>
        {impact.warnings.length > 0 ? (
          <p className="text-xs text-status-warning-ink">{impact.warnings.join(" · ")}</p>
        ) : null}
        {impact.changes.map((change) => (
          <p key={change.field} className="text-xs text-muted-foreground">
            {change.field}: {change.before ?? "—"} → {change.after ?? "—"}
          </p>
        ))}
        {confirm.error ? <p className="text-xs text-destructive">{getErrorMessage(confirm.error)}</p> : null}
        <div className="flex gap-2">
          <LoadingButton isPending={confirm.isPending} size="sm" onClick={handleConfirm}>Confirm reschedule</LoadingButton>
          <Button variant="outline" size="sm" onClick={() => { setProposalId(null); create.reset(); }}>Cancel</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3 rounded-md border p-3">
      <p className="text-sm font-medium">Propose reschedule</p>
      <div className="grid grid-cols-2 gap-2">
        <div className="space-y-1">
          <Label htmlFor={startId} className="text-xs">New start</Label>
          <Input id={startId} type="datetime-local" value={newStart} onChange={(e) => setNewStart(e.target.value)} className="h-9 text-sm" />
        </div>
        <div className="space-y-1">
          <Label htmlFor={endId} className="text-xs">New end</Label>
          <Input id={endId} type="datetime-local" value={newEnd} onChange={(e) => setNewEnd(e.target.value)} className="h-9 text-sm" />
        </div>
      </div>
      {create.error ? <p className="text-xs text-destructive">{getErrorMessage(create.error)}</p> : null}
      <div className="flex gap-2">
        <LoadingButton isPending={create.isPending} size="sm" onClick={handlePropose}>Preview</LoadingButton>
        <Button variant="outline" size="sm" onClick={onDone}>Cancel</Button>
      </div>
    </div>
  );
}
