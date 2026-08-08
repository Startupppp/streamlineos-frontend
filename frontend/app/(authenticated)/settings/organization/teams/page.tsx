import { requirePermission } from "@/lib/rbac/require-permission";
import { OrgTeamsPage } from "@/features/settings/organization/hierarchy/teams-page";

export default async function OrgTeamsRoute() {
  await requirePermission("settings:view");
  return <OrgTeamsPage />;
}
