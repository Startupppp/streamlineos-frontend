"use client";

import { useState, type ChangeEvent } from "react";
import { PlusIcon, Trash2Icon } from "@animateicons/react/lucide";
import { AutomationsIllustration } from "@/components/illustrations";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { AnimatedIconButton } from "@/components/ui/animated-icon-button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { EmptyState } from "@/components/ui/empty-state";
import { Skeleton } from "@/components/ui/skeleton";
import { PageState } from "@/components/shared/page-state";
import { usePageState } from "@/hooks/api/use-page-state";
import { getErrorMessage } from "@/lib/get-error-message";
import type { SurveyForm } from "@/hooks/api/surveys/forms";
import {
  useSurveyAutomations,
  useCreateAutomation,
  useDeleteAutomation,
  type AutomationEventType,
  type AutomationActionType,
} from "@/hooks/api/surveys/automations";

const EVENT_TYPES = [
  "survey.published",
  "survey.response.started",
  "survey.response.submitted",
  "survey.assessment.passed",
  "survey.assessment.failed",
  "survey.live.started",
  "survey.live.ended",
  "survey.lead.created",
  "survey.collector.completed_quota",
] as const satisfies readonly AutomationEventType[];

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
  const { data: rules, isLoading, isError, error, refetch, access } = useSurveyAutomations(survey.id);
  const createRule = useCreateAutomation(survey.id);
  const deleteRule = useDeleteAutomation(survey.id);

  const [adding, setAdding] = useState(false);
  const [eventType, setEventType] = useState<AutomationEventType>("survey.response.submitted");
  const [actionType, setActionType] = useState<AutomationActionType>("create_lead");
  const [scoreThreshold, setScoreThreshold] = useState("");
  const [createFollowUpTask, setCreateFollowUpTask] = useState(false);

  function handleEventTypeChange(v: string): void {
    const next = EVENT_TYPES.find((candidate) => candidate === v);
    if (next) setEventType(next);
  }

  function handleFollowUpTaskToggle(checked: boolean | "indeterminate"): void {
    setCreateFollowUpTask(Boolean(checked));
  }

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
      toast.error(getErrorMessage(error));
    }
  }

  async function handleDelete(automationId: string) {
    try {
      await deleteRule.mutateAsync(automationId);
    } catch (error) {
      toast.error(getErrorMessage(error));
    }
  }

  function handleRetry() {
    void refetch();
  }

  function handleStartAdding() {
    setAdding(true);
  }

  function handleCancelAdding() {
    setAdding(false);
  }

  function handleActionTypeChange(value: string) {
    setActionType(value as AutomationActionType);
  }

  function handleScoreThresholdChange(event: ChangeEvent<HTMLInputElement>) {
    setScoreThreshold(event.target.value);
  }

  function deleteRuleHandler(automationId: string) {
    return function handleDeleteRule() {
      void handleDelete(automationId);
    };
  }

  const hasRules = (rules?.length ?? 0) > 0;
  const pageState = usePageState({
    permission: "surveys:automations:manage",
    isLoading: isLoading || access.pending,
    isError,
    error,
    isEmpty: !adding && !hasRules,
  });

  const draft = adding ? (
    <div className="shrink-0 space-y-3 rounded-md border border-border p-3">
      <div className="space-y-1.5">
        <Label>When</Label>
        <Select value={eventType} onValueChange={handleEventTypeChange}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {EVENT_TYPES.map((key) => (
              <SelectItem key={key} value={key}>
                {EVENT_LABELS[key]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-1.5">
        <Label>Then</Label>
        <Select value={actionType} onValueChange={handleActionTypeChange}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {(Object.keys(ACTION_LABELS) as AutomationActionType[]).map((key) => (
              <SelectItem key={key} value={key}>
                {ACTION_LABELS[key]}
              </SelectItem>
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
            onChange={handleScoreThresholdChange}
            placeholder="e.g. 50"
          />
        </div>
      )}

      {actionType === "create_lead" && (
        <label className="flex items-center gap-2 text-sm">
          <Checkbox checked={createFollowUpTask} onCheckedChange={handleFollowUpTaskToggle} />
          Create a follow-up task for the assigned owner
        </label>
      )}

      <div className="flex justify-end gap-2">
        <Button variant="outline" size="sm" onClick={handleCancelAdding}>
          Cancel
        </Button>
        <Button size="sm" onClick={handleAdd} disabled={createRule.isPending}>
          Add automation
        </Button>
      </div>
    </div>
  ) : null;

  const addAutomationBar = (
    <div className="flex shrink-0 justify-end border-t border-border pt-3">
      <AnimatedIconButton
        icon={PlusIcon}
        iconSize={14}
        iconClassName="mr-1.5"
        variant="outline"
        size="sm"
        onClick={handleStartAdding}
      >
        Add automation
      </AnimatedIconButton>
    </div>
  );

  return (
    <PageState
      resolution={pageState}
      loading={
        <div className="flex h-full min-h-0 flex-1 flex-col gap-3">
          <div className="flex min-h-0 flex-1 flex-col gap-3">
            <Skeleton className="h-11 w-full rounded-md" />
            <Skeleton className="h-11 w-full rounded-md" />
            <Skeleton className="h-11 w-full rounded-md" />
          </div>
          <Skeleton className="ml-auto h-9 w-36 rounded-md" />
        </div>
      }
      onRetry={handleRetry}
      className="h-full min-h-0 flex-1"
      empty={
        <div className="flex h-full min-h-0 flex-1 flex-col">
          <EmptyState
            illustration={
              <div className="h-28 w-28">
                <AutomationsIllustration />
              </div>
            }
            title="No automations yet"
            description="Route leads to CRM, notify the survey owner, or trigger a webhook based on responses."
            className="min-h-0 flex-1"
          />
          {addAutomationBar}
        </div>
      }
    >
      <div className="flex h-full min-h-0 flex-1 flex-col gap-3">
        <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto scrollbar-hide">
          {!hasRules ? draft : null}
          {rules?.map((rule) => (
            <div key={rule.id} className="flex items-start gap-2 rounded-md border border-border px-3 py-2 text-sm">
              <span className="min-w-0 flex-1 break-words">
                When <span className="font-medium">{EVENT_LABELS[rule.eventType]}</span>
                {rule.action.scoreThreshold != null && <> and score ≥ {rule.action.scoreThreshold}</>} →{" "}
                <span className="font-medium">{ACTION_LABELS[rule.action.type]}</span>
                {rule.action.type === "create_lead" && Boolean(rule.action.config?.createFollowUpTask) && (
                  <span className="text-muted-foreground"> + follow-up task</span>
                )}
              </span>
              <AnimatedIconButton
                icon={Trash2Icon}
                iconSize={14}
                iconClassName="text-destructive"
                variant="ghost"
                size="icon"
                className="size-9 shrink-0"
                aria-label="Delete automation rule"
                onClick={deleteRuleHandler(rule.id)}
              />
            </div>
          ))}
          {hasRules && adding ? draft : null}
        </div>
        {adding ? null : addAutomationBar}
      </div>
    </PageState>
  );
}
