"use client";

import { useCallback, useMemo, useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Combobox, type ComboboxOption } from "@/components/ui/combobox";
import type { FormField } from "@/features/build/forms/form-submission-schema";

export const OPTION_SEARCH_THRESHOLD = 8;

export const OPTION_RENDER_LIMIT = 200;

interface SearchableFieldOptionsProps {
  field: FormField;
  options: string[];
  value: string;
  onChange: (v: unknown) => void;
  errorMessage?: string;
}

function SearchableFieldOptions({
  field,
  options,
  value,
  onChange,
  errorMessage,
}: SearchableFieldOptionsProps) {
  const [search, setSearch] = useState("");

  const matching = useMemo(() => {
    const needle = search.trim().toLowerCase();
    if (!needle) return options;
    return options.filter((opt) => opt.toLowerCase().includes(needle));
  }, [options, search]);

  const visible = useMemo<ComboboxOption[]>(() => {
    const shown = matching.slice(0, OPTION_RENDER_LIMIT);
    const withSelection =
      value && !shown.includes(value) && options.includes(value)
        ? [value, ...shown]
        : shown;
    return withSelection.map((opt) => ({ value: opt, label: opt }));
  }, [matching, options, value]);

  const handleChange = useCallback(
    (v: string) => {
      setSearch("");
      onChange(v);
    },
    [onChange],
  );

  return (
    <div className="space-y-1.5">
      <Label htmlFor={`field-${field.key}`} className="text-xs">
        {field.label}
        {field.required && <span className="text-destructive ml-0.5">*</span>}
      </Label>
      <Combobox
        options={visible}
        value={value}
        onChange={handleChange}
        onSearchChange={setSearch}
        placeholder={`Select ${field.label.toLowerCase()}…`}
        searchPlaceholder={`Search ${field.label.toLowerCase()}…`}
        emptyText="No matching options."
        aria-label={field.label}
      />
      {matching.length > OPTION_RENDER_LIMIT && (
        <p className="text-xs text-muted-foreground">
          Showing the first {OPTION_RENDER_LIMIT} of {matching.length} matching
          options. Keep typing to narrow the list.
        </p>
      )}
      {errorMessage && (
        <p className="text-xs text-destructive" role="alert">
          {errorMessage}
        </p>
      )}
    </div>
  );
}

export function FieldInput({
  field,
  value,
  onChange,
  errorMessage,
}: {
  field: FormField;
  value: string;
  onChange: (v: unknown) => void;
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

  if ((field.type === "select" || field.type === "dropdown") && field.options && field.options.length > 0) {
    if (field.options.length > OPTION_SEARCH_THRESHOLD) {
      return (
        <SearchableFieldOptions
          field={field}
          options={field.options}
          value={value}
          onChange={onChange}
          errorMessage={errorMessage}
        />
      );
    }
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

  if (field.type === "textarea" || field.type === "long_text") {
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
