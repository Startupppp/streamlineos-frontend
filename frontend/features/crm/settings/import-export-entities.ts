import { Users, Handshake, Contact2, Building2 } from "lucide-react";
import type { ImportEntity } from "@/features/shared/import-export/entity-card";

/**
 * Settings-page export cards. CSV *imports* for leads/contacts/deals use the
 * dedicated wizards on each list page (JSON bulk-import APIs), not this grid's
 * FormData uploader — which cannot satisfy those contracts.
 */
export const CRM_IMPORT_EXPORT_ENTITIES: ImportEntity[] = [
  {
    id: "leads",
    label: "Leads",
    icon: Contact2,
    description:
      "Export leads with stage, source, and assignment. Import via Leads → CSV Import.",
    exportEndpoint: "/leads/export",
    accent: "text-blue-600 bg-blue-500/10",
    supported: { import: false, export: true },
  },
  {
    id: "contacts",
    label: "Contacts",
    icon: Users,
    description:
      "Export contacts with phone, email, and company. Import via Contacts → CSV Import.",
    exportEndpoint: "/contacts/export",
    accent: "text-emerald-600 bg-emerald-500/10",
    supported: { import: false, export: true },
  },
  {
    id: "deals",
    label: "Deals",
    icon: Handshake,
    description:
      "Export deal pipeline with stage, value, probability, close dates. Import via Deals → CSV Import.",
    exportEndpoint: "/deals/export",
    accent: "text-amber-600 bg-amber-500/10",
    supported: { import: false, export: true },
  },
  {
    id: "clients",
    label: "Clients",
    icon: Building2,
    description:
      "Export client accounts with health score and status.",
    exportEndpoint: "/clients/export",
    accent: "text-rose-600 bg-rose-500/10",
    supported: { import: false, export: true },
  },
];
