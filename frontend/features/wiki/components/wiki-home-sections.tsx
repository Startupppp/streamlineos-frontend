"use client";

import { useMemo } from "react";
import Link from "next/link";
import { useCan } from "@/hooks/api/access";
import { useOrgMembersByIds } from "@/hooks/api/organization";
import { useKbPageCollection } from "@/hooks/api/kb/page-collection";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { WikiPageCard, WIKI_PAGE_CARD_GRID_CLASS } from "./wiki-page-card";
import { KbNewMenu } from "./kb-new-menu";
import { kbTimeAgo } from "@/features/wiki/lib/kb-date-utils";
import {
  KB_ANALYTICS,
  KB_CHAT,
  KB_IMPORT,
  KB_MANAGE,
  KB_MANAGE_SHARING,
  KB_REVIEWS,
  pageHref,
} from "@/lib/knowledge-routes";
import { getUserDisplayName } from "@/lib/person-display";
import {
  KbFileTextIcon,
  KbShare2Icon,
} from "@/features/wiki/lib/kb-icons";

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
    <div className="flex items-center gap-2">
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

function buildMembershipToName(
  members: { membershipId: number; name: string | null; email: string }[],
): Map<number, string> {
  const map = new Map<number, string>();
  for (const m of members) {
    map.set(m.membershipId, getUserDisplayName({ name: m.name, email: m.email }));
  }
  return map;
}

export function WikiHomeActivitySection() {
  const { data } = useKbPageCollection({ sort: "updated_desc", limit: 6 });
  const items = useMemo(() => data?.data ?? [], [data]);

  const editorUserIds = useMemo(
    () =>
      [
        ...new Set(
          items
            .map((i) => i.lastEditedById)
            .filter((id): id is string => id !== null),
        ),
      ],
    [items],
  );
  const { data: membersPage } = useOrgMembersByIds(editorUserIds);
  const membershipToName = useMemo(
    () => buildMembershipToName(membersPage?.data ?? []),
    [membersPage],
  );

  if (items.length === 0) return null;

  return (
    <section>
      <div className="flex items-center gap-2 mb-3">
        <KbFileTextIcon className="h-4 w-4 text-muted-foreground" />
        <h2 className="text-sm font-semibold text-foreground">Activity</h2>
      </div>
      <div className={WIKI_PAGE_CARD_GRID_CLASS}>
        {items.map((item) => {
          const editorName =
            item.lastEditedByMembershipId !== null
              ? membershipToName.get(item.lastEditedByMembershipId)
              : undefined;
          const subtitle = editorName
            ? `Edited ${kbTimeAgo(item.updatedAt)} by ${editorName}`
            : `Edited ${kbTimeAgo(item.updatedAt)}`;
          return (
            <WikiPageCard
              key={item.id}
              icon={item.icon}
              title={item.title}
              subtitle={subtitle}
              href={pageHref(item.id)}
              coverImage={item.coverImage}
            />
          );
        })}
      </div>
    </section>
  );
}

export function WikiHomeSharedUpdatesSection() {
  const { data } = useKbPageCollection({
    sharedWithMe: "1",
    sort: "updated_desc",
    limit: 6,
  });
  const items = useMemo(() => data?.data ?? [], [data]);

  const sharerUserIds = useMemo(
    () =>
      [
        ...new Set(
          items
            .map((i) => i.sharedBy?.userId ?? null)
            .filter((id): id is string => id !== null),
        ),
      ],
    [items],
  );
  const { data: membersPage } = useOrgMembersByIds(sharerUserIds);
  const membershipToName = useMemo(
    () => buildMembershipToName(membersPage?.data ?? []),
    [membersPage],
  );

  if (items.length === 0) return null;

  return (
    <section>
      <div className="flex items-center gap-2 mb-3">
        <KbShare2Icon className="h-4 w-4 text-muted-foreground" />
        <h2 className="text-sm font-semibold text-foreground">Shared updates</h2>
      </div>
      <div className={WIKI_PAGE_CARD_GRID_CLASS}>
        {items.map((item) => {
          const sharedByMid = item.sharedBy?.membershipId ?? null;
          const sharerName =
            sharedByMid !== null ? membershipToName.get(sharedByMid) : undefined;
          const subtitle = sharerName
            ? `Shared by ${sharerName} · updated ${kbTimeAgo(item.updatedAt)}`
            : `Shared with you · updated ${kbTimeAgo(item.updatedAt)}`;
          return (
            <WikiPageCard
              key={item.id}
              icon={item.icon}
              title={item.title}
              subtitle={subtitle}
              href={pageHref(item.id)}
              coverImage={item.coverImage}
            />
          );
        })}
      </div>
    </section>
  );
}
