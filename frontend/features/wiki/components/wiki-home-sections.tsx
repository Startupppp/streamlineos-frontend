"use client";

import { useState } from "react";
import Link from "next/link";
import { useCan } from "@/hooks/api/access";
import { Button } from "@/components/ui/button";
import {
  ResponsivePopover,
  ResponsivePopoverContent,
  ResponsivePopoverTrigger,
} from "@/components/ui/responsive-popover";
import { AskDocumentsCta } from "./ask-documents-cta";
import { KbNewMenu } from "./kb-new-menu";
import {
  KB_ANALYTICS,
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

const MANAGE_ITEM_CLASS =
  "relative flex w-full cursor-default items-center gap-2 rounded-md px-2 py-2.5 text-sm outline-hidden select-none hover:bg-accent hover:text-accent-foreground focus-visible:bg-accent focus-visible:text-accent-foreground focus-visible:outline-none md:py-1.5";

export function WikiHomeHeaderActions({
  canCreate,
  isProjectScoped,
  projectId,
}: WikiHomeHeaderActionsProps) {
  const [manageOpen, setManageOpen] = useState(false);
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

  function closeManage() {
    setManageOpen(false);
  }

  return (
    <div className="flex w-full min-w-0 flex-wrap items-center gap-2 sm:w-auto sm:flex-nowrap sm:justify-end">
      {!isProjectScoped && <AskDocumentsCta />}
      {canCreate && (
        <KbNewMenu
          scope={{ projectId }}
          allowFolder={!isProjectScoped}
          className="w-full min-w-0 flex-1 basis-[calc(50%-0.25rem)] sm:w-auto sm:basis-auto sm:flex-none"
        />
      )}
      {hasManageAccess && (
        <ResponsivePopover open={manageOpen} onOpenChange={setManageOpen}>
          <ResponsivePopoverTrigger asChild>
            <Button variant="outline" size="sm" className="min-w-0 flex-1 basis-[calc(50%-0.25rem)] sm:basis-auto sm:flex-none">
              Manage
            </Button>
          </ResponsivePopoverTrigger>
          <ResponsivePopoverContent
            align="end"
            title="Manage"
            showHeader
            className="w-[min(18rem,calc(100vw-2rem))] p-1 md:min-w-[10rem] md:w-auto"
          >
            <div role="menu" aria-label="Manage" className="flex flex-col gap-0.5">
              {canViewReviews ? (
                <Link href={KB_REVIEWS} role="menuitem" className={MANAGE_ITEM_CLASS} onClick={closeManage}>
                  Reviews
                </Link>
              ) : null}
              {canImportPages ? (
                <Link href={KB_IMPORT} role="menuitem" className={MANAGE_ITEM_CLASS} onClick={closeManage}>
                  Import &amp; Export
                </Link>
              ) : null}
              {canViewAnalytics ? (
                <Link href={KB_ANALYTICS} role="menuitem" className={MANAGE_ITEM_CLASS} onClick={closeManage}>
                  Analytics
                </Link>
              ) : null}
              {canManageContent ? (
                <Link href={KB_MANAGE} role="menuitem" className={MANAGE_ITEM_CLASS} onClick={closeManage}>
                  Content health
                </Link>
              ) : null}
              {canManageSharingSettings ? (
                <Link href={KB_MANAGE_SHARING} role="menuitem" className={MANAGE_ITEM_CLASS} onClick={closeManage}>
                  External sharing
                </Link>
              ) : null}
            </div>
          </ResponsivePopoverContent>
        </ResponsivePopover>
      )}
    </div>
  );
}
