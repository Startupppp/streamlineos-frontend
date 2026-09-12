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

/**
 * A field picker that hands back the field's *type* along with its name.
 *
 * Which operators and which aggregates apply is decided per type by the
 * compiler, so every control downstream needs the type — and the only moment it
 * is known for certain is the moment the field is chosen. Carrying it out of
 * here means nothing later has to look it up and get it wrong.
 */

export const ROW_COUNT_OPTION = "__rows__";

interface ReportFieldSelectProps {
  value: string;
  options: readonly ReportFieldOption[];
  ariaLabel: string;
  placeholder?: string;
  disabled?: boolean;
  /** Offers "All rows", the `COUNT(*)` case, which is the one field-less projection. */
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
                {/*
                  Say so where the label promises a person and the column holds an
                  id. `assigned_to_id` is labelled "Owner", `party_id` is "Party" —
                  eight fields in the registry are named for the thing they point
                  at and store its identifier, so picking one puts a UUID on screen
                  where a name is expected. Resolving the name needs a join this
                  endpoint does not do; until it does, the honest place to say it
                  is at the point of choice rather than in the results.
                */}
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
