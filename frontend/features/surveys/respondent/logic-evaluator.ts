import type { AnswerValue } from "./answer-value";
import type { PublicSurveyLogicRule, PublicSurveyQuestion } from "@/hooks/api/surveys/public-runtime";

export interface LogicOutcome {
  disqualified: boolean;
  endSurvey: boolean;
  skipToQuestionId: number | null;
  skipToSectionId: number | null;
}

function normalize(value: unknown): string {
  return String(value ?? "").trim().toLowerCase();
}

function conditionMatches(
  rule: PublicSurveyLogicRule,
  question: PublicSurveyQuestion,
  answer: AnswerValue | undefined,
  cumulativeScore: number,
): boolean {
  const target = normalize(rule.condition.value);
  switch (rule.condition.op) {
    case "answer_equals": {
      if (answer?.choiceIds?.length) {
        const label = question.choices.find((c) => c.id === answer.choiceIds?.[0])?.label ?? "";
        return normalize(label) === target;
      }
      const text = answer?.answerText ?? (answer?.answerValue != null ? String(answer.answerValue) : "");
      return normalize(text) === target;
    }
    case "answer_contains": {
      const text = answer?.answerText ?? "";
      return normalize(text).includes(target);
    }
    case "score_gt":
      return cumulativeScore > Number(rule.condition.value ?? 0);
    case "score_lt":
      return cumulativeScore < Number(rule.condition.value ?? 0);
    default:
      return false;
  }
}

export function evaluateQuestionLogic(
  question: PublicSurveyQuestion,
  answer: AnswerValue | undefined,
  rules: PublicSurveyLogicRule[],
  cumulativeScore: number,
): LogicOutcome {
  const outcome: LogicOutcome = { disqualified: false, endSurvey: false, skipToQuestionId: null, skipToSectionId: null };
  const applicable = rules.filter((r) => r.sourceQuestionId === question.id);

  for (const rule of applicable) {
    if (!conditionMatches(rule, question, answer, cumulativeScore)) continue;
    switch (rule.action.type) {
      case "disqualify":
        outcome.disqualified = true;
        break;
      case "end_survey":
        outcome.endSurvey = true;
        break;
      case "skip_to_question":
        if (typeof rule.target?.questionId === "number") outcome.skipToQuestionId = rule.target.questionId;
        break;
      case "skip_to_section":
        if (typeof rule.target?.sectionId === "number") outcome.skipToSectionId = rule.target.sectionId;
        break;
      default:
        break;
    }
  }

  return outcome;
}
