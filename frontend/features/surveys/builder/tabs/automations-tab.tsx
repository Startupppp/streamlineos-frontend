"use client";

import { useState } from "react";
import { Plus, Trash2, Zap } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { EmptyState } from "@/components/ui/empty-state";
import { Skeleton } from "@/components/ui/skeleton";
import { getApiError } from "@/lib/api-client";
import type { SurveyForm } from "@/hooks/api/surveys/forms";
import {
  useSurveyAutomations,
  useCreateAutomation,
  useDeleteAutomation,
  type AutomationEventType,
  type AutomationActionType,
} from "@/hooks/api/surveys/automations";

const EVENT_LABELS: Record<AutomationEventType, string> = {
  "survey.published": "Survey published",
  "survey.response.started": "Response started",
  "survey.response.submitted": "Response submitted",
  "survey.assessment.passed": "Assessment passed",
  "survey.assessment.failed": "Assessment failed",
  "survey.live.started": "Live session started",
  "survey.live.ended": "Live session ended",
  "survey.lead.created": "Lead created",
  "survey.collector.completed_quota": "Collector reached quota",
};

const ACTION_LABELS: Record<AutomationActionType, string> = {
  create_lead: "Create CRM lead",
  update_lead: "Update matching CRM lead",
  notify_owner: "Notify survey owner",
  webhook: "Trigger webhook",
};

const SCORE_AWARE_ACTIONS = new Set<AutomationActionType>(["create_lead", "update_lead", "notify_owner"]);

export function AutomationsTab({ survey }: { survey: SurveyForm }) {
  const { data: rules, isLoading } = useSurveyAutomations(survey.id);
  const createRule = useCreateAutomation(survey.id);
  const deleteRule = useDeleteAutomation(survey.id);

  const [adding, setAdding] = useState(false);
  const [eventType, setEventType] = useState<AutomationEventType>("survey.response.submitted");
  const [actionType, setActionType] = useState<AutomationActionType>("create_lead");
  const [scoreThreshold, setScoreThreshold] = useState("");
  const [createFollowUpTask, setCreateFollowUpTask] = useState(false);

  async function handleAdd() {
    try {
      await createRule.mutateAsync({
        eventType,
        action: {
          type: actionType,
          scoreThreshold: scoreThreshold ? Number(scoreThreshold) : undefined,
          config: actionType === "create_lead" ? { createFollowUpTask } : undefined,
        },
      });
      setAdding(false);
      setScoreThreshold("");
      setCreateFollowUpTask(false);
    } catch (error) {
      toast.error(getApiError(error));
    }
  }

  async function handleDelete(automationId: string) {
    try {
      await deleteRule.mutateAsync(automationId);
    } catch (error) {
      toast.error(getApiError(error));
    }
  }

  if (isLoading) return <Skeleton className="h-40 w-full" />;

  return (
    <div className="space-y-4">
      {!rules?.length && !adding && (
        <EmptyState
          illustration={<Zap className="h-10 w-10 text-muted-foreground/40" />}
          title="No automations yet"
          description="Route leads to CRM, notify the survey owner, or trigger a webhook based on responses."
          compact
        />
      )}

      {rules?.map((rule) => (
        <div key={rule.id} className="flex items-center gap-2 rounded-md border border-border px-3 py-2 text-sm">
          <span className="flex-1">
            When <span className="font-medium">{EVENT_LABELS[rule.eventType]}</span>
            {rule.action.scoreThreshold != null && <> and score ≥ {rule.action.scoreThreshold}</>} →{" "}
            <span className="font-medium">{ACTION_LABELS[rule.action.type]}</span>
            {rule.action.type === "create_lead" && Boolean(rule.action.config?.createFollowUpTask) && (
              <span className="text-muted-foreground"> + follow-up task</span>
            )}
          </span>
          <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0" onClick={() => handleDelete(rule.id)}>
            <Trash2 className="h-3.5 w-3.5 text-destructive" />
          </Button>
        </div>
      ))}

      {adding ? (
        <div className="space-y-3 rounded-md border border-border p-3">
          <div className="space-y-1.5">
            <Label>When</Label>
            <Select value={eventType} onValueChange={(v) => setEventType(v as AutomationEventType)}>
              <SelectTrigger className="h-8"><SelectValue /></SelectTrigger>
              <SelectContent>
                {(Object.keys(EVENT_LABELS) as AutomationEventType[]).map((key) => (
                  <SelectItem key={key} value={key}>{EVENT_LABELS[key]}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label>Then</Label>
            <Select value={actionType} onValueChange={(v) => setActionType(v as AutomationActionType)}>
              <SelectTrigger className="h-8"><SelectValue /></SelectTrigger>
              <SelectContent>
                {(Object.keys(ACTION_LABELS) as AutomationActionType[]).map((key) => (
                  <SelectItem key={key} value={key}>{ACTION_LABELS[key]}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {SCORE_AWARE_ACTIONS.has(actionType) && (
            <div className="space-y-1.5">
              <Label>Minimum score (optional)</Label>
              <Input
                type="number"
                value={scoreThreshold}
                onChange={(e) => setScoreThreshold(e.target.value)}
                placeholder="e.g. 50"
                className="h-8"
              />
            </div>
          )}

          {actionType === "create_lead" && (
            <label className="flex items-center gap-2 text-sm">
              <Checkbox checked={createFollowUpTask} onCheckedChange={(v) => setCreateFollowUpTask(Boolean(v))} />
              Create a follow-up task for the assigned owner
            </label>
          )}

          <div className="flex justify-end gap-2">
            <Button variant="outline" size="sm" onClick={() => setAdding(false)}>Cancel</Button>
            <Button size="sm" onClick={handleAdd} disabled={createRule.isPending}>Add automation</Button>
          </div>
        </div>
      ) : (
        <Button variant="outline" size="sm" onClick={() => setAdding(true)}>
          <Plus className="h-3.5 w-3.5" /> Add automation
        </Button>
      )}
    </div>
  );
}
