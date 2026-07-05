import { Users, Handshake, Contact2, Building2 } from "lucide-react";
import type { ImportEntity } from "@/features/shared/import-export/entity-card";

export const CRM_IMPORT_EXPORT_ENTITIES: ImportEntity[] = [
  {
    id: "leads",
    label: "Leads",
    icon: Contact2,
    description:
      "Import leads from CSV/XLSX. Auto-detect columns, assign to reps.",
    templateUrl: "/templates/leads-template.xlsx",
    importEndpoint: "/leads/import",
    exportEndpoint: "/leads/export",
    accent: "text-blue-600 bg-blue-500/10",
    supported: { import: true, export: true },
  },
  {
    id: "contacts",
    label: "Contacts",
    icon: Users,
    description:
      "Bulk import CRM contacts with phone, email, and organization.",
    importEndpoint: "/contacts/import",
    exportEndpoint: "/contacts/export",
    accent: "text-emerald-600 bg-emerald-500/10",
    supported: { import: false, export: true },
  },
  {
    id: "deals",
    label: "Deals",
    icon: Handshake,
    description:
      "Export deal pipeline with stage, value, probability, close dates.",
    exportEndpoint: "/deals/export",
    accent: "text-amber-600 bg-amber-500/10",
    supported: { import: false, export: true },
  },
  {
    id: "clients",
    label: "Clients",
    icon: Building2,
    description:
      "Export client accounts with health score and activity data.",
    exportEndpoint: "/clients/export",
    accent: "text-rose-600 bg-rose-500/10",
    supported: { import: false, export: true },
  },
];
