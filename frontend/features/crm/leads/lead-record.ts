import { asRecordValue, asRecordValues, type RecordValue } from "@/features/renderer";
import type { Lead } from "@/types/leads";

/**
 * A lead as the renderer's row shape.
 *
 * The endpoint sends the owner, the campaign and the tags as nested values, and
 * a description names flat fields — so the three are resolved to their display
 * text here, once, rather than in each of the three surfaces that render them.
 * `LEAD_LAYOUT` declares the flattened names read-only, because they are what
 * the reader sees rather than what the API accepts back.
 */
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
