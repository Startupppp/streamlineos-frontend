"use client";

import { useCallback } from "react";
import { useSearchParams } from "next/navigation";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useCanManageOrganizationMembership } from "@/hooks/api/access";

type PeopleView = "members" | "invitations";

/** Older links and the QA runbook used `?tab=invites` / `?tab=invitations`. */
const LEGACY_INVITATION_TABS = new Set(["invites", "invitations"]);

/**
 * The one reader of which People view the URL asks for. `view=invitations` is
 * canonical; the legacy `tab=` spellings are aliases, so an old link no longer
 * shows a skeleton and then quietly lands on Members.
 */
export function resolvePeopleView(params: Pick<URLSearchParams, "get">): PeopleView {
  if (params.get("view") === "invitations") return "invitations";
  return LEGACY_INVITATION_TABS.has(params.get("tab") ?? "")
    ? "invitations"
    : "members";
}

function peopleViewHref(view: PeopleView): string {
  return view === "invitations"
    ? "/settings/users?view=invitations"
    : "/settings/users";
}

/**
 * Switches view with a native history push, which Next syncs into
 * `useSearchParams` without a server round trip. `router.push` re-ran the
 * route's server prefetch of the members list first, so a slow members read
 * left the tab unselected with Members still showing.
 */
export function useSwitchPeopleView(): (view: PeopleView) => void {
  return useCallback((view: PeopleView) => {
    window.history.pushState(null, "", peopleViewHref(view));
  }, []);
}

export function PeopleSectionTabs() {
  const searchParams = useSearchParams();
  const canManageInvitations = useCanManageOrganizationMembership();
  const switchView = useSwitchPeopleView();
  const active = resolvePeopleView(searchParams);

  const handleValueChange = useCallback(
    (value: string) =>
      switchView(value === "invitations" ? "invitations" : "members"),
    [switchView],
  );

  return (
    <Tabs value={active} onValueChange={handleValueChange}>
      <TabsList>
        <TabsTrigger value="members">
          Members
        </TabsTrigger>
        {canManageInvitations ? (
          <TabsTrigger value="invitations">
            Invitations
          </TabsTrigger>
        ) : null}
      </TabsList>
    </Tabs>
  );
}
