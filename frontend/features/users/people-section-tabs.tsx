"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useCan } from "@/hooks/api/access";

export function PeopleSectionTabs() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const canManageInvitations = useCan("settings:organization:manage");
  const active =
    canManageInvitations && searchParams.get("view") === "invitations"
      ? "invitations"
      : "members";

  function handleValueChange(value: string) {
    router.push(value === "invitations" ? "/users?view=invitations" : "/users");
  }

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
