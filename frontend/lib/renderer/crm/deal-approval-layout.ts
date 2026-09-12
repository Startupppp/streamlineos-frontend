import type { RecordLayout } from "../layout";

/**
 * Deal approvals, as data.
 *
 * A request to move a deal past a threshold somebody has to sign off. Its own
 * record rather than a view of the deal: it has a requester, a verdict and a
 * reason, none of which the deal carries.
 *
 * The requested stage is projected onto a field literally named `stage` so
 * `withDealStages` can fill it from the tenant's own pipeline — the same
 * function the deal list and the aging report use. The alternative was a second
 * copy of that function keyed on `requestedStage`, which would be two places
 * deciding what a stage is called. The label still says "Requested stage",
 * because that is what the reader needs to know it is.
 *
 * `dealValue` carries no `sign`. It is the size of the deal, not a verdict on
 * it; the verdict is `status`, which is a badge with a word in it.
 *
 * `rejectionReason` is a column rather than something smuggled into the actions
 * cell. The screen this replaces rendered it inside the row-actions slot,
 * truncated to thirty characters, because there was nowhere else to put it —
 * which meant a rejected row's reason and a pending row's buttons occupied the
 * same space and neither could be read as itself.
 */
export const DEAL_APPROVAL_LAYOUT: RecordLayout = {
  key: "crm:deal-approval",
  singular: "Approval",
  plural: "Approvals",
  titleField: "dealName",
  fields: [
    { name: "dealName", label: "Deal", kind: "text", readOnly: true },
    { name: "dealValue", label: "Value", kind: "money", readOnly: true },
    { name: "requesterName", label: "Requester", kind: "text", readOnly: true },
    {
      name: "stage",
      label: "Requested stage",
      kind: "badge",
      readOnly: true,
      // Filled from the tenant's own pipeline by `withDealStages`.
    },
    {
      name: "status",
      label: "Status",
      kind: "badge",
      // A verdict is recorded by approving or rejecting, never by editing a
      // field, so there is no control for it.
      readOnly: true,
      options: [
        { value: "pending", label: "Pending", tone: "warning" },
        { value: "approved", label: "Approved", tone: "success" },
        { value: "rejected", label: "Rejected", tone: "danger" },
      ],
    },
    { name: "rejectionReason", label: "Reason", kind: "text", readOnly: true },
    { name: "createdAt", label: "Requested", kind: "date", readOnly: true },
    { name: "resolvedAt", label: "Resolved", kind: "date", readOnly: true },
  ],
  list: {
    searchPlaceholder: "Search approvals…",
    columns: [
      { field: "dealName", primary: true },
      { field: "dealValue", width: "w-32 shrink-0" },
      { field: "requesterName", width: "min-w-[140px]" },
      { field: "stage", width: "w-32 shrink-0" },
      { field: "status", width: "w-24 shrink-0" },
      { field: "rejectionReason", width: "min-w-[160px]" },
      { field: "createdAt", width: "w-28 shrink-0" },
    ],
  },
  detail: {
    sections: [
      { title: "Request", fields: ["dealName", "dealValue", "requesterName", "stage"] },
      { title: "Verdict", fields: ["status", "rejectionReason", "createdAt", "resolvedAt"] },
    ],
  },
  /*
    An approval is resolved, not edited — the reason is captured by the reject
    confirmation, which is the only thing that also records who decided. An
    empty form section list says so; a form would offer a second, unaudited way.
  */
  form: { sections: [] },
};

/** The shape the approvals endpoint sends, as much of it as the description names. */
export interface DealApprovalRecord {
  readonly id: number;
  readonly dealId: number;
  readonly dealName: string | null;
  readonly dealValue: string | null;
  readonly requesterName: string | null;
  readonly requestedStage: string;
  readonly status: string;
  readonly rejectionReason: string | null;
  readonly createdAt: string | null;
  readonly resolvedAt: string | null;
}

/** One approval in the shape the description names. */
export function dealApprovalRecordFields(
  approval: DealApprovalRecord,
): Record<string, unknown> {
  return {
    id: approval.id,
    dealId: approval.dealId,
    dealName: approval.dealName ?? `Deal #${approval.dealId}`,
    dealValue: approval.dealValue,
    requesterName: approval.requesterName,
    stage: approval.requestedStage,
    status: approval.status,
    rejectionReason: approval.rejectionReason,
    createdAt: approval.createdAt,
    resolvedAt: approval.resolvedAt,
  };
}
