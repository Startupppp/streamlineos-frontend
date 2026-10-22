"use client";

import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { FIELD_SELECT_CONTENT_CLASS } from "@/components/ui/field-control";
import { groupFieldOptions, type ReportFieldOption } from "./report-source-fields";


export const ROW_COUNT_OPTION = "__rows__";

interface ReportFieldSelectProps {
  value: string;
  options: readonly ReportFieldOption[];
  ariaLabel: string;
  placeholder?: string;
  disabled?: boolean;
  allowRowCount?: boolean;
  onFieldChange: (option: ReportFieldOption | null) => void;
}

export function ReportFieldSelect({
  value,
  options,
  ariaLabel,
  placeholder = "Pick a field",
  disabled,
  allowRowCount = false,
  onFieldChange,
}: ReportFieldSelectProps) {
  const groups = groupFieldOptions(options);

  function handleValueChange(next: string) {
    if (next === ROW_COUNT_OPTION) {
      onFieldChange(null);
      return;
    }
    onFieldChange(options.find((option) => option.name === next) ?? null);
  }

  const selected = value === "" && allowRowCount ? ROW_COUNT_OPTION : value;

  return (
    <Select value={selected} onValueChange={handleValueChange} disabled={disabled}>
      <SelectTrigger aria-label={ariaLabel} className="w-full">
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent className={FIELD_SELECT_CONTENT_CLASS}>
        {allowRowCount ? <SelectItem value={ROW_COUNT_OPTION}>All rows</SelectItem> : null}
        {groups.map((group) => (
          <SelectGroup key={group.group}>
            <SelectLabel>{group.group}</SelectLabel>
            {group.options.map((option) => (
              <SelectItem key={option.name} value={option.name}>
                {option.label}
                
                {option.name.endsWith("_id") ? (
                  <span className="ml-1 text-micro text-muted-foreground">(id, not a name)</span>
                ) : null}
              </SelectItem>
            ))}
          </SelectGroup>
        ))}
      </SelectContent>
    </Select>
  );
}
