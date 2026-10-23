"use client";

import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { kbFormatDate } from "@/features/wiki/lib/kb-date-utils";
import { KbInfoIcon } from "@/features/wiki/lib/kb-icons";
import type { KbAccessRoute, KbPageDetail } from "@/hooks/api/kb/page-types";

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
  const detail =
    access.via === "grant" && access.grantExpiresAt !== null
      ? `${label} · Expires ${kbFormatDate(access.grantExpiresAt)}`
      : label;

  return (
    <TooltipProvider delayDuration={200}>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="size-5 shrink-0 rounded-full border border-status-info-rule bg-status-info-surface text-status-info-ink hover:bg-status-info-surface hover:text-status-info-ink"
            aria-label={detail}
          >
            <KbInfoIcon className="size-3.5" />
          </Button>
        </TooltipTrigger>
        <TooltipContent side="bottom">{detail}</TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
