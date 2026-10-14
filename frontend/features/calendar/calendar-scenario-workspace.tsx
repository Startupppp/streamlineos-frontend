"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { getErrorMessage } from "@/lib/get-error-message";
import { useApplyCalendarScenario, usePreviewCalendarScenario } from "@/hooks/api/calendar-scenarios";
import { useRepairCalendarSourceActionStep } from "@/hooks/api/calendar-source-actions";
import type { CalendarScenarioPreview } from "@/hooks/api/calendar-scenario-schema";
import type { CalendarSourceActionProposal } from "@/hooks/api/calendar-source-actions-schema";
import type { CalendarScenarioDraftStep } from "./calendar-scenario-draft";

export function CalendarScenarioWorkspace({ drafts, onRemove, onClear, onClose }: {
  drafts: CalendarScenarioDraftStep[];
  onRemove: (index: number) => void;
  onClear: () => void;
  onClose: () => void;
}) {
  const [selected, setSelected] = useState<number[]>(() => drafts.map((_, index) => index));
  const [preview, setPreview] = useState<CalendarScenarioPreview | null>(null);
  const [proposal, setProposal] = useState<CalendarSourceActionProposal | null>(null);
  const [error, setError] = useState("");
  const [nowMs, setNowMs] = useState(0);
  useEffect(() => {
    const update = () => setNowMs(Date.now());
    update();
    const timer = window.setInterval(update, 1000);
    return () => window.clearInterval(timer);
  }, []);
  const previewMutation = usePreviewCalendarScenario();
  const applyMutation = useApplyCalendarScenario();
  const repairMutation = useRepairCalendarSourceActionStep();

  const pending = previewMutation.isPending || applyMutation.isPending || repairMutation.isPending;
  const root = drafts[0]?.root;

  async function previewChanges() {
    if (!root || drafts.length === 0) return;
    setError("");
    try {
      const next = await previewMutation.mutateAsync({ root, steps: drafts.map((draft) => draft.step) });
      setPreview(next);
      setProposal(null);
    } catch (reason) {
      setError(getErrorMessage(reason));
      setPreview(null);
    }
  }

  async function applyChanges() {
    if (!preview || selected.length === 0 || new Date(preview.expiresAt).getTime() <= Date.now()) return;
    setError("");
    try {
      const next = await applyMutation.mutateAsync({
        token: preview.token,
        selected,
        idempotencyKey: `calendar-scenario-${crypto.randomUUID()}`,
      });
      setProposal(next);
      setPreview(null);
    } catch (reason) {
      setError(getErrorMessage(reason));
      setPreview(null);
    }
  }

  async function repair(stepId: string, expectedStepVersion: number, action: "retry" | "compensate" | "accept_partial" | "manual_review") {
    if (!proposal) return;
    setError("");
    try {
      const next = await repairMutation.mutateAsync({ proposalId: proposal.id, stepId, expectedStepVersion, action });
      setProposal(next);
    } catch (reason) {
      setError(getErrorMessage(reason));
    }
  }

  function removeDraft(index: number) {
    setPreview(null);
    setProposal(null);
    setSelected((current) => current.filter((value) => value !== index).map((value) => value > index ? value - 1 : value));
    onRemove(index);
  }

  function clearDrafts() {
    setPreview(null);
    setProposal(null);
    setSelected([]);
    onClear();
  }

  return <Sheet open onOpenChange={(open) => { if (!open) onClose(); }}>
    <SheetContent className="flex w-full flex-col p-0 sm:max-w-xl">
      <SheetHeader className="border-b px-5 py-4"><SheetTitle>What-if scenario</SheetTitle></SheetHeader>
      <ScrollArea className="min-h-0 flex-1"><div className="space-y-4 px-5 py-4">
        <p className="text-sm text-muted-foreground">Build a scenario from source-owned changes in one visible commitment chain. Preview does not change source records.</p>
        {drafts.map((draft, index) => <div key={`${draft.step.sourceKey}:${draft.step.entityType}:${draft.step.sourceRecordId}`} className="flex items-start gap-3 rounded-md border p-3">
          <Checkbox aria-label={`Apply ${draft.label}`} checked={selected.includes(index)} disabled={Boolean(proposal) || pending} onCheckedChange={(checked) => setSelected((current) => checked === true ? [...current, index].sort((a, b) => a - b) : current.filter((value) => value !== index))} />
          <div className="min-w-0 flex-1"><p className="text-sm font-medium">{draft.label}</p><p className="text-xs text-muted-foreground">{draft.step.intendedEffect}</p></div>
          <Button size="sm" variant="ghost" disabled={pending} onClick={() => removeDraft(index)}>Remove</Button>
        </div>)}
        {error ? <p role="alert" className="text-sm text-destructive">{error}</p> : null}
        {preview ? <div className="space-y-3 rounded-md border p-3">
          <p className="text-sm font-medium">Preview · no changes made</p>
          <p className="text-xs text-muted-foreground">Current chain: {preview.before.risk.replaceAll("_", " ")}. Projected chain: {preview.after.risk.replaceAll("_", " ")}. Confidence: {preview.confidence}. Unknown results require source-owner confirmation.</p>
          {preview.affected.commitments.length ? <p className="text-xs text-muted-foreground">Visible commitments: {preview.affected.commitments.join(", ")}</p> : null}
          {preview.affected.people.length ? <p className="text-xs text-muted-foreground">Visible owners: {preview.affected.people.join(", ")}</p> : null}
          {preview.affected.resources.length ? <p className="text-xs text-muted-foreground">Known resources: {preview.affected.resources.join(", ")}</p> : null}
          {preview.affected.customers.length ? <p className="text-xs text-muted-foreground">Known customers: {preview.affected.customers.join(", ")}</p> : null}
          <p className="text-xs text-muted-foreground">Other resource and customer effects may be unknown.</p>
          {preview.scheduleChanges.map((change) => <p key={`${change.index}:${change.field}`} className="text-xs text-muted-foreground">{change.title} · {change.field}: {change.direction}{change.deltaMinutes === null ? "" : ` by ${Math.abs(change.deltaMinutes)} minutes`}</p>)}
          {preview.impacts.map((impact) => <div key={impact.index} className="space-y-1 border-t pt-2"><p className="text-sm font-medium">{impact.title}</p><p className="text-xs">{impact.summary}</p>{impact.changes.map((change) => <p key={change.field} className="text-xs text-muted-foreground">{change.field}: {change.before ?? "Not set"} → {change.after ?? "Not set"}</p>)}{impact.warnings.map((warning) => <p key={warning} className="text-xs text-status-warning-foreground">{warning}</p>)}</div>)}
          <p className="text-xs text-muted-foreground">Expires {new Date(preview.expiresAt).toLocaleString()}. Apply rechecks versions, policy, graph, and owner access.</p>
        </div> : null}
        {proposal ? <div className="space-y-3 rounded-md border p-3"><p className="text-sm font-medium">Owner outcomes · {proposal.status.toLowerCase()}</p>{proposal.steps.map((step) => <div key={step.id} className="space-y-1 border-t pt-2"><p className="text-sm">{step.intendedEffect}: {step.status.toLowerCase()}</p>{step.outcomeMessage ? <p className="text-xs text-muted-foreground">{step.outcomeMessage}</p> : null}{step.repairOptions.length ? <div className="flex flex-wrap gap-2">{step.repairOptions.map((action) => <Button key={action} size="sm" variant="outline" disabled={pending} onClick={() => { void repair(step.id, step.version, action); }}>{action.replaceAll("_", " ")}</Button>)}</div> : null}</div>)}</div> : null}
        <div className="flex flex-wrap justify-end gap-2"><Button variant="ghost" disabled={pending} onClick={clearDrafts}>Clear</Button><Button variant="outline" disabled={pending || drafts.length === 0} onClick={() => { void previewChanges(); }}>Preview all changes</Button><Button disabled={pending || !preview || selected.length === 0 || nowMs === 0 || new Date(preview.expiresAt).getTime() <= nowMs} onClick={() => { void applyChanges(); }}>Apply selected changes</Button></div>
      </div></ScrollArea>
    </SheetContent>
  </Sheet>;
}
