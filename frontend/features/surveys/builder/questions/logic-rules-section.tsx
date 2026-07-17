"use client";

import { useState } from "react";
import { toast } from "sonner";
import { PlusIcon, Trash2Icon } from "@animateicons/react/lucide";
import { Button } from "@/components/ui/button";
import { AnimatedIconButton } from "@/components/ui/animated-icon-button";
import { TruncatedText } from "@/components/ui/truncated-text";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { getApiError } from "@/lib/api-client";
import type { SurveyBuilderQuestion, SurveyBuilderSection, SurveyBuilderLogicRule } from "@/hooks/api/surveys/builder";
import {
  useCreateLogicRule,
  useDeleteLogicRule,
  type LogicActionType,
  type LogicConditionOp,
} from "@/hooks/api/surveys/logic";

const CONDITION_LABELS: Record<LogicConditionOp, string> = {
  answer_equals: "Answer equals",
  answer_contains: "Answer contains",
  score_gt: "Score is greater than",
  score_lt: "Score is less than",
  metadata_equals: "Metadata equals",
  collector_equals: "Collector equals",
  contact_field_equals: "Contact field equals",
  completion_status_equals: "Completion status equals",
};

const ACTION_LABELS: Record<LogicActionType, string> = {
  skip_to_question: "Skip to question",
  skip_to_section: "Skip to section",
  show_question: "Show question",
  hide_question: "Hide question",
  disqualify: "Disqualify respondent",
  end_survey: "End survey",
  assign_score: "Assign score",
  assign_segment: "Assign segment",
  create_lead: "Create CRM lead",
  send_notification: "Send notification",
  set_variable: "Set variable",
};

const QUESTION_TARGET_ACTIONS = new Set<LogicActionType>(["skip_to_question", "show_question", "hide_question"]);

interface LogicRulesSectionProps {
  surveyId: number;
  question: SurveyBuilderQuestion;
  sections: SurveyBuilderSection[];
  rules: SurveyBuilderLogicRule[];
}

export function LogicRulesSection({ surveyId, question, sections, rules }: LogicRulesSectionProps) {
  const createRule = useCreateLogicRule(surveyId);
  const deleteRule = useDeleteLogicRule(surveyId);
  const [adding, setAdding] = useState(false);
  const [op, setOp] = useState<LogicConditionOp>("answer_equals");
  const [conditionValue, setConditionValue] = useState("");
  const [actionType, setActionType] = useState<LogicActionType>("skip_to_question");
  const [targetQuestionId, setTargetQuestionId] = useState<string>("");
  const [targetSectionId, setTargetSectionId] = useState<string>("");

  const allQuestions = sections.flatMap((s) => s.questions);
  const questionRules = rules.filter((r) => r.sourceQuestionId === question.id);

  function questionTitle(id: number) {
    return allQuestions.find((q) => q.id === id)?.title ?? `Question ${id}`;
  }

  function summarizeRule(rule: SurveyBuilderLogicRule) {
    const conditionOp = (rule.condition as { op?: LogicConditionOp }).op;
    const value = (rule.condition as { value?: unknown }).value;
    const type = (rule.action as { type?: LogicActionType }).type;
    const conditionLabel = conditionOp ? CONDITION_LABELS[conditionOp] : "Condition";
    const actionLabel = type ? ACTION_LABELS[type] : "Action";
    return `If ${conditionLabel} "${String(value ?? "")}" → ${actionLabel}`;
  }

  async function handleAdd() {
    let target: Record<string, unknown> | null = null;
    if (QUESTION_TARGET_ACTIONS.has(actionType) && targetQuestionId) {
      target = { questionId: Number(targetQuestionId) };
    } else if (actionType === "skip_to_section" && targetSectionId) {
      target = { sectionId: Number(targetSectionId) };
    }

    try {
      await createRule.mutateAsync({
        sourceQuestionId: question.id,
        condition: { op, questionId: question.id, value: conditionValue },
        action: { type: actionType },
        target,
      });
      setAdding(false);
      setConditionValue("");
      setTargetQuestionId("");
      setTargetSectionId("");
    } catch (error) {
      toast.error(getApiError(error));
    }
  }

  async function handleDelete(ruleId: number) {
    try {
      await deleteRule.mutateAsync(ruleId);
    } catch (error) {
      toast.error(getApiError(error));
    }
  }

  return (
    <div className="space-y-2">
      <Label>Logic</Label>
      {questionRules.map((rule) => (
        <div key={rule.id} className="flex items-center gap-2 rounded-md border border-border px-3 py-2 text-sm">
          <TruncatedText text={summarizeRule(rule)} className="flex-1" />
          <AnimatedIconButton icon={Trash2Icon} iconSize={14} iconClassName="text-destructive" variant="ghost" size="icon" className="h-7 w-7 shrink-0" onClick={() => handleDelete(rule.id)} />
        </div>
      ))}

      {adding ? (
        <div className="space-y-2 rounded-md border border-border p-3">
          <div className="flex gap-2">
            <Select value={op} onValueChange={(v) => setOp(v as LogicConditionOp)}>
              <SelectTrigger className="flex-1"><SelectValue /></SelectTrigger>
              <SelectContent>
                {(Object.keys(CONDITION_LABELS) as LogicConditionOp[]).map((key) => (
                  <SelectItem key={key} value={key}>{CONDITION_LABELS[key]}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Input
              value={conditionValue}
              onChange={(e) => setConditionValue(e.target.value)}
              placeholder="Value"
              className="flex-1"
            />
          </div>
          <Select value={actionType} onValueChange={(v) => setActionType(v as LogicActionType)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {(Object.keys(ACTION_LABELS) as LogicActionType[]).map((key) => (
                <SelectItem key={key} value={key}>{ACTION_LABELS[key]}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          {QUESTION_TARGET_ACTIONS.has(actionType) && (
            <Select value={targetQuestionId} onValueChange={setTargetQuestionId}>
              <SelectTrigger><SelectValue placeholder="Target question" /></SelectTrigger>
              <SelectContent>
                {allQuestions.filter((q) => q.id !== question.id).map((q) => (
                  <SelectItem key={q.id} value={String(q.id)}>{q.title || questionTitle(q.id)}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
          {actionType === "skip_to_section" && (
            <Select value={targetSectionId} onValueChange={setTargetSectionId}>
              <SelectTrigger><SelectValue placeholder="Target section" /></SelectTrigger>
              <SelectContent>
                {sections.map((s) => (
                  <SelectItem key={s.id} value={String(s.id)}>{s.title}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
          <div className="flex justify-end gap-2">
            <Button variant="outline" size="sm" onClick={() => setAdding(false)}>Cancel</Button>
            <Button size="sm" onClick={handleAdd} disabled={createRule.isPending}>Add rule</Button>
          </div>
        </div>
      ) : (
        <AnimatedIconButton icon={PlusIcon} iconSize={14} iconClassName="mr-1.5" variant="outline" size="sm" onClick={() => setAdding(true)}>
          Add logic rule
        </AnimatedIconButton>
      )}
    </div>
  );
}
