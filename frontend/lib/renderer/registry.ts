import type { PermissionKey } from "@/lib/rbac/permissions";
import type { RecordLayout } from "./layout";
import { PARTY_LAYOUT } from "./party-layout";
import { ACTIVITY_LAYOUT } from "./crm/activity-layout";
import { CALL_LOG_LAYOUT } from "./crm/call-log-layout";
import { CAMPAIGN_LAYOUT } from "./crm/campaign-layout";
import { CLIENT_LAYOUT } from "./crm/client-layout";
import { CLIENT_OPPORTUNITY_LAYOUT } from "./crm/client-opportunity-layout";
import { COMPANY_LAYOUT } from "./crm/company-layout";
import { CONTACT_LAYOUT } from "./crm/contact-layout";
import { CONTACT_ROLE_LAYOUT } from "./crm/contact-role-layout";
import { DEAL_LAYOUT } from "./crm/deal-layout";
import { DEAL_AGING_LAYOUT } from "./crm/deal-aging-layout";
import { DEAL_APPROVAL_LAYOUT } from "./crm/deal-approval-layout";
import { LEAD_LAYOUT } from "./crm/lead-layout";
import { LEAD_ACTIVITY_LAYOUT } from "./crm/lead-activity-layout";
import { QUOTE_LAYOUT } from "./crm/quote-layout";
import { QUOTE_LINE_ITEM_LAYOUT } from "./crm/quote-line-item-layout";
import { TASK_LAYOUT } from "./crm/task-layout";
import { REP_PERFORMANCE_LAYOUT } from "./crm/reports/rep-performance-layout";
import { SOURCE_ATTRIBUTION_LAYOUT } from "./crm/reports/source-attribution-layout";
import { TEAM_LEADERBOARD_LAYOUT } from "./crm/reports/team-leaderboard-layout";
import { AUDIT_ENTRY_LAYOUT } from "./crm/settings/audit-entry-layout";
import { PRICEBOOK_ENTRY_LAYOUT, PRICEBOOK_LAYOUT } from "./crm/settings/pricebook-layout";
import { PRODUCT_LAYOUT } from "./crm/settings/product-layout";
import {
  SEQUENCE_ENROLLMENT_LAYOUT,
  SEQUENCE_LAYOUT,
  SEQUENCE_STEP_LAYOUT,
} from "./crm/settings/sequence-layout";
import { SLA_BREACH_LAYOUT, SLA_POLICY_LAYOUT } from "./crm/settings/sla-policy-layout";
import { TERRITORY_LAYOUT } from "./crm/settings/territory-layout";
import { VALIDATION_RULE_LAYOUT } from "./crm/settings/validation-rule-layout";

/**
 * Every record type the product describes rather than draws.
 *
 * The registry exists because ticket 20 needed a list of record types to offer
 * an administrator, and nothing in the product had one — each surface imported
 * its own description and no code could enumerate them. That absence is also why
 * "the layout is data" had not yet bought a tenant anything: data nobody can
 * find is data nobody can edit.
 *
 * Deliberately not a place descriptions live. A layout is declared next to the
 * domain it belongs to; this file only collects them, so a new record type is
 * one description plus one line here rather than a directory of components.
 *
 * It has a second job, and `registry.test.ts` is the reason: every entry is held
 * to the engine's rules — valid as declared, still valid after a tenant hides
 * everything they may, still valid after a proposed rearrangement. That test is
 * what stands in for testing generated screens, which is the whole bargain of
 * having one engine.
 */

export interface RegisteredLayout {
  readonly layout: RecordLayout;
  /** Groups the picker, so thirty record types are not one flat list. */
  readonly section: string;
  /**
   * The permission that governs reading these records at all.
   *
   * Arranging a record type you cannot read is not something anybody needs to
   * do, and offering it would put the field names of a module a tenant has not
   * bought in front of them. Hiding a field never relaxes a permission, and
   * neither does this: it is the same read gate the surface itself uses.
   */
  readonly viewPermission: PermissionKey;
  /**
   * True where the record type is a report projection rather than something a
   * person creates.
   *
   * An aging row, a leaderboard row and an attribution row are all real record
   * shapes — they have fields, kinds and alignment, and they render through the
   * same engine — but nobody fills one in. They are worth arranging (a tenant
   * who never reads one column should not scroll past it) and worth validating,
   * and they are not worth offering under the same heading as a lead.
   */
  readonly derived?: boolean;
}

export const LAYOUT_REGISTRY: readonly RegisteredLayout[] = [
  { layout: PARTY_LAYOUT, section: "Parties", viewPermission: "party:parties:view" },

  { layout: LEAD_LAYOUT, section: "CRM", viewPermission: "crm:leads:view" },
  { layout: DEAL_LAYOUT, section: "CRM", viewPermission: "crm:deals:read" },
  { layout: QUOTE_LAYOUT, section: "CRM", viewPermission: "crm:quotes:read" },
  { layout: CONTACT_LAYOUT, section: "CRM", viewPermission: "crm:contacts:view" },
  { layout: COMPANY_LAYOUT, section: "CRM", viewPermission: "crm:organizations:view" },
  { layout: CLIENT_LAYOUT, section: "CRM", viewPermission: "crm:clients:read" },
  { layout: CAMPAIGN_LAYOUT, section: "CRM", viewPermission: "crm:campaigns:view" },
  { layout: TASK_LAYOUT, section: "CRM", viewPermission: "crm:tasks:view" },
  { layout: ACTIVITY_LAYOUT, section: "CRM", viewPermission: "crm:activities:view" },

  /*
    Records that only ever appear inside another record's page. Registered
    anyway: a panel is where a tenant most feels four columns too many, and a
    description that renders is a description worth validating.
  */
  { layout: QUOTE_LINE_ITEM_LAYOUT, section: "CRM", viewPermission: "crm:quotes:read" },
  { layout: CONTACT_ROLE_LAYOUT, section: "CRM", viewPermission: "crm:contacts:view" },
  { layout: CLIENT_OPPORTUNITY_LAYOUT, section: "CRM", viewPermission: "crm:clients:read" },
  { layout: LEAD_ACTIVITY_LAYOUT, section: "CRM", viewPermission: "crm:leads:view" },
  { layout: CALL_LOG_LAYOUT, section: "CRM", viewPermission: "crm:activities:view" },

  {
    layout: DEAL_AGING_LAYOUT,
    section: "Reports",
    viewPermission: "crm:deals:read",
    derived: true,
  },
  {
    layout: DEAL_APPROVAL_LAYOUT,
    section: "Reports",
    viewPermission: "crm:deals:approve",
    derived: true,
  },
  {
    layout: REP_PERFORMANCE_LAYOUT,
    section: "Reports",
    viewPermission: "crm:reports:view",
    derived: true,
  },
  {
    layout: SOURCE_ATTRIBUTION_LAYOUT,
    section: "Reports",
    viewPermission: "crm:reports:view",
    derived: true,
  },
  {
    layout: TEAM_LEADERBOARD_LAYOUT,
    section: "Reports",
    viewPermission: "crm:reports:view",
    derived: true,
  },
  {
    layout: SLA_BREACH_LAYOUT,
    section: "Reports",
    viewPermission: "crm:sla:manage",
    derived: true,
  },
  {
    layout: AUDIT_ENTRY_LAYOUT,
    section: "Reports",
    viewPermission: "crm:settings:view",
    derived: true,
  },

  { layout: PRODUCT_LAYOUT, section: "CRM settings", viewPermission: "crm:products:manage" },
  { layout: PRICEBOOK_LAYOUT, section: "CRM settings", viewPermission: "crm:pricebooks:manage" },
  {
    layout: PRICEBOOK_ENTRY_LAYOUT,
    section: "CRM settings",
    viewPermission: "crm:pricebooks:manage",
  },
  { layout: TERRITORY_LAYOUT, section: "CRM settings", viewPermission: "crm:territories:manage" },
  { layout: SLA_POLICY_LAYOUT, section: "CRM settings", viewPermission: "crm:sla:manage" },
  { layout: SEQUENCE_LAYOUT, section: "CRM settings", viewPermission: "crm:sequences:manage" },
  { layout: SEQUENCE_STEP_LAYOUT, section: "CRM settings", viewPermission: "crm:sequences:manage" },
  {
    layout: SEQUENCE_ENROLLMENT_LAYOUT,
    section: "CRM settings",
    viewPermission: "crm:sequences:manage",
  },
  {
    layout: VALIDATION_RULE_LAYOUT,
    section: "CRM settings",
    viewPermission: "crm:settings:manage",
  },
];

/**
 * Just the descriptions.
 *
 * Derived rather than declared beside the registry, so the two cannot fall out
 * of step.
 */
export const RECORD_LAYOUTS: readonly RecordLayout[] = LAYOUT_REGISTRY.map(
  (entry) => entry.layout,
);

export function registryEntry(key: string): RegisteredLayout | undefined {
  return LAYOUT_REGISTRY.find((entry) => entry.layout.key === key);
}

export function layoutByKey(key: string): RecordLayout | undefined {
  return registryEntry(key)?.layout;
}
