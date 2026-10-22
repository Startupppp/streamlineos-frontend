"use client";

import { useCallback, useState } from "react";
import { RecordForm, type RecordFormValues } from "@/components/renderer";
import { dealRecordFields } from "@/lib/renderer/crm/deal-layout";
import type { CreateDealInput, Deal, UpdateDealInput } from "@/types/crm";
import { DealLinkFields, type DealLinks } from "./deal-link-fields";
import { useDealLayout } from "./use-deal-layout";

export interface DealSubmission {
  readonly fields: RecordFormValues;
  readonly links: DealLinks;
}

interface DealFormProps {
  mode: "create" | "edit";
  deal?: Deal;
  employees?: Array<{ id: string; name: string | null }>;
  isSubmitting: boolean;
  submitLabel: string;
  onSubmit: (submission: DealSubmission) => void;
  onCancel: () => void;
}

function text(fields: RecordFormValues, name: string): string | undefined {
  const value = fields[name]?.trim();
  return value ? value : undefined;
}

function count(fields: RecordFormValues, name: string): number | undefined {
  const value = text(fields, name);
  if (value === undefined) return undefined;
  const amount = Number(value);
  return Number.isFinite(amount) ? amount : undefined;
}

export function toCreateInput({ fields, links }: DealSubmission): CreateDealInput {
  return {
    name: fields.name?.trim() ?? "",
    value: text(fields, "value"),
    stage: text(fields, "stage"),
    probability: count(fields, "probability"),
    expectedCloseDate: text(fields, "expectedCloseDate"),
    contactPerson: text(fields, "contactPerson"),
    contactEmail: text(fields, "contactEmail"),
    contactPhone: text(fields, "contactPhone"),
    notes: text(fields, "notes"),
    assignedToId: links.assignedToId || undefined,
    partyId: links.partyId || undefined,
    subjectId: links.subjectId || undefined,
  };
}

export function toUpdateInput({ fields, links }: DealSubmission, id: number): UpdateDealInput {
  return {
    id,
    name: fields.name?.trim() ?? "",
    value: text(fields, "value"),
    stage: text(fields, "stage"),
    probability: count(fields, "probability"),
    contactPerson: text(fields, "contactPerson"),
    contactEmail: text(fields, "contactEmail"),
    contactPhone: text(fields, "contactPhone"),
    lostReason: text(fields, "lostReason"),
    notes: text(fields, "notes"),
    assignedToId: links.assignedToId || undefined,
    expectedCloseDate: text(fields, "expectedCloseDate") ?? null,
    actualCloseDate: text(fields, "actualCloseDate") ?? null,
    partyId: links.partyId || null,
    subjectId: links.subjectId || null,
  };
}

export function DealForm({
  mode,
  deal,
  employees,
  isSubmitting,
  submitLabel,
  onSubmit,
  onCancel,
}: DealFormProps) {
  const layout = useDealLayout();
  const [links, setLinks] = useState<DealLinks>({
    assignedToId: deal?.assignedToId ?? "",
    partyId: deal?.partyId ?? "",
    subjectId: deal?.subjectId ?? "",
  });

  const handleSubmit = useCallback(
    (fields: RecordFormValues) => onSubmit({ fields, links }),
    [onSubmit, links],
  );

  return (
    <div className="flex min-w-0 flex-col gap-gap-section">
      <DealLinkFields value={links} onChange={setLinks} employees={employees} />

      <RecordForm
        layout={layout}
        mode={mode}
        initial={deal ? dealRecordFields(deal) : undefined}
        onSubmit={handleSubmit}
        onCancel={onCancel}
        isSubmitting={isSubmitting}
        submitLabel={submitLabel}
      />
    </div>
  );
}
