import { asRecordValue, asRecordValues, type RecordValue } from "@/components/renderer/format-value";
import type { Lead } from "@/types/leads";

function flatten(lead: Lead) {
  return {
    ...lead,
    assignedToName: lead.assignedTo?.name ?? null,
    campaignName: lead.campaign?.name ?? null,
    tags: lead.tags?.length ? lead.tags.join(", ") : null,
  };
}

export function toLeadRecord(lead: Lead): RecordValue {
  return asRecordValue(flatten(lead));
}

export function toLeadRecords(leads: readonly Lead[]): RecordValue[] {
  return asRecordValues(leads.map(flatten));
}
