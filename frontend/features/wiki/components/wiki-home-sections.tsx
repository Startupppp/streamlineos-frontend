"use client";

import Link from "next/link";
import { useCan } from "@/hooks/api/access";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { KbNewMenu } from "./kb-new-menu";
import {
  KB_ANALYTICS,
  KB_CHAT,
  KB_IMPORT,
  KB_MANAGE,
  KB_MANAGE_SHARING,
  KB_REVIEWS,
} from "@/lib/knowledge-routes";

interface WikiHomeHeaderActionsProps {
  canCreate: boolean;
  isProjectScoped: boolean;
  projectId: number | undefined;
}

export function WikiHomeHeaderActions({
  canCreate,
  isProjectScoped,
  projectId,
}: WikiHomeHeaderActionsProps) {
  const canViewAnalytics = useCan("kb:analytics:view");
  const canViewReviews = useCan("kb:reviews:view");
  const canManageContent = useCan("kb:pages:manage");
  const canImportPages = useCan("kb:pages:import");
  const canManageSharingSettings = useCan("kb:settings:manage");
  const hasManageAccess =
    canViewAnalytics ||
    canViewReviews ||
    canManageContent ||
    canImportPages ||
    canManageSharingSettings;

  return (
    <div className="flex flex-wrap items-center justify-end gap-2">
      {!isProjectScoped && (
        <Button asChild variant="outline" size="sm">
          <Link href={KB_CHAT}>Ask documents</Link>
        </Button>
      )}
      {canCreate && (
        <KbNewMenu
          scope={{ projectId }}
          allowFolder={!isProjectScoped}
        />
      )}
      {hasManageAccess && (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm">
              Manage
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            {canViewReviews && (
              <DropdownMenuItem asChild>
                <Link href={KB_REVIEWS}>Reviews</Link>
              </DropdownMenuItem>
            )}
            {canImportPages && (
              <DropdownMenuItem asChild>
                <Link href={KB_IMPORT}>Import &amp; Export</Link>
              </DropdownMenuItem>
            )}
            {canViewAnalytics && (
              <DropdownMenuItem asChild>
                <Link href={KB_ANALYTICS}>Analytics</Link>
              </DropdownMenuItem>
            )}
            {canManageContent && (
              <DropdownMenuItem asChild>
                <Link href={KB_MANAGE}>Content health</Link>
              </DropdownMenuItem>
            )}
            {canManageSharingSettings && (
              <DropdownMenuItem asChild>
                <Link href={KB_MANAGE_SHARING}>External sharing</Link>
              </DropdownMenuItem>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      )}
    </div>
  );
}
