"use client";

import { useCallback } from "react";
import { Controller, type Control, type FieldPath } from "react-hook-form";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import type { CreateJobFormValues } from "./schema";
import { clampToWordLimit, countWords } from "./job-description-limits";

interface WordLimitedTextareaProps {
  control: Control<CreateJobFormValues>;
  name: FieldPath<CreateJobFormValues>;
  maxWords: number;
  rows?: number;
  placeholder?: string;
}

export function WordLimitedTextarea({
  control,
  name,
  maxWords,
  rows = 4,
  placeholder,
}: WordLimitedTextareaProps) {
  const counterId = `${name}-word-count`;

  const handleChange = useCallback(
    (onChange: (value: string) => void) => (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      onChange(clampToWordLimit(e.target.value, maxWords));
    },
    [maxWords],
  );

  return (
    <Controller
      control={control}
      name={name}
      render={({ field }) => {
        const value = typeof field.value === "string" ? field.value : "";
        const words = countWords(value);
        const nearLimit = words >= maxWords - 10;
        const atLimit = words >= maxWords;

        return (
          <div className="space-y-1">
            <Textarea
              rows={rows}
              placeholder={placeholder}
              value={value}
              onChange={handleChange(field.onChange)}
              onBlur={field.onBlur}
              aria-describedby={counterId}
            />
            <p
              id={counterId}
              className={cn(
                "text-micro text-right tabular-nums",
                atLimit ? "text-destructive" : nearLimit ? "text-status-warning-ink" : "text-muted-foreground",
              )}
            >
              {words}/{maxWords} words
            </p>
          </div>
        );
      }}
    />
  );
}
