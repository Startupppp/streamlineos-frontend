"use client";

import { useCan } from "@/hooks/api/access";
import { BULK_ENTITIES, type BulkEntityId } from "./bulk-import-entities";

export interface ImportAccess {
  /** Export is gated on reading the data, not on importing it. */
  canExport: boolean;
  canImportParties: boolean;
  canImportBulk: Record<BulkEntityId, boolean>;
  /** Whether this page has anything at all to offer. */
  hasAny: boolean;
}

/**
 * Who may do what on the import page.
 *
 * One place, because the route and the page both need the answer and they must
 * not disagree: a route gated only on party access would turn away somebody who
 * may import deals, and a page that assumed the route's gate would show them an
 * export they cannot run.
 *
 * Each entity carries its own key because each endpoint does. They are not
 * interchangeable — `crm:imports:manage` authorises the party importer and
 * nothing else, so a sales manager holding `crm:deals:create` reaches the deals
 * tab and no other.
 */
export function useImportAccess(): ImportAccess {
  const canExport = useCan("party:parties:view");
  const canImportParties = useCan("crm:imports:manage");
  // Read individually rather than in a loop: hooks cannot be called from one.
  const canImportLeads = useCan("crm:leads:create");
  const canImportContacts = useCan("crm:contacts:manage");
  const canImportDeals = useCan("crm:deals:create");

  const canImportBulk: Record<BulkEntityId, boolean> = {
    leads: canImportLeads,
    contacts: canImportContacts,
    deals: canImportDeals,
  };

  return {
    canExport,
    canImportParties,
    canImportBulk,
    hasAny:
      canExport ||
      canImportParties ||
      BULK_ENTITIES.some((entity) => canImportBulk[entity.id]),
  };
}
