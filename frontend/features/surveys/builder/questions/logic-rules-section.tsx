"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { PlusIcon, Trash2Icon } from "@animateicons/react/lucide";
import { Button } from "@/components/ui/button";
import { LoadingButton } from "@/components/ui/loading-button";
import { AnimatedIconButton } from "@/components/ui/animated-icon-button";
import { TruncatedText } from "@/components/ui/truncated-text";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
  FormMessage,
} from "@/components/ui/form";
import { getErrorMessage } from "@/lib/get-error-message";
import type {
  SurveyBuilderViewQuestion,
  SurveyBuilderViewSection,
  SurveyBuilderLogicRule,
} from "@/hooks/api/surveys/builder";
import { useCreateLogicRule, useDeleteLogicRule } from "@/hooks/api/surveys/logic";
import {
  ACTION_LABELS,
  ACTION_TYPES,
  CONDITION_LABELS,
  CONDITION_OPS,
  LOGIC_RULE_DRAFT_DEFAULTS,
  QUESTION_TARGET_ACTIONS,
  logicRuleDraftSchema,
  type LogicRuleDraftValues,
} from "./logic-rule-draft-schema";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function LogicRuleDraftForm({
  surveyId,
  questionId,
  sections,
  onCancel,
  onCreated,
}: {
  surveyId: number;
  questionId: number;
  sections: SurveyBuilderViewSection[];
  onCancel: () => void;
  onCreated: () => void;
}) {
  const createRule = useCreateLogicRule(surveyId);
  const form = useForm<LogicRuleDraftValues>({
    resolver: zodResolver(logicRuleDraftSchema),
    defaultValues: LOGIC_RULE_DRAFT_DEFAULTS,
  });
  const actionType = form.watch("actionType");
  const allQuestions = sections.flatMap((section) => section.questions);

  async function handleSubmit(values: LogicRuleDraftValues) {
    let target: Record<string, unknown> | null = null;
    if (
      QUESTION_TARGET_ACTIONS.has(values.actionType) &&
      values.targetQuestionId
    ) {
      target = { questionId: Number(values.targetQuestionId) };
    } else if (
      values.actionType === "skip_to_section" &&
      values.targetSectionId
    ) {
      target = { sectionId: Number(values.targetSectionId) };
    }

    try {
      await createRule.mutateAsync({
        sourceQuestionId: questionId,
        condition: {
          op: values.op,
          questionId,
          value: values.conditionValue,
        },
        action: { type: values.actionType },
        target,
      });
      form.reset(LOGIC_RULE_DRAFT_DEFAULTS);
      onCreated();
    } catch (error) {
      toast.error(getErrorMessage(error));
    }
  }

  function questionTitle(id: number) {
    return allQuestions.find((q) => q.id === id)?.title ?? `Question ${id}`;
  }

  return (
    <Form {...form}>
      <form
        onSubmit={form.handleSubmit(handleSubmit)}
        className="space-y-2 rounded-md border border-border p-3"
      >
        <div className="flex gap-2">
          <FormField
            control={form.control}
            name="op"
            render={({ field }) => (
              <FormItem className="flex-1">
                <Select value={field.value} onValueChange={field.onChange}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {CONDITION_OPS.map((key) => (
                      <SelectItem key={key} value={key}>
                        {CONDITION_LABELS[key]}
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
            name="conditionValue"
            render={({ field }) => (
              <FormItem className="flex-1">
                <FormControl>
                  <Input placeholder="Value" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
        <FormField
          control={form.control}
          name="actionType"
          render={({ field }) => (
            <FormItem>
              <Select value={field.value} onValueChange={field.onChange}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {ACTION_TYPES.map((key) => (
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
        {QUESTION_TARGET_ACTIONS.has(actionType) ? (
          <FormField
            control={form.control}
            name="targetQuestionId"
            render={({ field }) => (
              <FormItem>
                <Select value={field.value} onValueChange={field.onChange}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Target question" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {allQuestions
                      .filter((q) => q.id !== questionId)
                      .map((q) => (
                        <SelectItem key={q.id} value={String(q.id)}>
                          {q.title || questionTitle(q.id)}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
        ) : null}
        {actionType === "skip_to_section" ? (
          <FormField
            control={form.control}
            name="targetSectionId"
            render={({ field }) => (
              <FormItem>
                <Select value={field.value} onValueChange={field.onChange}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Target section" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {sections.map((section) => (
                      <SelectItem key={section.id} value={String(section.id)}>
                        {section.title}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
        ) : null}
        <div className="flex justify-end gap-2">
          <Button type="button" variant="outline" size="sm" onClick={onCancel}>
            Cancel
          </Button>
          <LoadingButton
            type="submit"
            size="sm"
            isPending={createRule.isPending}
          >
            Add rule
          </LoadingButton>
        </div>
      </form>
    </Form>
  );
}

interface LogicRulesSectionProps {
  surveyId: number;
  question: SurveyBuilderViewQuestion;
  sections: SurveyBuilderViewSection[];
  rules: SurveyBuilderLogicRule[];
}

export function LogicRulesSection({
  surveyId,
  question,
  sections,
  rules,
}: LogicRulesSectionProps) {
  const deleteRule = useDeleteLogicRule(surveyId);
  const [adding, setAdding] = useState(false);
  const questionRules = rules.filter(
    (rule) => rule.sourceQuestionId === question.id,
  );

  function summarizeRule(rule: SurveyBuilderLogicRule) {
    const condition = isRecord(rule.condition) ? rule.condition : {};
    const action = isRecord(rule.action) ? rule.action : {};
    const conditionOp = CONDITION_OPS.find(
      (candidate) => candidate === condition.op,
    );
    const value = condition.value;
    const type = ACTION_TYPES.find((candidate) => candidate === action.type);
    const conditionLabel = conditionOp
      ? CONDITION_LABELS[conditionOp]
      : "Condition";
    const actionLabel = type ? ACTION_LABELS[type] : "Action";
    return `If ${conditionLabel} "${String(value ?? "")}" → ${actionLabel}`;
  }

  async function handleDelete(ruleId: number) {
    try {
      await deleteRule.mutateAsync(ruleId);
    } catch (error) {
      toast.error(getErrorMessage(error));
    }
  }

  function deleteRuleHandler(ruleId: number) {
    return function handleDeleteRule() {
      void handleDelete(ruleId);
    };
  }

  function handleStartAdding() {
    setAdding(true);
  }

  function handleCancelAdding() {
    setAdding(false);
  }

  function handleCreated() {
    setAdding(false);
  }

  return (
    <div className="space-y-2">
      <div className="flex min-w-0 items-center justify-between gap-2">
        <Label className="shrink-0">Logic</Label>
        {adding ? null : (
          <AnimatedIconButton
            icon={PlusIcon}
            iconSize={14}
            iconClassName="mr-1.5"
            variant="outline"
            size="sm"
            className="h-8 shrink-0"
            onClick={handleStartAdding}
          >
            Add logic rule
          </AnimatedIconButton>
        )}
      </div>
      {questionRules.map((rule) => (
        <div
          key={rule.id}
          className="flex items-center gap-2 rounded-md border border-border px-3 py-2 text-sm"
        >
          <TruncatedText text={summarizeRule(rule)} className="flex-1" />
          <AnimatedIconButton
            icon={Trash2Icon}
            iconSize={14}
            iconClassName="text-destructive"
            variant="ghost"
            size="icon"
            className="h-7 w-7 shrink-0"
            aria-label="Delete logic rule"
            onClick={deleteRuleHandler(rule.id)}
          />
        </div>
      ))}

      {adding ? (
        <LogicRuleDraftForm
          surveyId={surveyId}
          questionId={question.id}
          sections={sections}
          onCancel={handleCancelAdding}
          onCreated={handleCreated}
        />
      ) : null}
    </div>
  );
}
