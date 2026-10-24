"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Trash2Icon } from "@animateicons/react/lucide";
import { AutomationsIllustration } from "@/components/illustrations";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { LoadingButton } from "@/components/ui/loading-button";
import { AnimatedIconButton } from "@/components/ui/animated-icon-button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
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
} from "@/hooks/api/surveys/automations";
import {
  ACTION_LABELS,
  AUTOMATION_ACTION_TYPES,
  AUTOMATION_DRAFT_DEFAULTS,
  AUTOMATION_EVENT_TYPES,
  EVENT_LABELS,
  SCORE_AWARE_ACTIONS,
  automationDraftSchema,
  type AutomationDraftValues,
} from "./automation-draft-schema";

function AutomationDraftForm({
  surveyId,
  onCancel,
  onCreated,
}: {
  surveyId: number;
  onCancel: () => void;
  onCreated: () => void;
}) {
  const createRule = useCreateAutomation(surveyId);
  const form = useForm<AutomationDraftValues>({
    resolver: zodResolver(automationDraftSchema),
    defaultValues: AUTOMATION_DRAFT_DEFAULTS,
  });
  const actionType = form.watch("actionType");

  async function handleSubmit(values: AutomationDraftValues) {
    try {
      await createRule.mutateAsync({
        eventType: values.eventType,
        action: {
          type: values.actionType,
          scoreThreshold: values.scoreThreshold
            ? Number(values.scoreThreshold)
            : undefined,
          config:
            values.actionType === "create_lead"
              ? { createFollowUpTask: values.createFollowUpTask }
              : undefined,
        },
      });
      form.reset(AUTOMATION_DRAFT_DEFAULTS);
      onCreated();
    } catch (error) {
      toast.error(getErrorMessage(error));
    }
  }

  return (
    <Form {...form}>
      <form
        onSubmit={form.handleSubmit(handleSubmit)}
        className="shrink-0 space-y-3 rounded-md border border-border p-3"
      >
        <FormField
          control={form.control}
          name="eventType"
          render={({ field }) => (
            <FormItem>
              <FormLabel>When</FormLabel>
              <Select value={field.value} onValueChange={field.onChange}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {AUTOMATION_EVENT_TYPES.map((key) => (
                    <SelectItem key={key} value={key}>
                      {EVENT_LABELS[key]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="actionType"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Then</FormLabel>
              <Select value={field.value} onValueChange={field.onChange}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {AUTOMATION_ACTION_TYPES.map((key) => (
                    <SelectItem key={key} value={key}>
                      {ACTION_LABELS[key]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        {SCORE_AWARE_ACTIONS.has(actionType) ? (
          <FormField
            control={form.control}
            name="scoreThreshold"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Minimum score (optional)</FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    placeholder="e.g. 50"
                    {...field}
                    value={field.value ?? ""}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        ) : null}

        {actionType === "create_lead" ? (
          <FormField
            control={form.control}
            name="createFollowUpTask"
            render={({ field }) => (
              <FormItem>
                <label className="flex items-center gap-2 text-sm">
                  <FormControl>
                    <Checkbox
                      checked={field.value}
                      onCheckedChange={(checked) =>
                        field.onChange(checked === true)
                      }
                    />
                  </FormControl>
                  Create a follow-up task for the assigned owner
                </label>
                <FormMessage />
              </FormItem>
            )}
          />
        ) : null}

        <div className="flex justify-end gap-2">
          <Button type="button" variant="outline" size="sm" onClick={onCancel}>
            Cancel
          </Button>
          <LoadingButton type="submit" size="sm" isPending={createRule.isPending}>
            Add automation
          </LoadingButton>
        </div>
      </form>
    </Form>
  );
}

interface AutomationsTabProps {
  survey: SurveyForm;
  adding: boolean;
  onAddingChange: (adding: boolean) => void;
}

export function AutomationsTab({
  survey,
  adding,
  onAddingChange,
}: AutomationsTabProps) {
  const { data: rules, isLoading, isError, error, refetch, access } =
    useSurveyAutomations(survey.id);
  const deleteRule = useDeleteAutomation(survey.id);

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

  function handleCancelAdding() {
    onAddingChange(false);
  }

  function handleCreated() {
    onAddingChange(false);
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
    <AutomationDraftForm
      surveyId={survey.id}
      onCancel={handleCancelAdding}
      onCreated={handleCreated}
    />
  ) : null;

  return (
    <PageState
      resolution={pageState}
      loading={
        <div className="flex h-full min-h-0 flex-1 flex-col gap-3">
          <Skeleton className="h-11 w-full rounded-md" />
          <Skeleton className="h-11 w-full rounded-md" />
          <Skeleton className="h-11 w-full rounded-md" />
        </div>
      }
      onRetry={handleRetry}
      className="h-full min-h-0 flex-1"
      empty={
        <EmptyState
          illustration={<AutomationsIllustration className="h-full w-full" />}
          illustrationSize="lg"
          title="No automations yet"
          description="Route leads to CRM, notify the survey owner, or trigger a webhook based on responses."
          className="h-full min-h-full flex-1"
        />
      }
    >
      <div className="flex h-full min-h-0 flex-1 flex-col gap-3 overflow-y-auto scrollbar-hide">
        {!hasRules ? draft : null}
        {rules?.map((rule) => (
          <div
            key={rule.id}
            className="flex items-start gap-2 rounded-md border border-border px-3 py-2 text-sm"
          >
            <span className="min-w-0 flex-1 break-words">
              When{" "}
              <span className="font-medium">
                {EVENT_LABELS[rule.eventType]}
              </span>
              {rule.action.scoreThreshold != null && (
                <> and score ≥ {rule.action.scoreThreshold}</>
              )}{" "}
              →{" "}
              <span className="font-medium">
                {ACTION_LABELS[rule.action.type]}
              </span>
              {rule.action.type === "create_lead" &&
                Boolean(rule.action.config?.createFollowUpTask) && (
                  <span className="text-muted-foreground">
                    {" "}
                    + follow-up task
                  </span>
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
    </PageState>
  );
}
