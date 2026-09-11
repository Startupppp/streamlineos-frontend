"use client";

import { useCallback, useState } from "react";
import { RecordForm, type RecordFormValues } from "@/components/renderer";
import { dealRecordFields } from "@/lib/renderer/crm/deal-layout";
import type { CreateDealInput, Deal, UpdateDealInput } from "@/types/crm";
import { DealLinkFields, type DealLinks } from "./deal-link-fields";
import { useDealLayout } from "./use-deal-layout";

/**
 * Create and edit a deal, rendered from the description.
 *
 * No schema sits beside this file. The controls, their types and their
 * validation come from `DEAL_LAYOUT`, the same description the list and the
 * detail view render, so the three cannot disagree about what a deal is.
 *
 * `actualCloseDate` and `lostReason` appear only when editing, and not because
 * this file omits them on create: the description marks them `editOnly` because
 * `CreateDealInput` has no such keys. A control whose value the API silently
 * drops is a form that appears to work and does not.
 *
 * The owner, party and subject pickers sit outside the generated form because a
 * reference to another record is the one thing `FieldKind` cannot state.
 */

export interface DealSubmission {
  readonly fields: RecordFormValues;
  readonly links: DealLinks;
}

interface DealFormProps {
  mode: "create" | "edit";
  /** The record being edited; absent when creating. */
  deal?: Deal;
  /** Offered as owners. Omitted where the surface has no people list. */
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

/**
 * Cleared means cleared, wherever the API can say so.
 *
 * The four keys the update DTO types as nullable send `null` when emptied;
 * everything else it types as an optional string, where `undefined` means
 * "leave it alone" and there is no way to express a clear. That asymmetry is the
 * API's, and it is written down here rather than rediscovered per screen.
 */
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
