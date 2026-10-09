"use client";

import { useId, useState } from "react";
import { Button } from "@/components/ui/button";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { useAskOsExpired } from "./ask-os-confirmation-card";
import type { AskOsDirectiveOf } from "./ask-os-directive-schema";

export interface AskOsClarificationAnswer {
  clarificationId: string;
  optionId: string;
  label: string;
}

interface AskOsClarifyCardProps {
  directive: AskOsDirectiveOf<"clarify">;
  onAnswer?: (answer: AskOsClarificationAnswer) => void;
}

export function AskOsClarifyCard({ directive, onAnswer }: AskOsClarifyCardProps) {
  const questionId = useId();
  const expired = useAskOsExpired(directive.expiresAt);
  const [selected, setSelected] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const live = onAnswer !== undefined && !expired && !submitted;
  const selectedOption = directive.options.find((option) => option.id === selected);

  function handleSubmit() {
    if (!onAnswer || !selectedOption) return;
    setSubmitted(true);
    onAnswer({
      clarificationId: directive.clarificationId,
      optionId: selectedOption.id,
      label: selectedOption.label,
    });
  }

  return (
    <section aria-labelledby={questionId} className="space-y-2 rounded-lg border border-border px-2.5 py-2">
      <p id={questionId} className="text-label font-medium leading-5 text-foreground">
        {directive.question}
      </p>
      <RadioGroup
        aria-labelledby={questionId}
        value={selected}
        onValueChange={setSelected}
        disabled={!live}
        className="gap-1.5"
      >
        {directive.options.map((option) => (
          <label
            key={option.id}
            className="flex cursor-pointer items-start gap-2 rounded-md px-1.5 py-1 hover:bg-muted has-[:disabled]:cursor-default has-[:disabled]:hover:bg-transparent"
          >
            <RadioGroupItem value={option.id} className="mt-0.5" />
            <span className="min-w-0 space-y-0.5">
              <span className="block text-label leading-5 text-foreground">{option.label}</span>
              {option.description ? (
                <span className="block text-dense text-muted-foreground">{option.description}</span>
              ) : null}
            </span>
          </label>
        ))}
      </RadioGroup>
      {expired ? (
        <p className="text-dense text-muted-foreground">This question has expired. Ask again to continue.</p>
      ) : live ? (
        <div className="flex justify-end">
          <Button
            type="button"
            size="sm"
            disabled={!selectedOption}
            onClick={handleSubmit}
            className="h-7 px-2.5 text-xs"
          >
            Continue
          </Button>
        </div>
      ) : (
        <p className="text-dense text-muted-foreground">
          {submitted ? `You chose: ${selectedOption?.label ?? ""}` : "No longer active — view only."}
        </p>
      )}
    </section>
  );
}
