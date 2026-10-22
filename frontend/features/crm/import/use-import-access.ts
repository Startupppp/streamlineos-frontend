"use client";

import { useCan } from "@/hooks/api/access";
import { BULK_ENTITIES, type BulkEntityId } from "./bulk-import-entities";

export interface ImportAccess {
  canExport: boolean;
  canImportParties: boolean;
  canImportBulk: Record<BulkEntityId, boolean>;
  hasAny: boolean;
}

export function useImportAccess(): ImportAccess {
  const canExport = useCan("party:parties:view");
  const canImportParties = useCan("crm:imports:manage");
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
