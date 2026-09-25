"use client";

import { useCallback, useMemo, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { LoadingButton } from "@/components/ui/loading-button";
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { getErrorMessage } from "@/lib/get-error-message";
import { useCan } from "@/hooks/api/access";
import {
  useDismissLeavePolicyTemplates,
  useImportLeavePolicyTemplates,
  useLeavePolicyTemplateOffer,
  type LeavePolicyTemplateImportItem,
} from "@/hooks/api/hr/leave-policy-templates";
import type {
  LeavePolicyTemplate,
  LeavePolicyTemplateKey,
} from "@/hooks/api/hr/leave-policy-templates-schema";

interface DraftRow {
  selected: boolean;
  leaveTypeName: string;
  daysPerYear: string;
  accrualRate: string;
  carryForwardDays: string;
}

function draftOf(template: LeavePolicyTemplate): DraftRow {
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

function rowErrors(row: DraftRow): Partial<Record<keyof DraftRow, string>> {
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

/**
 * Ticket 08. The first thing an administrator of a new organisation sees on
 * Leave Policies, and only then: the server decides whether to offer, from
 * whether any policy exists and whether anyone has already refused.
 *
 * Nothing is written until "Import"; "Not now" records the refusal and the
 * prompt never returns for this organisation.
 */
export function LeavePolicyTemplatesDialog() {
  const canManage = useCan("hr:leaves:manage");
  const { data: offer } = useLeavePolicyTemplateOffer();
  const dismiss = useDismissLeavePolicyTemplates();
  const importTemplates = useImportLeavePolicyTemplates();
  const [drafts, setDrafts] = useState<Record<string, DraftRow> | null>(null);
  const [closedInSession, setClosedInSession] = useState(false);

  const templates = useMemo(
    () =>
      (offer?.templates ?? []).filter(
        (template) => !offer?.alreadyPresent.includes(template.key),
      ),
    [offer],
  );

  const rows = useMemo(() => {
    if (drafts) return drafts;
    return Object.fromEntries(
      templates.map((template) => [template.key, draftOf(template)]),
    );
  }, [drafts, templates]);

  const updateRow = useCallback(
    (key: LeavePolicyTemplateKey, patch: Partial<DraftRow>) => {
      setDrafts((previous) => {
        const base = previous ?? rows;
        const current = base[key];
        if (!current) return base;
        return { ...base, [key]: { ...current, ...patch } };
      });
    },
    [rows],
  );

  const selected = templates.filter((template) => rows[template.key]?.selected);
  const errors = templates.map((template) => rowErrors(rows[template.key] ?? draftOf(template)));
  const hasErrors = errors.some((error) => Object.keys(error).length > 0);

  const handleDismiss = useCallback(() => {
    dismiss.mutate(undefined, {
      onSuccess: () => setClosedInSession(true),
      onError: (error) => toast.error(getErrorMessage(error)),
    });
  }, [dismiss]);

  const handleImport = useCallback(() => {
    const items: LeavePolicyTemplateImportItem[] = selected.map((template) => {
      const row = rows[template.key] ?? draftOf(template);
      return {
        key: template.key,
        leaveTypeName: row.leaveTypeName.trim(),
        policyName: row.leaveTypeName.trim(),
        daysPerYear: Number(row.daysPerYear),
        carryForward: Number(row.carryForwardDays) > 0,
        accrualType: template.accrualType,
        accrualRate: row.accrualRate.trim(),
        maxBalance: template.maxBalance ?? undefined,
        carryForwardDays: row.carryForwardDays.trim(),
        encashable: template.encashable,
        probationRestricted: template.probationRestricted,
        effectiveFrom: new Date().toISOString().slice(0, 10),
      };
    });

    importTemplates.mutate(items, {
      onSuccess: (result) => {
        setClosedInSession(true);
        toast.success(
          result.created === 1
            ? "Created 1 leave policy."
            : `Created ${result.created} leave policies.`,
        );
        if (result.skipped.length > 0) {
          toast.info(
            `${result.skipped.length} already had a policy and were left alone.`,
          );
        }
      },
      // The draft stays on screen and keeps every edit, so a failure is a retry
      // rather than a re-type.
      onError: (error) => toast.error(getErrorMessage(error)),
    });
  }, [importTemplates, rows, selected]);

  const open =
    canManage &&
    !closedInSession &&
    Boolean(offer?.shouldOffer) &&
    templates.length > 0;

  const handleOpenChange = useCallback(
    (next: boolean) => {
      // Escape and the overlay mean "not now" in this session only; the refusal
      // that lasts is the explicit one, so the prompt returns on the next visit
      // until somebody answers it.
      if (!next) setClosedInSession(true);
    },
    [],
  );

  if (!open) return null;

  return (
    <Dialog open onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Start with three common leave policies?</DialogTitle>
          <DialogDescription>
            A starting point for a new organisation. Edit anything before
            importing — nothing is created until you choose Import.
          </DialogDescription>
        </DialogHeader>

        <DialogBody className="space-y-4">
          {templates.map((template, index) => {
            const row = rows[template.key] ?? draftOf(template);
            const error = errors[index] ?? {};
            return (
              <TemplateRow
                key={template.key}
                template={template}
                row={row}
                error={error}
                onChange={updateRow}
              />
            );
          })}
        </DialogBody>

        <DialogFooter>
          <Button
            type="button"
            variant="ghost"
            onClick={handleDismiss}
            disabled={dismiss.isPending || importTemplates.isPending}
          >
            Not now
          </Button>
          <LoadingButton
            type="button"
            onClick={handleImport}
            isPending={importTemplates.isPending}
            disabled={selected.length === 0 || hasErrors}
          >
            Import {selected.length === 1 ? "1 policy" : `${selected.length} policies`}
          </LoadingButton>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function TemplateRow({
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
