import { kbFormatDate } from "@/features/wiki/lib/kb-date-utils";
import type { KbAccessRoute } from "@/hooks/api/kb/page-types";
import type { KbPageDetail } from "@/hooks/api/kb/page-types";

const ACCESS_ROUTE_LABELS: Record<KbAccessRoute, string> = {
  owner: "You own this file",
  admin: "You have access as an org admin",
  creator: "You created this file",
  organization: "All org members can access this file",
  public: "This file is publicly accessible",
  space: "You have access through the team folder",
  project: "You have access through the project",
  grant: "You have direct access",
  team_folder: "You have access through team folder membership",
  team_folder_admin: "You have access as a team folder admin",
  inherited_grant: "You have inherited access from a parent file",
};

export function AccessReasonBanner({ access }: { access: KbPageDetail["access"] }) {
  const label = ACCESS_ROUTE_LABELS[access.via];
  return (
    <p className="text-xs text-muted-foreground">
      {label}
      {access.via === "grant" && access.grantExpiresAt !== null
        ? ` · Expires ${kbFormatDate(access.grantExpiresAt)}`
        : null}
    </p>
  );
}
