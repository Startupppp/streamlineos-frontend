import type { RecordLayout } from "../layout";

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
    },
    {
      name: "status",
      label: "Status",
      kind: "badge",
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
  form: { sections: [] },
};

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
