import type { Metadata } from "next";
import { requirePermission } from "@/lib/rbac/require-permission";
import { OrganizationStructurePage } from "@/features/organization/organization-structure-page";

export const metadata: Metadata = {
  title: "Organization Structure | StreamlineOS",
};

export default async function OrganizationStructureRoute() {
  await requirePermission("settings:view");
  return <OrganizationStructurePage />;
}
