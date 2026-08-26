import { PARTY_LAYOUT } from "./party-layout";
import { ACTIVITY_LAYOUT } from "./crm/activity-layout";
import { CALL_LOG_LAYOUT } from "./crm/call-log-layout";
import { CAMPAIGN_LAYOUT } from "./crm/campaign-layout";
import { CLIENT_LAYOUT } from "./crm/client-layout";
import { COMPANY_LAYOUT } from "./crm/company-layout";
import { CONTACT_LAYOUT } from "./crm/contact-layout";
import { DEAL_LAYOUT } from "./crm/deal-layout";
import { LEAD_ACTIVITY_LAYOUT } from "./crm/lead-activity-layout";
import { LEAD_LAYOUT } from "./crm/lead-layout";
import { QUOTE_LAYOUT } from "./crm/quote-layout";
import { TASK_LAYOUT } from "./crm/task-layout";
import type { RecordLayout } from "./layout";

/**
 * Every record type an administrator can arrange.
 *
 * Compiled descriptions rather than stored ones, because that is where they live
 * today; a tenant's *arrangement* of one is stored, which is the half that had
 * to become data first. When the descriptions themselves move into the database
 * this becomes the seed list and nothing that reads it changes.
 *
 * Subject types are absent on purpose: a subject's description is produced from
 * a declaration the tenant already wrote, so arranging it here would be a second
 * place to edit one thing.
 */
export const RECORD_LAYOUTS: readonly RecordLayout[] = [
  LEAD_LAYOUT,
  DEAL_LAYOUT,
  CONTACT_LAYOUT,
  COMPANY_LAYOUT,
  CLIENT_LAYOUT,
  QUOTE_LAYOUT,
  CAMPAIGN_LAYOUT,
  TASK_LAYOUT,
  ACTIVITY_LAYOUT,
  LEAD_ACTIVITY_LAYOUT,
  CALL_LOG_LAYOUT,
  PARTY_LAYOUT,
];

export function layoutByKey(key: string): RecordLayout | undefined {
  return RECORD_LAYOUTS.find((layout) => layout.key === key);
}
