import type { Metadata } from "next";
import { OrganizationStructurePage } from "@/features/organization/organization-structure-page";

export const metadata: Metadata = {
  title: "Organization Structure | StreamlineOS",
};

export default function OrganizationStructureRoute() {
  return <OrganizationStructurePage />;
}
