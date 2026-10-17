"use client";

import { useCallback } from "react";
import type { z } from "zod";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import type { publicScreeningQuestionContract } from "@/lib/public-schema";

export type ScreeningQuestion = z.infer<typeof publicScreeningQuestionContract>;

interface FieldProps {
  question: ScreeningQuestion;
  value: string;
  error?: string;
  onChange: (questionId: string, value: string) => void;
  disabled: boolean;
}

const YES_NO = ["Yes", "No"];

/**
 * One screening question.
 *
 * The passing answer (`knockoutAnswer`) is not in the payload and must never be
 * inferred here — a knockout is decided by the server on submit, so this
 * renders the question and nothing about how it will be judged.
 */
function ScreeningField({ question, value, error, onChange, disabled }: FieldProps) {
  const fieldId = `screening-${question.id}`;
  const handleInput = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => onChange(question.id, event.target.value),
    [onChange, question.id],
  );
  const handleChoice = useCallback(
    (next: string) => onChange(question.id, next),
    [onChange, question.id],
  );

  const required = question.required ? <span className="text-destructive"> *</span> : null;
  const message = error ? <p className="text-xs text-destructive">{error}</p> : null;

  if (question.type === "YES_NO" || question.type === "SINGLE_SELECT") {
    const options = question.type === "YES_NO" ? YES_NO : (question.options ?? []);
    return (
      <fieldset className="space-y-2" disabled={disabled}>
        <legend className="text-sm font-medium leading-none">
          {question.question}
          {required}
        </legend>
        <RadioGroup value={value} onValueChange={handleChoice} className="gap-2">
          {options.map((option) => (
            <div key={option} className="flex items-center gap-2">
              <RadioGroupItem value={option} id={`${fieldId}-${option}`} />
              <Label htmlFor={`${fieldId}-${option}`} className="font-normal">
                {option}
              </Label>
            </div>
          ))}
        </RadioGroup>
        {message}
      </fieldset>
    );
  }

  return (
    <div className="space-y-1.5">
      <Label htmlFor={fieldId}>
        {question.question}
        {required}
      </Label>
      <Input
        id={fieldId}
        type={question.type === "NUMBER" ? "number" : "text"}
        value={value}
        onChange={handleInput}
        disabled={disabled}
        maxLength={2000}
      />
      {message}
    </div>
  );
}

interface Props {
  questions: readonly ScreeningQuestion[];
  answers: Record<string, string>;
  errors: Record<string, string | undefined>;
  onChange: (questionId: string, value: string) => void;
  disabled: boolean;
}

export function ApplyScreeningFields({ questions, answers, errors, onChange, disabled }: Props) {
  if (questions.length === 0) return null;
  return (
    <div className="space-y-4 rounded-lg border px-4 py-4">
      <p className="text-sm font-medium">A few questions from the hiring team</p>
      {questions.map((question) => (
        <ScreeningField
          key={question.id}
          question={question}
          value={answers[question.id] ?? ""}
          error={errors[question.id]}
          onChange={onChange}
          disabled={disabled}
        />
      ))}
    </div>
  );
}
