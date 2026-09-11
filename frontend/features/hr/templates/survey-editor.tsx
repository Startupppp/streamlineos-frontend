"use client";

import { useCallback } from "react";
import { nanoid } from "nanoid";
import { PlusCircle } from "lucide-react";
import { Trash2Icon } from "@animateicons/react/lucide";
import { Button } from "@/components/ui/button";
import { TooltipIconButton } from "@/components/ui/tooltip-icon-button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { SurveyQuestion } from "@/types/hr/templates";
import { parseCommaList } from "@/lib/comma-list";

const QUESTION_TYPES = [
  { value: "rating", label: "Rating (1–5)" },
  { value: "text", label: "Text" },
  { value: "boolean", label: "Yes/No" },
  { value: "multiple_choice", label: "Multiple Choice" },
] as const;

/**
 * Built from the same constant the options render, so the guard cannot drift
 * from the list. A `v as SurveyQuestion["type"]` here would accept any string
 * the Select was ever given.
 */
function isSurveyQuestionType(value: string): value is SurveyQuestion["type"] {
  return QUESTION_TYPES.some((type) => type.value === value);
}

/** "a, b, ,c" is three options, not four, and never an empty one. */
interface SurveyEditorProps {
  questions: SurveyQuestion[];
  onChange: (questions: SurveyQuestion[]) => void;
}

export function SurveyEditor({ questions, onChange }: SurveyEditorProps) {
  const handleAdd = useCallback(() => {
    onChange([
      ...questions,
      { id: nanoid(8), text: "", type: "text", required: true, order: questions.length },
    ]);
  }, [questions, onChange]);

  const handleRemove = useCallback(
    (questionId: string) => {
      onChange(
        questions
          .filter((question) => question.id !== questionId)
          .map((question, index) => ({ ...question, order: index })),
      );
    },
    [questions, onChange],
  );

  const handleChange = useCallback(
    (questionId: string, patch: Partial<SurveyQuestion>) => {
      onChange(
        questions.map((question) =>
          question.id === questionId ? { ...question, ...patch } : question,
        ),
      );
    },
    [questions, onChange],
  );

  function questionTypeHandler(questionId: string): (value: string) => void {
    return function handleQuestionTypeChange(value) {
      if (!isSurveyQuestionType(value)) return;
      handleChange(questionId, { type: value });
    };
  }

  function optionListHandler(
    questionId: string,
  ): (event: React.ChangeEvent<HTMLInputElement>) => void {
    return function handleOptionListChange(event) {
      handleChange(questionId, { options: parseCommaList(event.target.value) });
    };
  }

  return (
    <div className="space-y-2">
      {questions.map((q, idx) => (
        <div key={q.id} className="p-3 rounded-lg border bg-card space-y-2">
          <div className="flex items-center gap-2">
            <span className="text-dense font-mono text-muted-foreground w-5 shrink-0">{idx + 1}.</span>
            <Input
              placeholder="Question text"
              value={q.text}
              onChange={(e) => handleChange(q.id, { text: e.target.value })}
              className="flex-1"
            />
            <Select
              value={q.type}
              onValueChange={questionTypeHandler(q.id)}
            >
              <SelectTrigger className="w-36 shrink-0">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {QUESTION_TYPES.map((t) => (
                  <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <div className="flex items-center gap-1 shrink-0">
              <Switch
                checked={q.required}
                onCheckedChange={(v) => handleChange(q.id, { required: v })}
                className="scale-75"
              />
              <span className="text-dense text-muted-foreground">Req</span>
            </div>
            <TooltipIconButton
              icon={Trash2Icon}
              iconSize={14}
              label="Remove Question"
              type="button"
              className="w-7 shrink-0 text-muted-foreground hover:text-destructive"
              onClick={() => handleRemove(q.id)}
            />
          </div>
          {q.type === "multiple_choice" && (
            <div className="pl-7">
              <Input
                placeholder="Options (comma-separated)"
                value={q.options?.join(", ") ?? ""}
                onChange={optionListHandler(q.id)}
                className="text-xs"
              />
            </div>
          )}
        </div>
      ))}
      <Button type="button" variant="outline" size="sm" className="gap-1.5" onClick={handleAdd}>
        <PlusCircle className="h-3.5 w-3.5" />
        Add Question
      </Button>
    </div>
  );
}
