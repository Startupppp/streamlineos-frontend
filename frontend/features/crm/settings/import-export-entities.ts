import { Users, Handshake, Contact2, Building2 } from "lucide-react";
import type { ImportEntity } from "@/features/shared/import-export/entity-card";

/**
 * Settings-page export cards. Importing lives at `/crm/import`, which speaks the
 * JSON bulk-import APIs these entities actually take — this grid's FormData
 * uploader cannot satisfy those contracts, so it never offers import here.
 */
export const CRM_IMPORT_EXPORT_ENTITIES: ImportEntity[] = [
  {
    id: "leads",
    label: "Leads",
    icon: Contact2,
    description:
      "Export leads with stage, source, and assignment. Import them at CRM → Import and export.",
    exportEndpoint: "/leads/export",
    accent: "text-status-info-ink bg-status-info-surface",
    supported: { import: false, export: true },
  },
  {
    id: "contacts",
    label: "Contacts",
    icon: Users,
    description:
      "Export contacts with phone, email, and company. Import them at CRM → Import and export.",
    exportEndpoint: "/contacts/export",
    accent: "text-status-success-ink bg-status-success-surface",
    supported: { import: false, export: true },
  },
  {
    id: "deals",
    label: "Deals",
    icon: Handshake,
    description:
      "Export deal pipeline with stage, value, probability, close dates. Import them at CRM → Import and export.",
    exportEndpoint: "/deals/export",
    accent: "text-status-warning-ink bg-status-warning-surface",
    supported: { import: false, export: true },
  },
  {
    id: "clients",
    label: "Clients",
    icon: Building2,
    description:
      "Export client accounts with health score and status.",
    exportEndpoint: "/clients/export",
    accent: "text-status-danger-ink bg-status-danger-surface",
    supported: { import: false, export: true },
  },
];
