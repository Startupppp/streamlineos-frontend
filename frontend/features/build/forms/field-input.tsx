"use client";

import { useCallback } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import type { FormField } from "@/features/build/forms/form-submission-schema";

export function FieldInput({
  field,
  value,
  onChange,
  errorMessage,
}: {
  field: FormField;
  value: string;
  onChange: (v: string) => void;
  errorMessage?: string;
}) {
  const handleSelectChange = useCallback(
    (v: string) => onChange(v),
    [onChange],
  );

  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => onChange(e.target.value),
    [onChange],
  );

  const handleTextareaChange = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => onChange(e.target.value),
    [onChange],
  );

  if (field.type === "select" && field.options && field.options.length > 0) {
    return (
      <div className="space-y-1.5">
        <Label htmlFor={`field-${field.key}`} className="text-xs">
          {field.label}
          {field.required && <span className="text-destructive ml-0.5">*</span>}
        </Label>
        <Select value={value} onValueChange={handleSelectChange}>
          <SelectTrigger id={`field-${field.key}`}>
            <SelectValue placeholder={`Select ${field.label.toLowerCase()}…`} />
          </SelectTrigger>
          <SelectContent>
            {field.options.map((opt) => (
              <SelectItem key={opt} value={opt}>
                {opt}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {errorMessage && (
          <p className="text-xs text-destructive" role="alert">
            {errorMessage}
          </p>
        )}
      </div>
    );
  }

  if (field.type === "textarea") {
    return (
      <div className="space-y-1.5">
        <Label htmlFor={`field-${field.key}`} className="text-xs">
          {field.label}
          {field.required && <span className="text-destructive ml-0.5">*</span>}
        </Label>
        <Textarea
          id={`field-${field.key}`}
          rows={4}
          value={value}
          onChange={handleTextareaChange}
          aria-required={field.required}
          aria-invalid={errorMessage !== undefined}
        />
        {errorMessage && (
          <p className="text-xs text-destructive" role="alert">
            {errorMessage}
          </p>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-1.5">
      <Label htmlFor={`field-${field.key}`} className="text-xs">
        {field.label}
        {field.required && <span className="text-destructive ml-0.5">*</span>}
      </Label>
      <Input
        id={`field-${field.key}`}
        type={field.type === "email" ? "email" : field.type === "number" ? "text" : "text"}
        inputMode={field.type === "number" ? "decimal" : undefined}
        value={value}
        onChange={handleInputChange}
        aria-required={field.required}
        aria-invalid={errorMessage !== undefined}
      />
      {errorMessage && (
        <p className="text-xs text-destructive" role="alert">
          {errorMessage}
        </p>
      )}
    </div>
  );
}
