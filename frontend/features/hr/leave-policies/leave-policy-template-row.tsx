"use client";

import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type {
  LeavePolicyTemplate,
  LeavePolicyTemplateKey,
} from "@/hooks/api/hr/leave-policy-templates-schema";

/**
 * Ticket 08. One editable offer row, plus the client validation the dialog's
 * submit gate reads. Kept beside the dialog rather than inside it so neither
 * file has to be read to change the other.
 */
export interface DraftRow {
  selected: boolean;
  leaveTypeName: string;
  daysPerYear: string;
  accrualRate: string;
  carryForwardDays: string;
}

export function draftOf(template: LeavePolicyTemplate): DraftRow {
  return {
    selected: true,
    leaveTypeName: template.leaveTypeName,
    daysPerYear: String(template.daysPerYear),
    accrualRate: template.accrualRate,
    carryForwardDays: template.carryForwardDays,
  };
}

function isWholeNumber(value: string): boolean {
  return /^\d+$/.test(value.trim());
}

function isDecimal(value: string): boolean {
  return /^\d+(\.\d{1,2})?$/.test(value.trim());
}

export function rowErrors(row: DraftRow): Partial<Record<keyof DraftRow, string>> {
  if (!row.selected) return {};
  return {
    ...(row.leaveTypeName.trim().length === 0
      ? { leaveTypeName: "Name the leave type" }
      : {}),
    ...(isWholeNumber(row.daysPerYear)
      ? {}
      : { daysPerYear: "Whole number of days" }),
    ...(isDecimal(row.accrualRate) ? {} : { accrualRate: "Days, like 1 or 1.5" }),
    ...(isDecimal(row.carryForwardDays)
      ? {}
      : { carryForwardDays: "Days, like 0 or 5" }),
  };
}

export function TemplateRow({
  template,
  row,
  error,
  onChange,
}: {
  template: LeavePolicyTemplate;
  row: DraftRow;
  error: Partial<Record<keyof DraftRow, string>>;
  onChange: (key: LeavePolicyTemplateKey, patch: Partial<DraftRow>) => void;
}) {
  const nameId = `template-${template.key}-name`;
  const daysId = `template-${template.key}-days`;
  const rateId = `template-${template.key}-rate`;
  const carryId = `template-${template.key}-carry`;

  function handleSelectedChange(checked: boolean | "indeterminate") {
    onChange(template.key, { selected: checked === true });
  }

  function handleNameChange(event: React.ChangeEvent<HTMLInputElement>) {
    onChange(template.key, { leaveTypeName: event.target.value });
  }

  function handleDaysChange(event: React.ChangeEvent<HTMLInputElement>) {
    onChange(template.key, { daysPerYear: event.target.value });
  }

  function handleRateChange(event: React.ChangeEvent<HTMLInputElement>) {
    onChange(template.key, { accrualRate: event.target.value });
  }

  function handleCarryChange(event: React.ChangeEvent<HTMLInputElement>) {
    onChange(template.key, { carryForwardDays: event.target.value });
  }

  return (
    <section className="rounded-xl border border-border bg-card/60 p-3">
      <div className="flex items-start gap-3">
        <Checkbox
          id={`template-${template.key}`}
          checked={row.selected}
          onCheckedChange={handleSelectedChange}
          aria-label={`Import ${template.leaveTypeName}`}
          className="mt-0.5"
        />
        <div className="min-w-0 flex-1">
          <Label htmlFor={`template-${template.key}`} className="text-sm font-semibold">
            {template.leaveTypeName}
          </Label>
          <p className="mt-0.5 text-dense text-muted-foreground">{template.description}</p>
        </div>
      </div>

      <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-4">
        <TemplateField
          id={nameId}
          label="Leave type"
          value={row.leaveTypeName}
          onChange={handleNameChange}
          disabled={!row.selected}
          error={error.leaveTypeName}
          className="sm:col-span-2"
        />
        <TemplateField
          id={daysId}
          label="Days per year"
          value={row.daysPerYear}
          onChange={handleDaysChange}
          disabled={!row.selected}
          error={error.daysPerYear}
          inputMode="numeric"
        />
        <TemplateField
          id={rateId}
          label={template.accrualType === "MONTHLY" ? "Accrues per month" : "Accrues per year"}
          value={row.accrualRate}
          onChange={handleRateChange}
          disabled={!row.selected}
          error={error.accrualRate}
          inputMode="decimal"
        />
        <TemplateField
          id={carryId}
          label="Carry forward"
          value={row.carryForwardDays}
          onChange={handleCarryChange}
          disabled={!row.selected}
          error={error.carryForwardDays}
          inputMode="decimal"
        />
      </div>
    </section>
  );
}

function TemplateField({
  id,
  label,
  value,
  onChange,
  disabled,
  error,
  inputMode,
  className,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (event: React.ChangeEvent<HTMLInputElement>) => void;
  disabled: boolean;
  error?: string;
  inputMode?: "numeric" | "decimal";
  className?: string;
}) {
  return (
    <div className={className}>
      <Label htmlFor={id} className="text-dense text-muted-foreground">
        {label}
      </Label>
      <Input
        id={id}
        value={value}
        onChange={onChange}
        disabled={disabled}
        inputMode={inputMode}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? `${id}-error` : undefined}
        className="mt-1"
      />
      {error ? (
        <p id={`${id}-error`} className="mt-1 text-dense text-destructive">
          {error}
        </p>
      ) : null}
    </div>
  );
}
