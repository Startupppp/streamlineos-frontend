"use client";

import { Badge } from "@/components/ui/badge";
import { AvatarWithPresence } from "@/components/shared/presence-dot";
import { TruncatedText } from "@/components/ui/truncated-text";
import { formatRoleLabel } from "@/lib/constants/user-invite-roles";
import { getUserDisplayName, getUserInitials } from "@/lib/person-display";
import { resolveImageUrl } from "@/lib/utils";
import type { User } from "@/hooks/api/users";
import type { PresenceStatus } from "@/lib/presence";
import { UserStatusBadge } from "./user-status-badge";

/**
 * The member row below `sm`. The seven-column table needs ~900px, so on a 390px
 * screen the e-mail and every trailing column sat behind a horizontal scroll the
 * reader had no way to know was there (SETTINGS-009) — the card carries the same
 * four facts in the width that exists.
 */
export function UserMobileCard({
  user,
  presence,
}: {
  user: User;
  presence: PresenceStatus | undefined;
}) {
  return (
    <div className="flex items-start gap-2.5">
      <AvatarWithPresence
        src={resolveImageUrl(user.image)}
        fallback={getUserInitials(user)}
        status={presence}
        avatarClassName="h-8 w-8"
        alt={getUserDisplayName(user)}
      />
      <div className="min-w-0 flex-1 space-y-1">
        <TruncatedText
          text={getUserDisplayName(user)}
          className="text-sm font-medium leading-tight"
        />
        <TruncatedText
          text={user.email}
          className="text-dense text-muted-foreground"
        />
        <div className="flex flex-wrap items-center gap-1.5">
          <Badge variant="secondary" className="h-4 px-1.5 text-micro font-normal">
            {formatRoleLabel(user.role)}
          </Badge>
          <UserStatusBadge
            isActive={user.userStatus ? user.userStatus === "active" : user.isActive}
            isDeleted={user.userStatus === "archived"}
          />
        </div>
      </div>
    </div>
  );
}
